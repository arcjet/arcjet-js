import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { guardTool } from "./guard-tool.ts";
import type { GuardToolPolicy, LangGraphTool } from "./guard-tool.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on
 * `guardToolNode`. `input` is the tool's free-text args, not the opaque
 * `tool_call_id`.
 */
export interface GuardToolNodeCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardToolNode()` — how to guard unwrapped / MCP /
 * runtime-discovered tools that execute through `ToolNode`.
 *
 * `createReactAgent` is deprecated in LangGraph JS v1; this helper wraps
 * `ToolNode` from `@langchain/langgraph/prebuilt`, not that API. LangGraph
 * `interrupt()` / `interrupt_before=["tools"]` is HITL, not a policy gate
 * — there is no `guardInterrupt`.
 */
export interface GuardToolNodePolicy {
  /**
   * Guard label and capture action. Defaults to `"tool.invoked"`. May be a
   * function of the tool name and args.
   */
  action?: string | ((call: GuardToolNodeCall) => string);
  /**
   * Rules to evaluate before an unwrapped tool runs. Omitting this still
   * performs the guard call.
   */
  rules?: RuleWithInput[] | ((call: GuardToolNodeCall) => RuleWithInput[]);
  /** Metadata merged over the derived LangGraph context. */
  metadata?: ArcjetMetadata | ((call: GuardToolNodeCall) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload the model sees for a real DENY decision.
   * Unavailable guards take the `onUnavailable` path instead.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

/**
 * Structural `ToolNode` surface this helper wraps. Matches
 * `@langchain/langgraph/prebuilt` `ToolNode` (`tools` + `invoke`) without
 * constructing one — CI must pass with the peer absent.
 */
export interface LangGraphToolNodeLike {
  tools: LangGraphTool[];
  invoke: (input: unknown, config?: unknown) => unknown;
}

function isToolNodeLike(value: unknown): value is LangGraphToolNodeLike {
  return (
    value !== null &&
    typeof value === "object" &&
    "tools" in value &&
    Array.isArray((value as { tools?: unknown }).tools) &&
    "invoke" in value &&
    typeof (value as { invoke?: unknown }).invoke === "function"
  );
}

function resolveAction(policy: GuardToolNodePolicy, call: GuardToolNodeCall): string {
  if (typeof policy.action === "function") {
    return policy.action(call);
  }
  if (typeof policy.action === "string" && policy.action.length > 0) {
    return policy.action;
  }
  return "tool.invoked";
}

function policyForTool(tool: LangGraphTool, policy: GuardToolNodePolicy): GuardToolPolicy<unknown> {
  return {
    action: (input) => resolveAction(policy, { toolName: tool.name, input }),
    rules: (input) => {
      const call = { toolName: tool.name, input };
      return typeof policy.rules === "function" ? policy.rules(call) : (policy.rules ?? []);
    },
    metadata: (input) => {
      const call = { toolName: tool.name, input };
      return typeof policy.metadata === "function"
        ? policy.metadata(call)
        : (policy.metadata ?? {});
    },
    ...(policy.onGuardError !== undefined && { onGuardError: policy.onGuardError }),
    ...(policy.onDeny !== undefined && { onDeny: policy.onDeny }),
  };
}

function wrapUnbrandedTool(
  client: ArcjetAgentClient,
  tool: LangGraphTool,
  policy: GuardToolNodePolicy,
): LangGraphTool {
  if (arcjetProtectedTool in tool) {
    return tool;
  }
  return guardTool(client, tool, policyForTool(tool, policy));
}

function ensureToolsGuarded(
  client: ArcjetAgentClient,
  tools: LangGraphTool[],
  policy: GuardToolNodePolicy,
): LangGraphTool[] {
  let changed = false;
  const next = tools.map((tool) => {
    if (arcjetProtectedTool in tool) {
      return tool;
    }
    changed = true;
    return wrapUnbrandedTool(client, tool, policy);
  });
  return changed ? next : tools;
}

/**
 * Wraps a LangGraph `ToolNode` (or the tools you will pass to one) so MCP /
 * runtime-discovered / unwrapped tools still hit Guard before execute.
 *
 * Already-branded tools (`guardTool`) are left alone so Guard is not
 * double-called. Wrapping a `ToolNode` that is already branded throws.
 *
 * Prefer this for tools that only run through `ToolNode`. Use `guardTool`
 * for authored tools invoked outside `ToolNode`.
 *
 * `interrupt()` / `interrupt_before=["tools"]` is HITL, not a policy gate.
 * Graph hooks cannot enforce a deny — `ToolNode` (or `guardTool`) is the
 * deny point.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardToolNode } from "@arcjet/guard/langgraph/v1";
 * import { ToolNode } from "@langchain/langgraph/prebuilt";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * const tools = guardToolNode(
 *   arcjet,
 *   new ToolNode(mcpTools),
 *   {
 *     action: ({ toolName }) => `${toolName}.invoked`,
 *     rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *   },
 * );
 * ```
 */
export function guardToolNode<T extends LangGraphToolNodeLike>(
  client: ArcjetAgentClient,
  node: T,
  policy?: GuardToolNodePolicy,
): T;
export function guardToolNode<T extends LangGraphTool>(
  client: ArcjetAgentClient,
  tools: readonly T[],
  policy?: GuardToolNodePolicy,
): T[];
export function guardToolNode(
  client: ArcjetAgentClient,
  toolsOrNode: LangGraphToolNodeLike | readonly LangGraphTool[],
  policy: GuardToolNodePolicy = {},
): LangGraphToolNodeLike | LangGraphTool[] {
  if (Array.isArray(toolsOrNode)) {
    const tools: readonly LangGraphTool[] = toolsOrNode;
    return tools.map((tool) => wrapUnbrandedTool(client, tool, policy));
  }

  if (!isToolNodeLike(toolsOrNode)) {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error("@arcjet/guard: guardToolNode() requires a ToolNode or an array of tools");
  }

  if (arcjetProtectedTool in toolsOrNode) {
    throw new Error(
      "@arcjet/guard: guardToolNode() cannot wrap a ToolNode that is already guarded; do not double-wrap with @arcjet/guard/langgraph/v1",
    );
  }

  const originalInvoke = toolsOrNode.invoke;

  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
  const proto = Object.getPrototypeOf(toolsOrNode) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(toolsOrNode),
  ) as LangGraphToolNodeLike;

  wrapped.tools = ensureToolsGuarded(client, wrapped.tools, policy);

  const newInvoke = (input: unknown, config?: unknown): unknown => {
    wrapped.tools = ensureToolsGuarded(client, wrapped.tools, policy);
    // Real ToolNode.runTool reads `this.tools`. Bind to the wrapped node so
    // MCP tools added after wrap (and the replaced tools array) are the ones
    // that execute.
    return originalInvoke.call(wrapped, input, config);
  };

  Object.defineProperty(wrapped, "invoke", {
    value: newInvoke,
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
