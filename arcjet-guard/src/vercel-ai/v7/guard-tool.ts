import type { InferToolInput, InferToolOutput, Tool } from "ai";

import { shouldWarn } from "../../agents/capture.ts";
import { importAi } from "./peers.ts";

const { jsonSchema } = await importAi();
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { ArcjetAgentContext } from "../../agents/context.ts";
import { retryAfterSeconds } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { PolicyInputMap } from "../../policy-input.ts";
import type { DecisionDeny, RuleWithInput, ArcjetMetadata } from "../../types.ts";

/**
 * Structured tool result returned to the model when a call is denied.
 *
 * The model receives this object as the tool's return value (not an error) when
 * a guard check denies the call. The model can inspect `reason`, `message`, and
 * `retryable` to decide whether to retry, explain the denial to the user, or try
 * a different approach.
 */
export interface ArcjetDenialResult {
  arcjetDenied: true;
  /** Denial reason, e.g. `"RATE_LIMIT"` or `"PROMPT_INJECTION"`. */
  reason: string;
  /** Human/model-readable explanation of the denial. */
  message: string;
  /** Whether retrying later can succeed (true for rate limits). */
  retryable: boolean;
  /** Seconds until a rate-limited call may be retried. */
  retryAfterSeconds?: number;
}

/**
 * Policy for `guardTool()` — how to guard a tool's execution.
 *
 * Specifies the guard action name, optional rules to evaluate, metadata
 * context, and optional denial handler. Rules can be static or computed
 * from the tool's input.
 *
 * **Constraints:**
 * - The tool must not declare its own `contextSchema` (that slot carries the `ArcjetAgentContext`).
 * - The `action` is required and is the guard label and capture action.
 * - `rules` may be omitted to submit none. The guard call still happens.
 * - Metadata is merged on top of the context's and can depend on input.
 */
export interface GuardToolPolicy<T extends Tool> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /**
   * Rules to evaluate, static or computed from the tool's input. Omitting
   * this, or returning `[]`, submits no rules — it does not skip the guard
   * call, which still costs a round trip and returns a decision.
   */
  rules?: RuleWithInput[] | ((input: InferToolInput<T>) => RuleWithInput[]);
  /**
   * Trusted actor identity, or a resolver over parsed input and trusted
   * context. Derive it from authenticated server-side context; never trust a
   * model-produced tool input as the actor identity — a policy can be
   * conditioned on the actor, so a model-controlled value could escape scope.
   *
   * @example
   * ```ts
   * // Static, from trusted context set up before the run.
   * actor: trustedClient.id,
   * // Or resolved from the agent context (not the model's tool input).
   * actor: (input, ctx) => ctx?.userId ?? "anonymous",
   * ```
   */
  actor?:
    | string
    | ((
        input: InferToolInput<T>,
        context: ArcjetAgentContext | undefined,
      ) => string | Promise<string>);
  /**
   * Typed remote-policy inputs, or a resolver over the parsed tool input. Build
   * each value with {@link policyInput}.
   *
   * @example
   * ```ts
   * inputs: ({ recipient, body }) => ({
   *   recipient: policyInput.server.string(recipient),
   *   body: policyInput.local.string(body),
   * }),
   * ```
   */
  inputs?:
    | PolicyInputMap
    | ((
        input: InferToolInput<T>,
        context: ArcjetAgentContext | undefined,
      ) => PolicyInputMap | Promise<PolicyInputMap>);
  /** Metadata merged over the context's (object, or per-call function of the tool input). */
  metadata?: ArcjetMetadata | ((input: InferToolInput<T>) => ArcjetMetadata);
  /** Explicit correlation ID; overrides the context's when set. */
  correlationId?: string;
  /**
   * How to respond when guard evaluation is unavailable (the default is
   * `"deny"`). With `"allow"`, the wrapped tool executes on any guard
   * error or failed-open decision, and a warning is emitted. With `"deny"`,
   * the tool does not execute and the model receives an `ArcjetDenialResult`.
   */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload the model sees for a real DENY decision.
   * Unavailable guards take the `onUnavailable` path instead and return the
   * fixed `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }` result;
   * this callback does not fire for outages.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

/**
 * Backoff hint returned to the model when the guard is unavailable.
 *
 * A rate-limit denial derives its hint from the denying rule's
 * `resetAtUnixSeconds`. This path has nothing to derive from: the fail-open
 * decision is synthesized locally with no rate-limit result, and several of the
 * conditions that reach here receive no response at all. Five seconds paces a
 * model's retry loop — long enough that a retry is not effectively immediate,
 * short enough that the agent does not appear hung.
 */
