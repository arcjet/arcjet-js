import type { DecisionDeny, RuleWithInput } from "@arcjet/guard";
import { jsonSchema } from "ai";
import type { InferToolInput, InferToolOutput, Tool } from "ai";

import { shouldWarn } from "./client.js";
import type { ArcjetAiClient } from "./client.js";
import type { ArcjetAiContext } from "./context.js";
import { runGuarded } from "./guarded.js";
import { arcjetProtectedTool } from "./internal.js";

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
 * Policy for `protectTool()` — how to guard a tool's execution.
 *
 * Specifies the guard action name, optional rules to evaluate, metadata
 * context, and optional denial handler. Rules can be static or computed
 * from the tool's input.
 *
 * **Constraints:**
 * - The tool must not declare its own `contextSchema` (that slot carries the `ArcjetAiContext`).
 * - The `action` is required and is the guard label and capture action.
 * - `rules` may be omitted for capture-only wrapping (no guard, just audit).
 * - Metadata is merged on top of the context's and can depend on input.
 */
export interface ProtectToolPolicy<T extends Tool> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate; omit (or return `[]`) for capture-only wrapping. */
  rules?: RuleWithInput[] | ((input: InferToolInput<T>) => RuleWithInput[]);
  /** Metadata merged over the context's (object, or per-call function of the tool input). */
  metadata?: Record<string, string> | ((input: InferToolInput<T>) => Record<string, string>);
  /** Explicit correlation ID; overrides the context's when set. */
  correlationId?: string;
  /** Reshape the denial payload the model sees. */
  onDeny?: (decision: DecisionDeny) => unknown;
}

const contextSchema = jsonSchema<ArcjetAiContext | undefined>(
  {
    type: "object",
    properties: {
      correlationId: { type: "string" },
      metadata: { type: "object", additionalProperties: { type: "string" } },
    },
    required: ["correlationId"],
  },
  {
    validate(value) {
      if (
        value === undefined ||
        (typeof value === "object" &&
          value !== null &&
          typeof (value as ArcjetAiContext).correlationId === "string")
      ) {
        return { success: true, value: value as ArcjetAiContext | undefined };
      }
      return {
        success: false,
        error: new Error("@arcjet/ai: toolsContext entry is not an ArcjetAiContext"),
      };
    },
  },
);

/**
 * Wraps an AI SDK tool with guard-gated execution and event capture.
 *
 * Runs `guard()` before the tool when `policy.rules` are present; on DENY the
 * tool never executes and the model receives an `ArcjetDenialResult` (or the
 * result of `policy.onDeny`). On ALLOW — or when no rules are given
 * (capture-only) — the tool runs and the outcome is captured. Guard API errors
 * fail open: the tool still runs, with a warning gated on `ARCJET_LOG_LEVEL`.
 *
 * The wrapper injects a `contextSchema` of `ArcjetAiContext | undefined` to
 * carry correlation and metadata, so a tool that declares its own
 * `contextSchema` cannot be wrapped.
 *
 * @param client - Guard client with optional `experimental_capture()` method
 * @param tool - The tool to wrap; must have an `execute` function and no `contextSchema`
 * @param policy - Execution policy: `action` (required), `rules`, `metadata`, `correlationId` override, `onDeny` hook
 * @returns A tool with protected `execute`, injected `contextSchema`, and context type `ArcjetAiContext | undefined`
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { tool, jsonSchema, generateText } from "ai";
 * import { protectTool, createAiContext, aiToolsContext } from "@arcjet/ai";
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
 * const protectedEmail = protectTool(arcjetClient, sendEmailTool, {
 *   action: "email.sent",
 *   rules: () => [emailLimit({ key: userId, requested: 1 })],
 * });
 *
 * const ctx = createAiContext({ correlationId: "req-123" });
 * const tools = { sendEmail: protectedEmail };
 * const result = await generateText({
 *   model: languageModel, // Use a real language model, e.g., from @ai-sdk/openai
 *   tools,
 *   toolsContext: aiToolsContext(ctx, tools),
 *   prompt: "Send a confirmation email",
 * });
 * ```
 */
export function protectTool<T extends Tool>(
  client: ArcjetAiClient,
  tool: T,
  policy: ProtectToolPolicy<T>,
): Tool<InferToolInput<T>, InferToolOutput<T>, ArcjetAiContext | undefined> {
  if (typeof tool.execute !== "function") {
    throw new Error("@arcjet/ai: protectTool() requires a tool with an execute function");
  }
  if (tool.contextSchema !== undefined) {
    throw new Error(
      "@arcjet/ai: protectTool() cannot wrap a tool that declares its own contextSchema",
    );
  }
  const originalExecute = tool.execute.bind(tool);

  return {
    ...tool,
    [arcjetProtectedTool]: true,
    contextSchema,
    async execute(input: InferToolInput<T>, options: never) {
      // `options.context` was validated by contextSchema above.
      const opts = options as {
        context?: ArcjetAiContext;
        [key: string]: unknown;
      };
      const ctx = opts.context;
      if (ctx === undefined && shouldWarn()) {
        console.warn(
          `@arcjet/ai: tool call "${policy.action}" has no ArcjetAiContext; ` +
            "guard checks run uncorrelated. Pass toolsContext: aiToolsContext(ctx, tools).",
        );
      }
      const correlationId = policy.correlationId ?? ctx?.correlationId;
      const metadata = {
        ...ctx?.metadata,
        ...(typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata),
      };
      const rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;

      return runGuarded(client, {
        action: policy.action,
        rules,
        correlationId,
        metadata,
        onDeny: (decision) =>
          policy.onDeny !== undefined ? policy.onDeny(decision) : denialResult(decision),
        execute: () => originalExecute(input, options),
      });
    },
  } as unknown as Tool<InferToolInput<T>, InferToolOutput<T>, ArcjetAiContext | undefined>;
}

function denialResult(decision: DecisionDeny): ArcjetDenialResult {
  const retryable = decision.reason === "RATE_LIMIT";
  let retryAfterSeconds: number | undefined;
  // Only rate-limit denials are retryable, so only they carry a retry-after.
  // A co-occurring rule that allowed can still leave a resetAtUnixSeconds in
  // decision.results; ignore it when the denying reason is not a rate limit.
  if (retryable) {
    for (const result of decision.results) {
      if ("resetAtUnixSeconds" in result && typeof result.resetAtUnixSeconds === "number") {
        retryAfterSeconds = Math.max(0, Math.ceil(result.resetAtUnixSeconds - Date.now() / 1000));
        break;
      }
    }
  }
  return {
    arcjetDenied: true,
    reason: decision.reason,
    message: retryable
      ? `Arcjet denied this tool call (${decision.reason}). It may be retried` +
        (retryAfterSeconds === undefined ? " later." : ` after ${retryAfterSeconds} seconds.`)
      : `Arcjet denied this tool call (${decision.reason}). Do not retry; explain the denial to the user or try a different approach.`,
    retryable,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
}
