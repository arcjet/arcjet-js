import type { ToolDefinition, ToolContext } from "eve/tools";

import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { ArcjetDeniedError, ArcjetGuardUnavailableError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { eveAgentContext } from "./context.ts";

/**
 * Policy for `guardTool()` — how to guard an authored tool's execution.
 *
 * Specifies the guard action name, optional rules to evaluate, metadata
 * context, and optional denial handler. Rules can be static or computed
 * from the tool's input.
 */
export interface GuardToolPolicy<TInput> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate, static or computed from the tool's input. */
  rules?: RuleWithInput[] | ((input: TInput) => RuleWithInput[]);
  /** Metadata merged over the context's. */
  metadata?: ArcjetMetadata | ((input: TInput) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /** Reshape what a denial does. Defaults to throwing `ArcjetDeniedError`. */
  onDeny?: (decision: DecisionDeny) => unknown;
}

/**
 * Wraps an authored Eve tool with guard-gated execution and event capture.
 *
 * Always runs `guard()` before the tool, submitting `policy.rules` or none; on
 * DENY the tool never executes and the wrapper throws `ArcjetDeniedError`
 * (or returns the result of `policy.onDeny`). On ALLOW — which is what
 * submitting no rules returns — the tool runs and the outcome is captured.
 *
 * The returned definition carries both of Eve's stamped symbols: the enumerable
 * `eve:tool-brand` and the non-enumerable `eve.definition-source-key` that
 * `toolResultFrom` uses to match results to their definition in channel
 * handlers. Both are preserved; a plain object spread would lose the second one.
 *
 * Guard API errors behavior depends on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): Tool does not execute; an `ArcjetGuardUnavailableError` is thrown.
 * - `"allow"`: Tool still runs, with a warning gated on `ARCJET_LOG_LEVEL`.
 *
 * Unlike `guardApproval`, this helper **may** throw: a thrown denial or unavailable
 * error reaches Eve, which projects it as `action.result` with `status: "failed"`
 * and an `ActionResultError`. This is often better than an approval gate when the
 * tool declares an `outputSchema` or comes from a connection, because the approval
 * gate blocks the whole invocation before the tool runs at all.
 *
 * **Limitation:** Static authored tools are supported; dynamically-defined tools
 * (`defineDynamic`) are not, because their `execute` functions are hoisted by
 * a compiler pass that would not see through the wrapper.
 *
 * @param client - Guard client from `launchArcjet()`
 * @param tool - The authored tool to wrap; must have an `execute` function
 * @param policy - Execution policy: `action` (required), `rules`, `metadata`, `onGuardError`, `onDeny`
 * @returns A tool with protected `execute`, preserving both Eve symbols
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/vercel-eve/v0";
 * import { defineTool } from "eve/tools";
 * import type { SessionContext } from "eve/context";
 *
 * const arcjetClient = launchArcjet({ key: process.env.ARCJET_KEY! });
 *
 * const emailLimit = tokenBucket({
 *   refillRate: 5,
 *   intervalSeconds: 60,
 *   maxTokens: 5,
 * });
 *
 * const sendEmail = defineTool({
 *   description: "Send an email",
 *   inputSchema: { type: "object", properties: { to: { type: "string" } } },
 *   execute: async (input) => {
 *     // Real email service call
 *     return { success: true, messageId: "msg-123" };
 *   },
 * });
 *
 * const protectedEmail = guardTool(arcjetClient, sendEmail, {
 *   action: "email.sent",
 *   rules: (input) => [emailLimit({ key: input.to, requested: 1 })],
 * });
 *
 * export default protectedEmail;
 * ```
 */
export function guardTool<TInput, TOutput>(
  client: ArcjetAgentClient,
  tool: ToolDefinition<TInput, TOutput>,
  policy: GuardToolPolicy<TInput>,
): ToolDefinition<TInput, TOutput> {
  if (typeof tool.execute !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility; changing to TypeError is an observable API change
    throw new Error("@arcjet/guard: guardTool() requires a tool with an execute function");
  }

  const originalExecute = tool.execute.bind(tool);

  // Build a copy preserving both Eve symbols (one enumerable, one not)
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties with property descriptors preserves all properties including non-enumerable symbols
  const wrapped = Object.defineProperties(
    {},
    Object.getOwnPropertyDescriptors(tool),
  ) as ToolDefinition<TInput, TOutput>;

  // Override execute with the guarded version
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-return -- ToolDefinition.execute may return AsyncIterable, but wrapping ensures Promise; onDeny may return custom types via policy override
  wrapped.execute = async (input: TInput, ctx: ToolContext): Promise<TOutput> => {
    const agentCtx = eveAgentContext(ctx);

    // Build metadata with eve-specific keys
    const metadata: ArcjetMetadata = {
      ...agentCtx.metadata,
      ...(typeof ctx.toolName === "string" && ctx.toolName.length > 0 && {
        "eve.tool": ctx.toolName,
      }),
      ...(typeof ctx.callId === "string" && ctx.callId.length > 0 && {
        "eve.call": ctx.callId,
      }),
    };

    // Resolve rules and metadata from input if they are functions
    const rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;
    const policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata;
    const mergedMetadata = { ...metadata, ...policyMetadata };

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- onDeny's unknown return is widened by unknown cast; static type analysis requires cast, but runtime never reaches it if throws or if onDeny custom handler is `never` type
    const result = await runGuarded<TOutput>(client, {
      action: policy.action,
      rules,
      correlationId: agentCtx.correlationId,
      metadata: mergedMetadata,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- onDeny may throw or return custom types; both paths are valid (throw never returns, custom type is returned)
      onDeny: ((decision) => {
        if (policy.onDeny === undefined) {
          throw new ArcjetDeniedError(policy.action, decision);
        }
        return policy.onDeny(decision);
      }) as (decision: DecisionDeny) => TOutput,
      onUnavailable: (unavailable) => {
        if (unavailable.kind === "threw") {
          throw new ArcjetGuardUnavailableError(policy.action, {
            cause: unavailable.error,
          });
        }
        throw new ArcjetGuardUnavailableError(policy.action, {
          decision: unavailable.decision,
        });
      },
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ToolDefinition.execute may return AsyncIterable, but cast to Promise
      execute: () => Promise.resolve(originalExecute(input, ctx)) as Promise<TOutput>,
      onGuardError: policy.onGuardError ?? "deny",
    });

    return result;
  };

  return wrapped;
}
