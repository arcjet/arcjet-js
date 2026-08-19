import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { mastraAgentContext } from "./context.ts";
import type { MastraContextSource } from "./context.ts";
import { denialResult, unavailableResult } from "./denial.ts";

/**
 * Structural shape of a Mastra tool.
 *
 * Declared here rather than constraining `guardTool` to Mastra's
 * `ToolAction<any, any>`, because a real `createTool()` result is not
 * assignable to it under `exactOptionalPropertyTypes`: Mastra types `execute`,
 * `requireApproval` and friends as `?: T | undefined`, while `ToolAction`
 * declares them as `?: T`, and an optional property that may be present-and-
 * undefined does not unify with one that may only be absent. Every optional
 * member here spells `| undefined` explicitly, and members `guardTool` does not
 * touch are simply omitted, so a tool from any `@mastra/core` 1.x fits.
 *
 * This mirrors `ClaudeToolDefinition` in the Claude Agent SDK namespace, which
 * exists for the same reason.
 */
export interface MastraToolDefinition<TInput = unknown, TOutput = unknown> {
  /** Tool id, recorded as `mastra.tool` metadata. */
  id?: string | undefined;
  /** The tool body. `guardTool` throws at wrap time when it is missing. */
  execute?: ((input: TInput, context: never) => Promise<TOutput>) | undefined;
}

/**
 * Input type of a Mastra tool, read off its `execute` signature so it resolves
 * for a `createTool()` result and not only for a hand-written `ToolAction`.
 * Used so `guardTool` can keep the concrete tool type while still typing
 * `policy.rules` against the tool input.
 */
export type MastraToolInput<TTool> = TTool extends {
  execute?: ((input: infer TInput, ...rest: never[]) => unknown) | undefined;
}
  ? TInput
  : never;

/**
 * Output type of a Mastra tool, read off its `execute` signature.
 */
export type MastraToolOutput<TTool> = TTool extends {
  execute?: ((...args: never[]) => Promise<infer TOutput>) | undefined;
}
  ? TOutput
  : never;

/**
 * Policy for `guardTool()` — how to guard a Mastra `createTool({ execute })`.
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
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload the model sees for a real DENY decision.
   * Unavailable guards take the `onUnavailable` path instead and return the
   * fixed `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }` result;
   * this callback does not fire for outages.
   *
   * **Warning:** A denial object can traverse the tool loop even when the tool
   * declares an `outputSchema` that would reject it. Prefer omitting
   * `outputSchema` on guarded tools, or verify the schema accepts
   * `ArcjetDenialResult`.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

function isContextSource(value: unknown): value is MastraContextSource {
  return value !== null && typeof value === "object";
}

/**
 * Wraps a Mastra `createTool({ execute })` with guard-gated execution.
 *
 * Always runs `guard()` before the tool, submitting `policy.rules` or none; on
 * DENY the tool never executes and the model receives an `ArcjetDenialResult`
 * (or the result of `policy.onDeny`). This helper does not throw on DENY.
 *
 * Guard API errors depend on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): Tool does not execute; the model receives an
 *   `ArcjetDenialResult` with `reason: "ERROR"`.
 * - `"allow"`: Tool still runs, with a warning gated on `ARCJET_LOG_LEVEL`.
 *
 * Correlation is read from the tool's execution context (`requestContext`,
 * `agent.threadId` / `resourceId`, `workflow.runId`). No id is minted.
 *
 * Do not also wrap the same tool with `@arcjet/guard/vercel-ai/v7`.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/mastra/v1";
 * import { createTool } from "@mastra/core/tools";
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
 *   createTool({
 *     id: "lookup-order",
 *     description: "Look up an order by number",
 *     inputSchema: z.object({ orderNumber: z.string() }),
 *     execute: async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *   }),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 * ```
 */
export function guardTool<TTool extends MastraToolDefinition<any, any>>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardToolPolicy<MastraToolInput<TTool>>,
): TTool {
  if (typeof tool.execute !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error("@arcjet/guard: guardTool() requires a tool with an execute function");
  }
  if (arcjetProtectedTool in tool) {
    throw new Error(
      "@arcjet/guard: guardTool() cannot wrap a tool that is already guarded; do not double-wrap with @arcjet/guard/mastra/v1 or @arcjet/guard/vercel-ai/v7",
    );
  }

  const originalExecute = tool.execute.bind(tool);

  // Preserve class prototype and non-enumerable markers (`MASTRA_TOOL_MARKER`).
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
  const proto = Object.getPrototypeOf(tool) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(tool),
  ) as TTool;

  wrapped.execute = async (
    input: MastraToolInput<TTool>,
    context: unknown,
  ): Promise<MastraToolOutput<TTool>> => {
    const source = isContextSource(context) ? context : undefined;
    const agentCtx = mastraAgentContext(source);

    const metadata: ArcjetMetadata = {
      ...agentCtx.metadata,
      ...(typeof tool.id === "string" &&
        tool.id.length > 0 && {
          "mastra.tool": tool.id,
        }),
    };

    const rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;
    const policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata;
    const mergedMetadata = { ...metadata, ...policyMetadata };

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-return -- denial / unavailable results are structured objects the model reads; the tool's TOutput is the ALLOW path
    const result = await runGuarded<MastraToolOutput<TTool>>(client, {
      action: policy.action,
      rules,
      correlationId: agentCtx.correlationId,
      metadata: mergedMetadata,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- onDeny may return a custom shape; the ALLOW path is TOutput
      onDeny: ((decision: DecisionDeny) => {
        if (policy.onDeny === undefined) {
          return denialResult(decision);
        }
        try {
          return policy.onDeny(decision);
        } catch (error) {
          if (shouldWarn()) {
            console.warn(
              '@arcjet/guard: onDeny for "%s" threw; returning the default denial:',
              policy.action,
              error,
            );
          }
          return denialResult(decision);
        }
      }) as (decision: DecisionDeny) => MastraToolOutput<TTool>,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-return -- unavailable result is a structured denial object, not TOutput
      onUnavailable: () => unavailableResult() as MastraToolOutput<TTool>,
      execute: () => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Mastra's execute context is generic over the tool's suspend/resume schema.
        const executeContext = context as Parameters<typeof originalExecute>[1];
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- originalExecute is generic over Mastra's tool context
        return Promise.resolve(originalExecute(input, executeContext)) as Promise<
          MastraToolOutput<TTool>
        >;
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
