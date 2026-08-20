import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { langgraphAgentContext } from "./context.ts";
import type { LangGraphContextSource } from "./context.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";

/**
 * Structural LangChain `tool()` / `StructuredTool` / `RunnableToolLike`.
 * Declared here so `guardTool` does not value-import `@langchain/core`.
 *
 * LangGraph Graph API tools are invoked through `invoke` (that is what
 * `ToolNode.runTool` calls) and authored `tool()` wrappers also expose `func`.
 * There is no `execute`.
 *
 * `invoke` and `func` are declared with method syntax, not as property types.
 * Method parameters are bivariant, which is what lets a real
 * `DynamicStructuredTool` — whose `invoke` is generic over
 * `StructuredToolCallInput` — satisfy this interface. Written as property
 * types they are contravariant under `strictFunctionTypes`, and every real
 * LangChain tool is rejected at the call site.
 *
 * `createReactAgent` is deprecated in LangGraph JS v1 in favor of LangChain
 * `createAgent`. This helper targets Graph API tools, not that middleware.
 */
export interface LangGraphTool<TInput = unknown> {
  name: string;
  description?: string;
  invoke?(input: unknown, config?: unknown): unknown;
  func?(input: TInput, runtime?: unknown): unknown;
}

/**
 * Input type of a LangGraph / LangChain structured tool. Used so `guardTool`
 * can keep the concrete tool type while still typing `policy.rules` against
 * the tool args (not opaque call ids).
 */
export type LangGraphToolInput<TTool> = TTool extends {
  func?(input: infer TInput, runtime?: unknown): unknown;
}
  ? TInput
  : unknown;

/**
 * Policy for `guardTool()` — how to guard an authored LangChain `tool()` /
 * `StructuredTool`.
 *
 * Specifies the guard action name, optional rules to evaluate, metadata
 * context, and optional denial handler. Rules can be static or computed
 * from the tool's free-text args. Do not scan opaque ids.
 */
