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
 *
 * `invoke` uses method syntax so a real `ToolNode`, whose `invoke` is
 * generic, stays assignable; see the note on {@link LangGraphTool}.
 */
export interface LangGraphToolNodeLike {
  tools: LangGraphTool[];
  invoke?(input: unknown, config?: unknown): unknown;
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

/**
 * Replace every unguarded entry of `tools` with a guarded one, in place.
 *
 * In place is the whole point. `ToolNode`'s constructor registers
 * `func: (input, config) => this.run(input, config)` — an arrow bound to the
 * instance being constructed — and `run` reads `this.tools`. Assigning a new
 * array to a copied node therefore changes nothing the node actually
 * executes: the captured closure keeps reaching the original array. Mutating
 * the array the node already holds is what the running graph observes, and it
 * also means a caller holding the same node (or the same array) cannot
 * bypass Guard through a stale reference.
 */
function guardToolsInPlace(
  client: ArcjetAgentClient,
  tools: LangGraphTool[],
  policy: GuardToolNodePolicy,
): void {
  for (let index = 0; index < tools.length; index += 1) {
    const tool = tools[index];
    if (tool === undefined || arcjetProtectedTool in tool) {
      continue;
    }
    tools[index] = guardTool(client, tool, policyForTool(tool, policy));
  }
}

/**
 * Guards the tools a LangGraph `ToolNode` executes, so MCP /
 * runtime-discovered / unwrapped tools still hit Guard before execute.
 *
 * Given a `ToolNode`, the node's tools are guarded **in place** and the same
 * node is returned: `ToolNode` resolves tools through a closure captured at
 * construction, so a copy with a fresh tools array would leave the original
 * tools running unguarded. Mutating in place also means a caller still
 * holding that node cannot bypass Guard. Given an array of tools, a new
 * array of guarded tools is returned and the input array is left alone.
 *
 * Already-branded tools (`guardTool`) are left as they are, so Guard is not
 * double-called. Wrapping a `ToolNode` that is already guarded throws. Tools
 * appended after wrapping — MCP discovered mid-run — are guarded on the next
 * `invoke`.
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

  const node = toolsOrNode;

  if (arcjetProtectedTool in node) {
    throw new Error(
      "@arcjet/guard: guardToolNode() cannot wrap a ToolNode that is already guarded; do not double-wrap with @arcjet/guard/langgraph/v1",
    );
  }

  // A frozen array cannot be guarded in place, and silently returning the
  // node would leave every tool ungated. Fail at wrap time instead.
  if (Object.isFrozen(node.tools)) {
    throw new Error(
      "@arcjet/guard: guardToolNode() cannot guard a ToolNode with a frozen tools array; pass the tools through guardToolNode() before constructing the ToolNode",
    );
  }

  guardToolsInPlace(client, node.tools, policy);

  // oxlint-disable-next-line typescript/unbound-method -- deliberately unbound: it is re-applied to `node` below so the guarded tools array is the one it reads
  const originalInvoke = node.invoke;
  if (originalInvoke !== undefined) {
    const ownInvoke = Object.getOwnPropertyDescriptor(node, "invoke");
    const newInvoke = (input: unknown, config?: unknown): unknown => {
      // Tools discovered after wrapping (MCP, runtime registration) are
      // guarded here, before the node resolves the call.
      guardToolsInPlace(client, node.tools, policy);
      return originalInvoke.call(node, input, config);
    };
    Object.defineProperty(node, "invoke", {
      value: newInvoke,
      writable: true,
      enumerable: ownInvoke?.enumerable ?? false,
      configurable: true,
    });
  }

  Object.defineProperty(node, arcjetProtectedTool, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  return node;
}
