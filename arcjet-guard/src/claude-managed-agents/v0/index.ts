/**
 * @packageDocumentation
 *
 * Claude Managed Agents namespace for Arcjet Guards.
 *
 * This is **hosted** Claude Managed Agents (REST+SSE, beta
 * `managed-agents-2026-04-01`). Anthropic runs the tool loop. There is **no
 * PreToolUse**. This is not `@arcjet/guard/claude-agent-sdk/v0` and must not
 * reuse that adapter, its hooks, or `guardTool`.
 *
 * **Requires the optional type-only peer `@anthropic-ai/sdk` (`>=0.86.0 <1`)**,
 * the first release with `client.beta.agents` / `sessions` / `environments`.
 * Nothing in this module imports the SDK at runtime: every Anthropic type
 * arrives through structural types (and `import type` in assignability tests),
 * so installing `@arcjet/guard` never pulls `@anthropic-ai/sdk` in. Node stays
 * Guard's existing floor.
 *
 * **Note:** the version segment is `v0` because Managed Agents is a public
 * beta. There is deliberately no unversioned
 * `@arcjet/guard/claude-managed-agents` alias and no `/v1`.
 *
 * Three surfaces, and the things this namespace does not build:
 *
 * - **Inbound text** (`user.message` / `initial_events`) → `guardEvents()`
 *   **before** `sessions.events.send`. DENY does not send the user turn.
 *   Non-`user.message` events in the same batch (for example a
 *   `user.custom_tool_result`) are still sent so the session does not idle.
 *   There is no `guardInbound`.
 * - **A custom tool you execute** (`agent.custom_tool_use`) →
 *   `guardCustomTool()`. DENY does not run the tool; it sends
 *   `user.custom_tool_result` with `is_error: true` and error text. Self-hosted
 *   `EnvironmentWorker` / `betaTool({ run })` uses the same gate. The CLI
 *   worker cannot register custom tools.
 * - **Correlation** → `claudeManagedAgentsContext()` is caller-owned only.
 *   It never mints. It never treats Anthropic session/event ids as if we
 *   created them. Never `traceId`.
 *
 * ## What cannot be gated
 *
 * Default `permission_policy: always_allow` **cannot** be gated. Anthropic
 * executes bash/read/write in the cloud sandbox before your process sees an
 * event. `web_search` / `web_fetch` always run on Anthropic. MCP: Anthropic
 * is the client; customer-side Guard is on custom tools and MCP servers
 * **you** host. `user.tool_confirmation` is HITL (`always_ask`), not a
 * policy gate — there is no confirmation helper.
 *
 * `protect()` stays fail-open. These helpers are fail-closed.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import {
 *   claudeManagedAgentsContext,
 *   guardCustomTool,
 *   guardEvents,
 * } from "@arcjet/guard/claude-managed-agents/v0";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const ctx = claudeManagedAgentsContext({ correlationId: conversationId });
 *
 * const verdict = await guardEvents(
 *   arcjet,
 *   {
 *     events: [{ type: "user.message", content: [{ type: "text", text: userText }] }],
 *     inbound: {
 *       action: "message.received",
 *       rules: ({ text }) => [detectPromptInjection()(text)],
 *     },
 *     context: ctx,
 *   },
 *   (body) => client.beta.sessions.events.send(session.id, body),
 * );
 *
 * if (event.type === "agent.custom_tool_use") {
 *   const gated = await guardCustomTool(
 *     arcjet,
 *     {
 *       event,
 *       execute: (input) => lookupOrder(input),
 *       send: (result) => client.beta.sessions.events.send(session.id, { events: [result] }),
 *     },
 *     {
 *       action: "order.looked-up",
 *       rules: (input) => [tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 10 })({ key: String(input["orderNumber"]), requested: 1 })],
 *       context: ctx,
 *     },
 *   );
 *   if (gated.allowed) {
 *     await client.beta.sessions.events.send(session.id, {
 *       events: [{
 *         type: "user.custom_tool_result",
 *         custom_tool_use_id: event.id,
 *         content: [{ type: "text", text: JSON.stringify(gated.output) }],
 *       }],
 *     });
 *   }
 * }
 * ```
 */

export { claudeManagedAgentsContext } from "./context.ts";
export type { ClaudeManagedAgentsContext } from "./context.ts";
export { guardCustomTool } from "./guard-custom-tool.ts";
export type {
  GuardCustomToolCall,
  GuardCustomToolPolicy,
  GuardCustomToolResult,
} from "./guard-custom-tool.ts";
export { guardEvents } from "./guard-events.ts";
export type { GuardEventsInbound, GuardEventsPolicy, GuardEventsResult } from "./guard-events.ts";
export type {
  AgentCustomToolUseEvent,
  EventSendBody,
  ManagedAgentsEventParams,
  ManagedAgentsRunnableTool,
  UserCustomToolResultEventParams,
  UserMessageEventParams,
} from "./types.ts";
export * from "../../agents/index.ts";