export interface GuardToolPolicy<TInput> {
  /**
   * Guard label and capture action: `"resource.verb"`, past tense. A
   * function is resolved per call from the tool args (used by
   * `guardToolNode` so one policy can name many tools).
   */
  action: string | ((input: TInput) => string);
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
   * Reshape the denial payload the model sees for a real DENY decision. The
   * value is returned to the caller as-is, so `ToolNode` treats it exactly
   * as it treats the default denial: a non-message object becomes the
   * content of the `ToolMessage` it builds. Unavailable guards take the
   * `onUnavailable` path instead and return the fixed
   * `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }` result;
   * this callback does not fire for outages.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

function isContextSource(value: unknown): value is LangGraphContextSource {
  return value !== null && typeof value === "object";
}

function isToolCall(input: unknown): input is { args: unknown; type: "tool_call" } {
  return (
    input !== null &&
    typeof input === "object" &&
    "type" in input &&
    (input as { type?: unknown }).type === "tool_call" &&
    "args" in input
  );
}

/**
 * The model-produced arguments. `ToolNode` invokes a tool with the whole
 * `ToolCall`, so rules must see `args` rather than the envelope — scanning
 * the envelope would feed an opaque `tool_call_id` to the detectors.
 */
function toolArgs(input: unknown): unknown {
  return isToolCall(input) ? input.args : input;
}

/**
 * Wraps a LangChain `tool()` / `StructuredTool` so `func` / `invoke` never
 * runs on DENY.
 *
 * Always runs `guard()` before the tool, submitting `policy.rules` or none;
 * on DENY the original function never executes and the model receives an
 * `ArcjetDenialResult` (or the result of `policy.onDeny`). This helper does
 * not throw on DENY. Through `ToolNode` the denial arrives as the content of
 * a real `ToolMessage`; see {@link ArcjetDenialResult} for why the denial is
 * in the payload rather than the message status.
 *
 * Guard API errors depend on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): Tool does not execute; the model receives an
 *   `ArcjetDenialResult` with `reason: "ERROR"`.
 * - `"allow"`: Tool still runs, with a warning gated on `ARCJET_LOG_LEVEL`.
 *
 * Correlation is read from the invoke `config` / `ToolRuntime`
 * (`configurable.thread_id`). No id is minted.
 *
 * Do not also wrap the same tool with `@arcjet/guard/vercel-ai/v7`. The
 * shared `arcjetProtectedTool` brand throws on a second `guardTool` wrap, and
 * `guardToolNode` skips already-branded tools so Guard is not double-called.
 *
 * This is Graph API (`StateGraph` + `ToolNode`). `createReactAgent` is
 * deprecated in LangGraph JS v1; do not build on it. LangChain
 * `createAgent` / `wrapToolCall` is a later adapter.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/langgraph/v1";
 * import { tool } from "@langchain/core/tools";
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
 *     async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *     {
 *       name: "lookup_order",
 *       description: "Look up an order by number",
 *       schema: z.object({ orderNumber: z.string() }),
 *     },
 *   ),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 * ```
 */
export function guardTool<TTool extends LangGraphTool<any>>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardToolPolicy<LangGraphToolInput<TTool>>,
): TTool {
  // oxlint-disable-next-line typescript/unbound-method -- read to be bound to `tool` immediately below, which is the point
  const func = typeof tool.func === "function" ? tool.func : undefined;
  // oxlint-disable-next-line typescript/unbound-method -- read to be bound to `tool` immediately below, which is the point
  const invoke = typeof tool.invoke === "function" ? tool.invoke : undefined;
  if (func === undefined && invoke === undefined) {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error("@arcjet/guard: guardTool() requires a tool with a func or invoke function");
  }
  if (arcjetProtectedTool in tool) {
    throw new Error(
      "@arcjet/guard: guardTool() cannot wrap a tool that is already guarded; do not double-wrap with @arcjet/guard/langgraph/v1 or @arcjet/guard/vercel-ai/v7",
    );
  }

  // Bound to the original tool, so the guarded `invoke` below reaches the
  // original `func` rather than the guarded one. That is what keeps a single
  // call from evaluating the guard twice, without any shared re-entry state:
  // `ToolNode` fans parallel tool calls out through `Promise.all`, and a
  // shared flag would let one of those calls skip the guard entirely.
  const originalFunc = func?.bind(tool);
  const originalInvoke = invoke?.bind(tool);

  // Preserve class prototype and non-enumerable markers.
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
  const proto = Object.getPrototypeOf(tool) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(tool),
  ) as TTool;

  if (originalFunc !== undefined) {
    const newFunc = (input: unknown, runtime?: unknown): Promise<unknown> =>
      runGuardedTool(client, tool, policy, input, runtime, () =>
        Promise.resolve(originalFunc(input, runtime)),
      );
    Object.defineProperty(wrapped, "func", {
      value: newFunc,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  if (originalInvoke !== undefined) {
    const newInvoke = (input: unknown, config?: unknown): Promise<unknown> =>
      runGuardedTool(client, tool, policy, input, config, () =>
        Promise.resolve(originalInvoke(input, config)),
      );
    Object.defineProperty(wrapped, "invoke", {
      value: newInvoke,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  Object.defineProperty(wrapped, arcjetProtectedTool, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  return wrapped;
}

function runGuardedTool<TTool extends LangGraphTool<any>>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardToolPolicy<LangGraphToolInput<TTool>>,
  input: unknown,
  config: unknown,
  execute: () => Promise<unknown>,
): Promise<unknown> {
  const args = toolArgs(input);

  let action: string;
  let rules: RuleWithInput[] | undefined;
  let policyMetadata: ArcjetMetadata | undefined;
  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- args are the tool's structured input; policy factories are typed against it
    const typedArgs = args as LangGraphToolInput<TTool>;
    action = typeof policy.action === "function" ? policy.action(typedArgs) : policy.action;
    rules = typeof policy.rules === "function" ? policy.rules(typedArgs) : policy.rules;
    policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(typedArgs) : policy.metadata;
  } catch (error) {
    const actionLabel = typeof policy.action === "string" ? policy.action : "tool.invoked";
    if (shouldWarn()) {
      console.warn(
        '@arcjet/guard: policy factory for "%s" threw; treating as a guard error:',
        actionLabel,
        error,
      );
    }
    if (policy.onGuardError === "allow") {
      return execute();
    }
    return Promise.resolve(unavailableResult());
  }

  const source = isContextSource(config) ? config : undefined;
  const agentCtx = langgraphAgentContext(source);

  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(typeof tool.name === "string" &&
      tool.name.length > 0 && {
        "langgraph.tool": tool.name,
      }),
  };
  const mergedMetadata = { ...metadata, ...policyMetadata };

  return runGuarded<unknown>(client, {
    action,
    rules,
    correlationId: agentCtx.correlationId,
    metadata: mergedMetadata,
    onDeny: (decision: DecisionDeny) => {
      if (policy.onDeny === undefined) {
        return denialResult(decision);
      }
      try {
        return policy.onDeny(decision);
      } catch (error) {
        if (shouldWarn()) {
          console.warn(
            '@arcjet/guard: onDeny for "%s" threw; returning the default denial:',
            action,
            error,
          );
        }
        return denialResult(decision);
      }
    },
    onUnavailable: () => unavailableResult(),
    execute,
    onGuardError: policy.onGuardError ?? "deny",
  });
}