const UNAVAILABLE_RETRY_AFTER_SECONDS = 5;

const contextSchema = jsonSchema<ArcjetAgentContext | undefined>(
  {
    type: "object",
    properties: {
      correlationId: { type: "string" },
      metadata: { type: "object" },
    },
    required: ["correlationId"],
  },
  {
    validate(value) {
      if (value === undefined) {
        return { success: true, value: undefined };
      }
      if (typeof value !== "object" || value === null) {
        return {
          success: false,
          error: new Error("@arcjet/guard: toolsContext entry is not an ArcjetAgentContext"),
        };
      }
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- object guard enables field access
      const correlationId = (value as ArcjetAgentContext).correlationId;
      if (typeof correlationId !== "string") {
        return {
          success: false,
          error: new Error("@arcjet/guard: toolsContext entry is not an ArcjetAgentContext"),
        };
      }
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- object guard enables field access
      const metadata = (value as ArcjetAgentContext).metadata;
      // Accept undefined or any plain object (reject arrays and null)
      if (
        metadata !== undefined &&
        (typeof metadata !== "object" || Array.isArray(metadata) || metadata === null)
      ) {
        return {
          success: false,
          error: new Error("@arcjet/guard: toolsContext entry is not an ArcjetAgentContext"),
        };
      }
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- schema validation narrows object to ArcjetAgentContext
      return { success: true, value: value as ArcjetAgentContext };
    },
  },
);

// Emitted when a protected tool runs without an ArcjetAgentContext. A forgotten
// `toolsContext` silently runs guard checks uncorrelated and the compiler
// cannot catch it (the injected context type is optional), so the first
// occurrence always warns — even with logging off. Later occurrences respect
// `ARCJET_LOG_LEVEL`.
let warnedMissingToolsContext = false;

function warnMissingToolsContext(action: string): void {
  if (warnedMissingToolsContext && !shouldWarn()) {
    return;
  }
  warnedMissingToolsContext = true;
  console.warn(
    `@arcjet/guard: tool call "${action}" has no ArcjetAgentContext; ` +
      "guard checks run uncorrelated. Pass toolsContext: aiToolsContext(ctx, tools).",
  );
}

/**
 * Wraps an AI SDK tool with guard-gated execution and event capture.
 *
 * Always runs `guard()` before the tool, submitting `policy.rules` or none; on
 * DENY the tool never executes and the model receives an `ArcjetDenialResult`
 * (or the result of `policy.onDeny`). On ALLOW — which is what submitting no
 * rules returns — the tool runs and the outcome is captured.
 *
 * Guard API errors behavior depends on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): Tool does not execute; the model receives an `ArcjetDenialResult`
 *   with `reason: "ERROR"`, `retryable: true`, and a fixed `retryAfterSeconds: 5` hint.
 * - `"allow"`: Tool still runs, with a warning gated on `ARCJET_LOG_LEVEL`.
 *
 * The wrapper injects a `contextSchema` of `ArcjetAgentContext | undefined` to
 * carry correlation and metadata, so a tool that declares its own
 * `contextSchema` cannot be wrapped.
 *
 * @param client - Guard client from `launchArcjet()`
 * @param tool - The tool to wrap; must have an `execute` function and no `contextSchema`
 * @param policy - Execution policy: `action` (required), `rules`, `metadata`, `correlationId` override, `onGuardError`, `onDeny` hook
 * @returns A tool with protected `execute`, injected `contextSchema`, and context type `ArcjetAgentContext | undefined`
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { tool, jsonSchema, generateText } from "ai";
 * import { guardTool, createAgentContext, aiToolsContext } from "@arcjet/guard/vercel-ai/v7";
 *
 * const arcjetClient = launchArcjet({ key: process.env.ARCJET_KEY! });
 *
 * const sendEmailTool = tool({
 *   description: "Send an email",
 *   inputSchema: jsonSchema<{ to: string; subject: string }>({
 *     type: "object",
 *     properties: { to: { type: "string" }, subject: { type: "string" } },
 *     required: ["to", "subject"],
 *   }),
 *   execute: async (input) => {
 *     // Real email service call
 *     return { success: true, messageId: "msg-123" };
 *   },
 * });
 *
 * const emailLimit = tokenBucket({
 *   refillRate: 5,
 *   intervalSeconds: 60,
 *   maxTokens: 5,
 * });
 *
 * const protectedEmail = guardTool(arcjetClient, sendEmailTool, {
 *   action: "email.sent",
 *   onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
 *   rules: () => [emailLimit({ key: userId, requested: 1 })],
 * });
 *
 * const ctx = createAgentContext({ correlationId: "req-123" });
 * const protectedTools = { sendEmail: protectedEmail };
 * const result = await generateText({
 *   model: languageModel, // Use a real language model, e.g., from @ai-sdk/openai
 *   tools: protectedTools,
 *   toolsContext: aiToolsContext(ctx, protectedTools),
 *   prompt: "Send a confirmation email",
 * });
 * ```
 */
