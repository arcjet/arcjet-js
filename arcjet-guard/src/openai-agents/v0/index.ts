/**
 * @packageDocumentation
 *
 * OpenAI Agents namespace for Arcjet Guards.
 *
 * This module provides OpenAI Agents helpers plus the framework-agnostic
 * layer they build on, so an OpenAI Agents app needs one import path and
 * no notion of layering.
 *
 * **Requires the optional peer dependency `@openai/agents`
 * (`>=0.17.0 <1`)**. Nothing in this module imports that package at
 * runtime: every OpenAI Agents type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls it in. Zod is their peer, not
 * ours.
 *
 * **Note:** the version segment is `v0` because `@openai/agents` is
 * pre-1.0. There is deliberately no unversioned
 * `@arcjet/guard/openai-agents` alias. A `v1` namespace is added when the
 * SDK reaches 1.0; the segment names the SDK's major, not this
 * integration's iteration. 0.x minors can break.
 *
 * v0 is text `Agent` + `run()` / `Runner` + authored `tool()`. Not
 * Realtime, not Sandbox, not hosted tools, not computer / shell /
 * apply_patch, not MCP, not `agent.asTool()`.
 *
 * Two surfaces, and the things this namespace does not build:
 *
 * - **An authored tool** (`tool({ execute })`) → `guardTool()`. After
 *   `tool()` the object is a `FunctionTool` whose runner-facing method is
 *   `invoke`. DENY returns a structured `ArcjetDenialResult`; it does not
 *   throw.
 * - **Correlation** → `openaiAgentsContext()` reads a field the
 *   integrator put on `runContext.context` (and documented copies:
 *   `conversationId`, `groupId`, already-resolved `sessionId`). It never
 *   mints a new id. It never calls `session.getSessionId()` —
 *   `MemorySession` mints a UUID when constructed without `sessionId`.
 *
 * ## Screen inbound before `run()` (SDK `inputGuardrails` are not Arcjet)
 *
 * There is no first-class inbound channel, so there is no `guardInbound`.
 * Put prompt-injection (and other inbound rules) in the application
 * before `run()`. SDK `inputGuardrails` / `outputGuardrails` /
 * `defineToolInputGuardrail` / `defineToolOutputGuardrail` are the SDK's
 * own tripwires, not this policy gate.
 *
 * ## `needsApproval` is not a policy gate
 *
 * `needsApproval` / `requireApproval` / `onApproval` is human-in-the-loop.
 * The run pauses; `result.state.approve` / `reject`. Same trap as Mastra
 * `requireApproval`, Claude `canUseTool`, and LangGraph `interrupt()`.
 * There is no `guardApproval`.
 *
 * ## `tool()` execute is the deny point; hosted, MCP, and handoffs are not
 *
 * The runner executes authored function tools in `toolExecution.ts` via
 * `invoke`. Hosted tools, handoffs, computer / shell / apply_patch, and
 * MCP (`mcpServers` → `mcpToFunctionTool`) skip that authored-`execute`
 * path. `agent_tool_start` / `agent_tool_end` are void observe-only
 * hooks; they are not a deny. There is no `guardHooks` and no
 * `guardToolNode` (there is no ToolNode).
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardTool, openaiAgentsContext } from "@arcjet/guard/openai-agents/v0";
 * import { Agent, run, tool } from "@openai/agents";
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
 *     parameters: z.object({ orderNumber: z.string() }),
 *     execute: async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *   }),
 *   {
 *     action: "order.looked-up",
 *     rules: (input: { orderNumber: string }) => [
 *       lookupLimit({ key: input.orderNumber, requested: 1 }),
 *     ],
 *   },
 * );
 *
 * const agent = new Agent({
 *   name: "support-agent",
 *   instructions: "Help the user.",
 *   tools: [lookupOrder],
 * });
 *
 * const appContext = { sessionId: conversationId };
 * const inbound = detectPromptInjection();
 * const decision = await client.guard({
 *   label: "message.received",
 *   rules: [inbound(userText)],
 *   ...openaiAgentsContext({ context: appContext, conversationId }),
 * });
 * if (decision.conclusion === "DENY") {
 *   throw new Error("message blocked");
 * }
 * await run(agent, userText, { context: appContext });
 * ```
 */

export { openaiAgentsContext } from "./context.ts";
export type { OpenAIAgentsAgentContext, OpenAIAgentsContextSource } from "./context.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy, OpenAIAgentsTool } from "./guard-tool.ts";
export type { ArcjetDenialResult } from "./denial.ts";
export * from "../../agents/index.ts";
