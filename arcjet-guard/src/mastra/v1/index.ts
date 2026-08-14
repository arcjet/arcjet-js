/**
 * @packageDocumentation
 *
 * Mastra namespace for Arcjet Guards.
 *
 * This module provides Mastra-specific guard helpers plus the
 * framework-agnostic layer they build on, so a Mastra agent needs one import
 * path and no notion of layering.
 *
 * **Requires the optional peer dependency `@mastra/core` (`>=1 <2`)**. Nothing in this
 * module imports `@mastra/core` at runtime: every Mastra type arrives through
 * `import type`, so installing `@arcjet/guard` never pulls Mastra in.
 *
 * **Note:** the version segment is `v1` because it names Mastra's major.
 * There is deliberately no unversioned `@arcjet/guard/mastra` alias.
 *
 * Four surfaces, and three things this namespace does not build:
 *
 * - **An authored tool** (`createTool({ execute })`) → `guardTool()`. DENY
 *   returns a structured tool result; it does not throw.
 * - **Inbound / outbound text** → `guardProcessor()` on `inputProcessors` /
 *   `outputProcessors`. `processInput` + `abort()` on DENY raises a tripwire.
 *   `processInputStep` screens later agentic steps so a tool continuation
 *   cannot skip the inbound gate. Channels already hit `processInput`, so
 *   there is no `guardInbound`.
 * - **MCP / workspace / toolsets you did not wrap** → `guardHooks()`.
 *   `beforeToolCall` can return `{ proceed: false, output }`.
 * - **Correlation** → `mastraAgentContext()` reads `MASTRA_THREAD_ID_KEY`,
 *   resource, then run. It never mints a new id.
 *
 * Mastra `requireApproval` is human HITL, not policy — there is no
 * `guardApproval`. Do not also wrap these tools with
 * `@arcjet/guard/vercel-ai/v7`.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardTool, guardProcessor, guardHooks } from "@arcjet/guard/mastra/v1";
 * import { Agent } from "@mastra/core/agent";
 * import { createTool } from "@mastra/core/tools";
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
 *   createTool({
 *     id: "lookup-order",
 *     description: "Look up an order",
 *     inputSchema: z.object({ orderNumber: z.string() }),
 *     execute: async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *   }),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 *
 * export const agent = new Agent({
 *   id: "support-agent",
 *   name: "support-agent",
 *   instructions: "Help the user.",
 *   model: "openai/gpt-4o",
 *   tools: { lookupOrder },
 *   inputProcessors: [
 *     guardProcessor(client, {
 *       action: "message.received",
 *       rules: ({ text }) => [detectPromptInjection()(text)],
 *     }),
 *   ],
 *   hooks: guardHooks(client),
 * });
 * ```
 */

export { mastraAgentContext, MASTRA_THREAD_ID_KEY, MASTRA_RESOURCE_ID_KEY } from "./context.ts";
export type {
  MastraAgentContext,
  MastraContextSource,
  MastraRequestContextLike,
} from "./context.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy, MastraToolInput, MastraToolOutput } from "./guard-tool.ts";
export { guardProcessor } from "./guard-processor.ts";
export type {
  GuardProcessor,
  GuardProcessorPolicy,
  GuardProcessorInput,
} from "./guard-processor.ts";
export { guardHooks } from "./hooks.ts";
export type { GuardHooksPolicy, GuardHooksCall } from "./hooks.ts";
export type { ArcjetDenialResult } from "./denial.ts";
export * from "../../agents/index.ts";
