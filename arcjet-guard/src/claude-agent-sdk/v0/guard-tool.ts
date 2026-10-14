import { resolveActorInputs, resolveCallPolicy } from "../../agents/actor-inputs.ts";
import type { ActorResolver, InputsResolver } from "../../agents/actor-inputs.ts";
import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import { assertValidAction } from "../../agents/label.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { claudeAgentContext } from "./context.ts";
import type { ClaudeContextSource } from "./context.ts";
import { asCallToolResult, denialCallToolResult, unavailableCallToolResult } from "./denial.ts";
import type { ClaudeCallToolResult } from "./denial.ts";
import { callToolResultText } from "./tool-results.ts";

/**
 * Input passed to `resultRules`: the call's input and what the handler
 * returned.
 */
export interface GuardToolResult<TInput> {
  /** The tool's input, as the handler received it. */
  input: TInput;
  /** The handler's return value, unchanged. */
  result: unknown;
  /** Every text block in `result`, joined in order. Never shortened. */
  text: string;
}

/**
 * Structural `tool()` definition. Declared here so `guardTool` does not
 * depend on the SDK's Zod schema parameter, which is not assignable across
 * `SdkMcpToolDefinition` / `SdkMcpToolDefinition<any>` under
 * `exactOptionalPropertyTypes`.
 */
export interface ClaudeToolDefinition<TInput = unknown> {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (args: TInput, extra: unknown) => Promise<unknown>;
  annotations?: unknown;
  _meta?: Record<string, unknown>;
}

/**
 * Input type of a Claude Agent SDK `tool()` definition. Used so `guardTool`
 * can keep the concrete tool type while still typing `policy.rules` against
 * the handler args.
 */
export type ClaudeToolInput<TTool> = TTool extends {
  handler: (args: infer TInput, extra: unknown) => Promise<unknown>;
}
  ? TInput
  : never;

/**
 * Policy for `guardTool()` — how to guard an authored `tool()` handler.
 *
 * Specifies the guard action name, optional rules to evaluate, metadata
 * context, and optional denial handler. Rules can be static or computed
 * from the tool's input.
 */
export interface GuardToolPolicy<TInput> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /**
   * Rules to evaluate, static or computed from the tool's input. Omitting
   * this, or returning `[]`, submits no rules — it does not skip the guard
   * call, which still costs a round trip and returns a decision.
   */
  rules?: RuleWithInput[] | ((input: TInput) => RuleWithInput[]);
  /**
   * Trusted actor identity, or a resolver `(input, extra) => …` matching the
   * Claude MCP `handler`. Derive it from `extra.session_id` / hook context;
   * never trust a model-produced tool input as the actor identity.
   */
  actor?: ActorResolver<[TInput, unknown?]>;
  /**
   * Typed remote-policy inputs, or a resolver `(input, extra) => …`. Build
   * each value with {@link policyInput}.
   */
  inputs?: InputsResolver<[TInput, unknown?]>;
  /** Metadata merged over the context's (object, or per-call function of the tool input). */
  metadata?: ArcjetMetadata | ((input: TInput) => ArcjetMetadata);
  /**
   * Fallback session id when the handler `extra` does not carry `session_id`.
   * Prefer `query({ options.sessionId })` plus hook input; this is the
   * authored-tool equivalent of that option. Never mint a new id here.
   */
  sessionId?: string | ((input: TInput) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload the model sees for a real DENY decision.
   * Return a `CallToolResult` (`isError: true` recommended) or a plain
   * object, which is placed on `structuredContent`. Unavailable guards take
   * the `onUnavailable` path instead; this callback does not fire for outages.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
  /**
   * Rules for the handler's result. When set, a second guard call screens
   * what the handler returned before the model reads it, and a DENY (or an
   * unevaluated policy under `onGuardError: "deny"`) returns the same denial
   * in place of the result. A function, because a rule has to be bound to
   * text the handler has not returned yet. The call carries the actor and
   * metadata resolved from the input, `claude.phase: "result"`, and no
   * remote-policy inputs.
   */
  resultRules?: (result: GuardToolResult<TInput>) => RuleWithInput[];
  /**
   * Guard label for the result check. Defaults to `action` followed by
   * `.result`, so remote policy and rate limits on `action` see each call
   * once.
   */
  resultAction?: string;
}

function isContextSource(value: unknown): value is ClaudeContextSource {
  return value !== null && typeof value === "object";
}

/**
 * Wraps an authored Claude Agent SDK `tool()` definition with guard-gated
 * execution.
 *
 * Always runs `guard()` before the handler, submitting `policy.rules` or none;
 * on DENY the handler never executes and the model receives a `CallToolResult`
 * with `isError: true` (or the result of `policy.onDeny`). This helper does
 * not throw on DENY.
 *
 * Guard API errors depend on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): Handler does not execute; the model receives
 *   `isError: true` with `reason: "ERROR"`.
 * - `"allow"`: Handler still runs, with a warning gated on `ARCJET_LOG_LEVEL`.
 *
 * Correlation is read from the handler `extra` (`session_id`) or
 * `policy.sessionId`. No id is minted.
 *
 * Do not also wrap the same tool with `@arcjet/guard/vercel-ai/v7` or
 * `@arcjet/guard/agents`. Annotations and sandbox settings are not
 * enforcement — they do not replace this wrapper or `guardHooks`.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/claude-agent-sdk/v0";
 * import { tool } from "@anthropic-ai/claude-agent-sdk";
 * import { z } from "zod";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const lookupLimit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * export const lookupOrder = guardTool(
 *   arcjet,
 *   tool(
 *     "lookup_order",
 *     "Look up an order by number",
 *     { orderNumber: z.string() },
 *     async ({ orderNumber }) => ({
 *       content: [{ type: "text", text: `${orderNumber}: shipped` }],
 *     }),
 *   ),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 * ```
 */
