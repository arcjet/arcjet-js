import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { langgraphAgentContext } from "./context.ts";
import type { LangGraphContextSource } from "./context.ts";
import { denialToolResult, unavailableToolResult } from "./denial.ts";
import type { LangGraphToolResult } from "./denial.ts";

/**
 * Structural LangChain `tool()` / `StructuredTool` / `RunnableToolLike`.
 * Declared here so `guardTool` does not value-import `@langchain/core`.
 *
 * LangGraph Graph API tools are invoked via `invoke` (`ToolNode.runTool`)
 * and authored `tool()` wrappers also expose `func`. There is no `execute`.
 *
 * `createReactAgent` is deprecated in LangGraph JS v1 in favor of LangChain
 * `createAgent`. This helper targets Graph API tools, not that middleware.
 */
export interface LangGraphTool<TInput = unknown> {
  name: string;
  description?: string;
  invoke?: (input: unknown, config?: unknown) => unknown;
  func?: (input: TInput, runtime?: unknown) => unknown;
}

/**
 * Input type of a LangGraph / LangChain structured tool. Used so `guardTool`
 * can keep the concrete tool type while still typing `policy.rules` against
 * the tool args (not opaque call ids).
 */
export type LangGraphToolInput<TTool> = TTool extends {
  func?: (input: infer TInput, runtime?: unknown) => unknown;
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
   * Reshape the denial payload the model sees for a real DENY decision.
   * Return a `ToolMessage`-shaped object (`status: "error"` recommended) or
   * a plain object. Unavailable guards take the `onUnavailable` path
   * instead; this callback does not fire for outages.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

function isContextSource(value: unknown): value is LangGraphContextSource {
  return value !== null && typeof value === "object";
}

function isToolCall(input: unknown): input is {
  args: unknown;
  id?: string;
  name?: string;
  type: "tool_call";
} {
  return (
    input !== null &&
    typeof input === "object" &&
    "type" in input &&
    (input as { type?: unknown }).type === "tool_call" &&
    "args" in input
  );
}

function toolArgs(input: unknown): unknown {
  return isToolCall(input) ? input.args : input;
}

function toolCallId(input: unknown): string | undefined {
  if (isToolCall(input) && typeof input.id === "string" && input.id.length > 0) {
    return input.id;
  }
  return undefined;
}

/**
 * Wraps a LangChain `tool()` / `StructuredTool` so `func` / `invoke` never
 * runs on DENY.
 *
 * Always runs `guard()` before the tool, submitting `policy.rules` or none;
 * on DENY the original function never executes and the model receives a
 * tool result with `status: "error"` (or the result of `policy.onDeny`).
 * This helper does not throw on DENY.
 *
 * Guard API errors depend on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): Tool does not execute; the model receives
 *   `status: "error"` with `reason: "ERROR"`.
 * - `"allow"`: Tool still runs, with a warning gated on `ARCJET_LOG_LEVEL`.
 *
 * Correlation is read from the invoke `config` / `ToolRuntime`
 * (`configurable.thread_id`). No id is minted.
 *
 * Do not also wrap the same tool with `@arcjet/guard/vercel-ai/v7` or pass
 * it through `guardToolNode` after wrapping — the shared
 * `arcjetProtectedTool` brand throws on a second `guardTool` wrap.
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
  const hasFunc = typeof tool.func === "function";
  const hasInvoke = typeof tool.invoke === "function";
  if (!hasFunc && !hasInvoke) {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error("@arcjet/guard: guardTool() requires a tool with a func or invoke function");
  }
  if (arcjetProtectedTool in tool) {
    throw new Error(
      "@arcjet/guard: guardTool() cannot wrap a tool that is already guarded; do not double-wrap with @arcjet/guard/langgraph/v1 or @arcjet/guard/vercel-ai/v7",
    );
  }

  const func = tool.func;
  const invoke = tool.invoke;
  const originalFunc = hasFunc && func !== undefined ? func.bind(tool) : undefined;
  const originalInvoke = hasInvoke && invoke !== undefined ? invoke.bind(tool) : undefined;

  // Preserve class prototype and non-enumerable markers.
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
  const proto = Object.getPrototypeOf(tool) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(tool),
  ) as TTool;

  let inFlight = false;

  const run = async (
    input: unknown,
    config: unknown,
    execute: () => Promise<unknown>,
  ): Promise<unknown> => {
    if (inFlight) {
      return execute();
    }
    inFlight = true;
    try {
      return await runGuardedTool(client, tool, policy, input, config, execute);
    } finally {
      inFlight = false;
    }
  };

  if (originalFunc !== undefined) {
    const newFunc = (input: LangGraphToolInput<TTool>, runtime?: unknown): Promise<unknown> =>
      run(input, runtime, () => Promise.resolve(originalFunc(input, runtime)));
    Object.defineProperty(wrapped, "func", {
      value: newFunc,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  if (originalInvoke !== undefined) {
    const newInvoke = (input: unknown, config?: unknown): Promise<unknown> =>
      run(input, config, () => Promise.resolve(originalInvoke(input, config)));
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
  const extras: { name: string; toolCallId?: string } = {
    name: typeof tool.name === "string" ? tool.name : "",
  };
  const callId = toolCallId(input);
  if (callId !== undefined) {
    extras.toolCallId = callId;
  }

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
    return Promise.resolve(unavailableToolResult(extras));
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
      const fallback = denialToolResult(decision, extras);
      if (policy.onDeny === undefined) {
        return fallback;
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
        return fallback;
      }
    },
    onUnavailable: () => unavailableToolResult(extras),
    execute,
    onGuardError: policy.onGuardError ?? "deny",
  });
}

// oxlint-disable-next-line typescript/no-unused-vars -- keeps the async keyword so callers can await a rejected guard path

export type { LangGraphToolResult };
