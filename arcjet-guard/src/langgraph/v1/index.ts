/**
 * @packageDocumentation
 *
 * LangGraph namespace for Arcjet Guards.
 *
 * This module provides LangGraph Graph API helpers plus the
 * framework-agnostic layer they build on, so a LangGraph agent needs one
 * import path and no notion of layering.
 *
 * **Requires the optional peer dependencies `@langchain/langgraph` (`>=1 <2`)
 * and `@langchain/core` (`>=1 <2`)**. Nothing in this module imports those
 * packages at runtime: every LangGraph / LangChain type arrives through
 * `import type`, so installing `@arcjet/guard` never pulls them in.
 *
 * **Note:** the version segment is `v1` because it names LangGraph's major.
 * There is deliberately no unversioned `@arcjet/guard/langgraph` alias.
 *
 * This adapter is LangGraph Graph API (`StateGraph` + `ToolNode`), not
 * LangChain `createAgent`. `createReactAgent` is deprecated in LangGraph JS
 * v1 in favor of LangChain `createAgent` / `wrapToolCall` — do not build on
 * it; that is a later adapter.
 *
 * Two surfaces, and three things this namespace does not build:
 *
 * - **An authored tool** (`tool()` / `StructuredTool`) → `guardTool()`.
 *   DENY returns a structured `ArcjetDenialResult`; it does not throw.
 *   `ToolNode` turns that into a real `ToolMessage` the model reads.
 * - **MCP / runtime-discovered / unwrapped tools** → `guardToolNode()`.
 *   Guards the tools a `ToolNode` from `@langchain/langgraph/prebuilt`
 *   executes, in place, so execute still hits Guard. Already-branded tools
 *   are skipped (no double-call).
 * - **Correlation** → `langgraphAgentContext()` reads
 *   `configurable.thread_id`, then the run id, then `checkpoint_ns`. It never
 *   mints a new id.
 *
 * ## Screen inbound before `invoke` (or at the first graph node)
 *
 * There is no first-class LangGraph channel for inbound screening, so there
 * is no `guardInbound`. Put prompt-injection (and other inbound rules) in
 * the application before `graph.invoke`, or in the graph's first node.
 *
 * ## `interrupt()` is not a policy gate
 *
 * `interrupt()` / `interrupt_before=["tools"]` is human-in-the-loop, not
 * policy. Same trap as Mastra `requireApproval` and Claude `canUseTool`.
 * There is no `guardInterrupt` and no `guardApproval`.
 *
 * ## `ToolNode` is the deny point for tools; hooks / HITL cannot enforce
 *
 * Unwrapped and MCP tools run inside `ToolNode`. Graph hooks and HITL
 * pauses cannot stop `tool.invoke`. Use `guardToolNode` (or `guardTool` for
 * authored tools you invoke yourself).
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardTool, guardToolNode, langgraphAgentContext } from "@arcjet/guard/langgraph/v1";
 * import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
 * import { ToolNode } from "@langchain/langgraph/prebuilt";
 * import { tool } from "@langchain/core/tools";
 * import { z } from "zod";
 *
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const lookupLimit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * const lookupOrder = guardTool(
 *   client,
 *   tool(
 *     async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *     {
 *       name: "lookup_order",
 *       description: "Look up an order",
 *       schema: z.object({ orderNumber: z.string() }),
 *     },
 *   ),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 *
 * const tools = guardToolNode(
 *   client,
 *   new ToolNode([lookupOrder, ...mcpTools]),
 *   { action: ({ toolName }) => `${toolName}.invoked` },
 * );
 *
 * // Screen inbound before invoke (or in the first graph node):
 * const inbound = detectPromptInjection();
 * const decision = await client.guard({
 *   label: "message.received",
 *   rules: [inbound(userText)],
 *   ...langgraphAgentContext({ configurable: { thread_id: conversationId } }),
 * });
 * ```
 */

export { langgraphAgentContext } from "./context.ts";
export type { LangGraphAgentContext, LangGraphContextSource } from "./context.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy, LangGraphTool, LangGraphToolInput } from "./guard-tool.ts";
export { guardToolNode } from "./guard-tool-node.ts";
export type {
  GuardToolNodeCall,
  GuardToolNodePolicy,
  LangGraphToolNodeLike,
} from "./guard-tool-node.ts";
export * from "../../agents/index.ts";
