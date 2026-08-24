/**
 * @packageDocumentation
 *
 * LangChain namespace for Arcjet Guards.
 *
 * This module provides LangChain `createAgent` helpers plus the
 * framework-agnostic layer they build on, so a LangChain agent needs
 * one import path and no notion of layering.
 *
 * **Requires the optional peer dependencies `langchain`
 * (`>=1.2.0 <2`) and `@langchain/core` (`>=1.2.0 <2`)**. Nothing in
 * this module imports those packages at runtime except a deny-path
 * dynamic load of `ToolMessage` (wrapToolCall's return is not passed
 * through `baseHandler`; a bare object is the reducer-crash case).
 * Installing `@arcjet/guard` never pulls the peers in.
 *
 * **Note:** the version segment is `v1` because it names LangChain's
 * major. There is deliberately no unversioned `@arcjet/guard/langchain`
 * alias.
 *
 * v1 is `createAgent` + `createMiddleware({ wrapToolCall })`. Not
 * LangGraph Graph API (`StateGraph` + `ToolNode`) — that is
 * `@arcjet/guard/langgraph/v1`. Not `vercel-ai/v7`. Do not also wrap
 * the same tool with `@arcjet/guard/langgraph/v1` or
 * `@arcjet/guard/vercel-ai/v7`.
 *
 * Three surfaces, and the things this namespace does not build:
 *
 * - **An authored tool** (`tool()` / `StructuredTool`) → `guardTool()`.
 *   DENY returns a plain `ArcjetDenialResult`. It does not throw and
 *   does not fabricate a `ToolMessage`. `createAgent`'s `baseHandler`
 *   wraps a non-ToolMessage in a success `ToolMessage`.
 * - **MCP / unwrapped / runtime-discovered tools** →
 *   `guardMiddleware()`. A `createMiddleware` whose `wrapToolCall` is
 *   the invoke()-wide gate. It denies by returning a real
 *   `ToolMessage` (`content` = JSON of the payload) without calling
 *   `handler`. Already-branded tools are skipped when `request.tool`
 *   can be looked up.
 * - **Correlation** → `langchainContext()` reads
 *   `configurable.thread_id` (what wrapToolCall sees on
 *   `runtime.configurable` as of langchain 1.2.34), then caller-owned
 *   `sessionId` / `conversationId`. It never mints a new id. It never
 *   reads `traceId`. It never treats `interrupt` / resume as
 *   correlation.
 *
 * Server-side provider tools and headless `.implement()` tools are
 * out of scope.
 *
 * ## Screen inbound before `agent.invoke` — there is no inbound hook. SDK middleware that is not `wrapToolCall` is not Guard.
 *
 * There is no first-class inbound channel, so there is no
 * `guardInbound`. Put prompt-injection (and other inbound rules) in
 * the application before `agent.invoke`. `wrapModelCall` / `beforeModel`
 * / `afterModel` intercept the model call, not user text. They are not
 * this policy gate.
 *
 * ## `humanInTheLoopMiddleware` / `interrupt` is HITL, not a policy gate.
 *
 * `humanInTheLoopMiddleware` / `interrupt()` / approve-edit-reject-respond
 * is human-in-the-loop. Same trap as Mastra `requireApproval`, Claude
 * `canUseTool`, LangGraph `interrupt()`, Genkit `toolApproval`, and
 * OpenAI Agents `needsApproval`. There is no `guardApproval`. Policy
 * sits on `wrapToolCall` only — do not deny in `afterModel`.
 *
 * ## Deny inside `tool()` (and `guardMiddleware`'s `wrapToolCall`). MCP and unwrapped tools skip an unwrapped handler.
 *
 * The authored `tool()` handler is the deny point for tools you own.
 * MCP tools, runtime-discovered tools, and anything not wrapped with
 * `guardTool` skip that handler. `guardMiddleware` is the invoke()-wide
 * gate for those.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardTool, guardMiddleware, langchainContext } from "@arcjet/guard/langchain/v1";
 * import { createAgent } from "langchain";
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
 * const inbound = detectPromptInjection();
 * const decision = await client.guard({
 *   label: "message.received",
 *   rules: [inbound(userText)],
 *   ...langchainContext({ configurable: { thread_id: conversationId } }),
 * });
 * if (decision.conclusion === "DENY") {
 *   throw new Error("message blocked");
 * }
 * if (decision.hasFailedOpen()) {
 *   throw new Error("inbound screening failed open");
 * }
 *
 * const agent = createAgent({
 *   model,
 *   tools: [lookupOrder],
 *   middleware: [guardMiddleware(client, { sessionId: conversationId })],
 * });
 * await agent.invoke(
 *   { messages: [{ role: "user", content: userText }] },
 *   { configurable: { thread_id: conversationId } },
 * );
 * ```
 */

export { langchainContext } from "./context.ts";
export type { LangChainAgentContext, LangChainContextSource } from "./context.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy, LangChainTool, LangChainToolInput } from "./guard-tool.ts";
export { guardMiddleware } from "./guard-middleware.ts";
export type {
  GuardMiddlewareCall,
  GuardMiddlewarePolicy,
  LangChainGuardMiddleware,
} from "./guard-middleware.ts";
export * from "../../agents/index.ts";