export function guardTool<TTool extends ClaudeToolDefinition<any>>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardToolPolicy<ClaudeToolInput<TTool>>,
): TTool {
  assertValidAction(policy.action, "guardTool");
  if (policy.resultRules !== undefined && typeof policy.resultRules !== "function") {
    throw new TypeError(
      "@arcjet/guard: guardTool() resultRules must be a function of the handler's result, since a rule has to be bound to text the handler has not returned yet",
    );
  }
  if (policy.resultAction !== undefined && policy.resultRules === undefined) {
    throw new Error(
      "@arcjet/guard: guardTool() resultAction labels the result check, which only runs with resultRules; without it the label is never used",
    );
  }
  const resultAction = policy.resultAction ?? `${policy.action}.result`;
  if (policy.resultRules !== undefined) {
    assertValidAction(resultAction, "guardTool");
  }
  if (typeof tool.handler !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error("@arcjet/guard: guardTool() requires a tool with a handler function");
  }
  if (arcjetProtectedTool in tool) {
    throw new Error(
      "@arcjet/guard: guardTool() cannot wrap a tool that is already guarded; do not double-wrap with @arcjet/guard/claude-agent-sdk/v0, @arcjet/guard/vercel-ai/v7, or @arcjet/guard/agents",
    );
  }

  const originalHandler = tool.handler.bind(tool);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
  const proto = Object.getPrototypeOf(tool) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(tool),
  ) as TTool;

  const newHandler = async (
    input: ClaudeToolInput<TTool>,
    extra: unknown,
  ): Promise<ClaudeCallToolResult> => {
    const source = isContextSource(extra) ? extra : undefined;

    const call = resolveCallPolicy(policy, input, policy.action);
    const { sessionId, rules, metadata: policyMetadata } = call;
    const remote = await resolveActorInputs(policy, policy.action, input, extra);

    const agentCtx = claudeAgentContext(
      source,
      sessionId === undefined ? undefined : { sessionId },
    );

    const metadata: ArcjetMetadata = {
      ...agentCtx.metadata,
      ...(typeof tool.name === "string" &&
        tool.name.length > 0 && {
          "claude.tool": tool.name,
        }),
    };

    const mergedMetadata = { ...metadata, ...policyMetadata };

    const onDeny = (decision: DecisionDeny): ClaudeCallToolResult => {
      const fallback = denialCallToolResult(decision);
      if (policy.onDeny === undefined) {
        return fallback;
      }
      try {
        return asCallToolResult(policy.onDeny(decision), fallback);
      } catch (error) {
        if (shouldWarn()) {
          console.warn(
            '@arcjet/guard: onDeny for "%s" threw; returning the default denial:',
            policy.action,
            error,
          );
        }
        return fallback;
      }
    };

    // Set only when the handler ran, so a denied or unavailable call is never
    // screened as if it had returned.
    let handled: { result: ClaudeCallToolResult } | undefined;
    const result = await runGuarded<ClaudeCallToolResult>(client, {
      action: policy.action,
      rules,
      correlationId: agentCtx.correlationId,
      metadata: mergedMetadata,
      degraded: call.degraded ?? remote.degraded,
      ...remote.fields,
      onDeny,
      onUnavailable: () => unavailableCallToolResult(),
      execute: async () => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- original handler returns the SDK CallToolResult; ALLOW path is that result
        const returned = (await originalHandler(input, extra)) as ClaudeCallToolResult;
        handled = { result: returned };
        return returned;
      },
      onGuardError: policy.onGuardError ?? "deny",
    });

    if (handled === undefined || policy.resultRules === undefined) {
      return result;
    }
    const returned = handled.result;
    const screened = resolveCallPolicy(
      { rules: policy.resultRules },
      { input, result: returned, text: callToolResultText(returned) },
      resultAction,
    );
    return await runGuarded<ClaudeCallToolResult>(client, {
      action: resultAction,
      rules: screened.rules,
      correlationId: agentCtx.correlationId,
      metadata: { ...mergedMetadata, "claude.phase": "result" },
      degraded: screened.degraded ?? call.degraded ?? remote.degraded,
      ...(remote.fields.actor !== undefined && { actor: remote.fields.actor }),
      onDeny,
      onUnavailable: () => unavailableCallToolResult(),
      execute: () => Promise.resolve(returned),
      onGuardError: policy.onGuardError ?? "deny",
    });
  };

  Object.defineProperty(wrapped, "handler", {
    value: newHandler,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(wrapped, arcjetProtectedTool, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  return wrapped;
}
