import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { claudeAgentContext } from "./context.ts";
import type { ClaudeContextSource } from "./context.ts";
import { asCallToolResult, denialCallToolResult, unavailableCallToolResult } from "./denial.ts";
import type { ClaudeCallToolResult } from "./denial.ts";

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
}

function isContextSource(value: unknown): value is ClaudeContextSource {
  return value !== null && typeof value === "object";
}

function resolveSessionId<TInput>(
  policy: GuardToolPolicy<TInput>,
  input: TInput,
): string | undefined {
  if (typeof policy.sessionId === "function") {
    return policy.sessionId(input);
  }
  if (typeof policy.sessionId === "string" && policy.sessionId.length > 0) {
    return policy.sessionId;
  }
  return undefined;
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

  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
  const proto = Object.getPrototypeOf(tool) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(tool),
  ) as TTool;

  wrapped.handler = async (
    input: ClaudeToolInput<TTool>,
    extra: unknown,
  ): Promise<ClaudeCallToolResult> => {
    const source = isContextSource(extra) ? extra : undefined;
    const sessionId = resolveSessionId(policy, input);
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

    const rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;
    const policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata;
    const mergedMetadata = { ...metadata, ...policyMetadata };

    const result = await runGuarded<ClaudeCallToolResult>(client, {
      action: policy.action,
      rules,
      correlationId: agentCtx.correlationId,
      metadata: mergedMetadata,
      onDeny: (decision: DecisionDeny) => {
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
      },
      onUnavailable: () => unavailableCallToolResult(),
      execute: () => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- original handler returns the SDK CallToolResult; ALLOW path is that result
        return Promise.resolve(originalHandler(input, extra)) as Promise<ClaudeCallToolResult>;
      },
      onGuardError: policy.onGuardError ?? "deny",
    });

    return result;
  };

  Object.defineProperty(wrapped, arcjetProtectedTool, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  return wrapped;
}
