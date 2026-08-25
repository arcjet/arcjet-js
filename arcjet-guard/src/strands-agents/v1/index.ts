/**
 * @packageDocumentation
 *
 * Strands Agents namespace for Arcjet Guards.
 *
 * This module provides Strands Agents helpers plus the
 * framework-agnostic layer they build on, so a Strands agent needs one
 * import path and no notion of layering.
 *
 * **Requires the optional peer dependency `@strands-agents/sdk`
 * (`>=1.1.0 <2`)**. Nothing in this module imports that package at
 * module load: every Strands type arrives through `import type`, and
 * the Plugin's `initAgent` loads `BeforeToolCallEvent` / `HookOrder`
 * dynamically so installing `@arcjet/guard` never pulls the SDK in.
 * Zod is their peer, not ours. The floor is 1.1.0 because `HookOrder`
 * + `interrupt()` shipped then; `cancel` itself is 1.0.0.
 *
 * **Note:** the version segment is `v1` because it names Strands
 * Agents' major. There is deliberately no unversioned
 * `@arcjet/guard/strands-agents` alias.
 *
 * v1 is JS `@strands-agents/sdk` `Agent` + `tool({ callback })` +
 * Plugin / `addHook`. Not the Python SDK.
 *
 * Three surfaces, and the things this namespace does not build:
 *
 * - **An authored tool** (`tool({ callback })`) → `guardTool()`. After
 *   `tool()` the object is a `FunctionTool` / `ZodTool` whose runner
 *   path is `_callback` (`stream()` / `invoke()`). DENY returns a
 *   plain `ArcjetDenialResult`. It does not throw. It does not
 *   fabricate an SDK message type.
 * - **MCP / unwrapped / vended tools** → `guardHooks()`. A Plugin
 *   whose `initAgent` registers `BeforeToolCallEvent` at
 *   `HookOrder.SDK_FIRST - 1`. On DENY it sets `event.cancel` to
 *   `JSON.stringify(ArcjetDenialResult)`. Already-branded tools are
 *   skipped. Do **not** use `BeforeToolsEvent.cancel` (that skips
 *   per-tool hooks).
 * - **Correlation** → `strandsAgentContext()` reads a field the
 *   integrator put on `invocationState` (`correlationId`, then
 *   `sessionId`, then `requestId`). It never mints a new id. It never
 *   reads `traceId`. It never uses `SessionManager` or `agent.id`.
 *
 * ## Screen inbound before `invoke()` / `stream()` — there is no inbound hook.
 *
 * There is no first-class inbound channel, so there is no `guardInbound`.
 * Put prompt-injection (and other inbound rules) in the application
 * before `agent.invoke()` / `stream()`. Middleware / model hooks are
 * not this policy gate.
 *
 * ## `interrupt()` is not a policy gate.
 *
 * `event.interrupt()` is human-in-the-loop. Same trap as Mastra
 * `requireApproval`, Claude `canUseTool`, LangGraph `interrupt()`,
 * OpenAI Agents `needsApproval`, and LangChain
 * `humanInTheLoopMiddleware`. There is no `guardApproval` /
 * `guardInterrupt`.
 *
 * ## Deny with `BeforeToolCallEvent.cancel` (and `guardTool` on authored callbacks). `BeforeToolsEvent.cancel` skips per-tool hooks — do not use it.
 *
 * The authored `callback` is the deny point for tools you own. MCP,
 * vended tools, and anything not wrapped with `guardTool` skip that
 * callback. `guardHooks` is the invoke-wide gate for those. Official:
 * set `event.cancel` to a string; `tool.stream()` does not run;
 * `AfterToolCallEvent` still fires.
 *
 * Do not also wrap the same tool with `@arcjet/guard/vercel-ai/v7` or
 * `@arcjet/guard/langgraph/v1`.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardTool, guardHooks, strandsAgentContext } from "@arcjet/guard/strands-agents/v1";
 * import { Agent, tool } from "@strands-agents/sdk";
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
 *   tool({
 *     name: "lookup_order",
 *     description: "Look up an order",
 *     inputSchema: z.object({ orderNumber: z.string() }),
 *     callback: async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *   }),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 *
 * const invocationState = { sessionId: conversationId };
 * const inbound = detectPromptInjection();
 * const decision = await client.guard({
 *   label: "message.received",
 *   rules: [inbound(userText)],
 *   ...strandsAgentContext({ invocationState }),
 * });
 * if (decision.conclusion === "DENY") {
 *   throw new Error("message blocked");
 * }
 *
 * const agent = new Agent({
 *   tools: [lookupOrder],
 *   plugins: [guardHooks(client, { sessionId: conversationId })],
 * });
 * await agent.invoke(userText, { invocationState });
 * ```
 */

export { strandsAgentContext } from "./context.ts";
export type { StrandsAgentContext, StrandsContextSource } from "./context.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy, StrandsTool, StrandsToolInput } from "./guard-tool.ts";
export { guardHooks } from "./hooks.ts";
export type {
  GuardHooksCall,
  GuardHooksPolicy,
  StrandsAfterToolCallEvent,
  StrandsBeforeToolCallEvent,
  StrandsGuardPlugin,
} from "./hooks.ts";
export * from "../../agents/index.ts";