export function guardTool<T extends Tool>(
  client: ArcjetAgentClient,
  tool: T,
  policy: GuardToolPolicy<T>,
): Tool<InferToolInput<T>, InferToolOutput<T>, ArcjetAgentContext | undefined> {
  if (typeof tool.execute !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility; changing to TypeError is an observable API change
    throw new Error("@arcjet/guard: guardTool() requires a tool with an execute function");
  }
  if (tool.contextSchema !== undefined) {
    throw new Error(
      "@arcjet/guard: guardTool() cannot wrap a tool that declares its own contextSchema",
    );
  }
  const originalExecute = tool.execute.bind(tool);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- schema injection and denial result unification via cast
  return {
    ...tool,
    [arcjetProtectedTool]: true,
    contextSchema,
    // oxlint-disable-next-line eslint/require-await -- declared async to match the tool interface contract, but runGuarded's promise is returned rather than awaited
    async execute(input: InferToolInput<T>, options: never) {
      // `options.context` was validated by contextSchema above.
      const opts = options as {
        context?: ArcjetAgentContext;
        [key: string]: unknown;
      };
      const ctx = opts.context;
      if (ctx === undefined) {
        warnMissingToolsContext(policy.action);
      }
      const correlationId = policy.correlationId ?? ctx?.correlationId;
      const metadata = {
        ...ctx?.metadata,
        ...(typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata),
      };
      const rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;

      const result = runGuarded(client, {
        action: policy.action,
        rules,
        correlationId,
        metadata,
        resolvePolicy: async () => ({
          ...(policy.actor !== undefined && {
            actor:
              typeof policy.actor === "function" ? await policy.actor(input, ctx) : policy.actor,
          }),
          ...(policy.inputs !== undefined && {
            inputs:
              typeof policy.inputs === "function" ? await policy.inputs(input, ctx) : policy.inputs,
          }),
        }),
        ...(policy.onGuardError !== undefined && { onGuardError: policy.onGuardError }),
        onDeny: (decision) =>
          policy.onDeny === undefined ? denialResult(decision) : policy.onDeny(decision),
        onUnavailable: () => ({
          arcjetDenied: true,
          reason: "ERROR",
          message: "Arcjet security check could not be completed; please retry later.",
          retryable: true,
          retryAfterSeconds: UNAVAILABLE_RETRY_AFTER_SECONDS,
        }),
        // oxlint-disable-next-line typescript/no-unsafe-return -- tool output type inferred dynamically
        execute: () => originalExecute(input, options),
      });
      return result as unknown;
    },
  } as unknown as Tool<InferToolInput<T>, InferToolOutput<T>, ArcjetAgentContext | undefined>;
}

function denialResult(decision: DecisionDeny): ArcjetDenialResult {
  const isRateLimit = decision.reason === "RATE_LIMIT";
  let retryAfterSecs: number | undefined;

  // Only rate-limit denials are retryable, so only they carry a retry-after.
  // A co-occurring rule that allowed can still leave a resetAtUnixSeconds in
  // decision.results; ignore it when the denying reason is not a rate limit.
  if (isRateLimit) {
    retryAfterSecs = retryAfterSeconds(decision);
  }

  let message: string;
  if (isRateLimit) {
    message =
      `Arcjet denied this tool call (${decision.reason}). It may be retried` +
      (retryAfterSecs === undefined ? " later." : ` after ${retryAfterSecs} seconds.`);
  } else {
    message = `Arcjet denied this tool call (${decision.reason}). Do not retry; explain the denial to the user or try a different approach.`;
  }

  const result: ArcjetDenialResult = {
    arcjetDenied: true,
    reason: decision.reason,
    message,
    retryable: isRateLimit,
  };

  // For RATE_LIMIT, include the computed retry-after if available.
  if (isRateLimit && retryAfterSecs !== undefined) {
    result.retryAfterSeconds = retryAfterSecs;
  }

  return result;
}
