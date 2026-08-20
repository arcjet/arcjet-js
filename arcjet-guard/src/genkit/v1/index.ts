/**
 * @packageDocumentation
 *
 * Genkit namespace for Arcjet Guards.
 *
 * This module provides Genkit helpers plus the framework-agnostic
 * layer they build on, so a Genkit app needs one import path and
 * no notion of layering.
 *
 * **Requires the optional peer dependency `genkit`
 * (`>=1.0.0 <2`)**. Nothing in this module imports that package at
 * runtime: every Genkit type arrives through `import type` or a
 * structural interface, so installing `@arcjet/guard` never pulls it
 * in. Zod is Genkit's, not ours.
 *
 * **Note:** the version segment is `v1` because it names Genkit's major.
 * There is deliberately no unversioned `@arcjet/guard/genkit` alias.
 *
 * v1 is JS `genkit()` + `ai.defineTool` + `ai.generate`. Not Go / Python
 * Genkit. Do not also wrap the same tool with `@arcjet/guard/vercel-ai/v7`.
 *
 * Three surfaces, and the things this namespace does not build:
 *
 * - **An authored tool** (`ai.defineTool(config, handler)`) → `guardTool()`.
 *   After `defineTool` the object is a `ToolAction`; `generate()` calls it
 *   as a function. DENY returns a structured `ArcjetDenialResult`; it
 *   does not throw, does not call `interrupt()`, and does not throw
 *   `ToolInterruptError`.
 * - **Filesystem / MCP / unwrapped tools** → `guardMiddleware()`. A
 *   `generate({ use })` middleware whose `tool` hook is the
 *   generate()-wide gate. It denies by returning a completed
 *   `ToolResponsePart` without calling `next()` — verified against
 *   Genkit 1.x `resolveToolRequest`. Already-branded tools are skipped
 *   when they can be looked up. `guardMiddleware` requires the
 *   `generateMiddleware` `tool` hook (Genkit >= 1.33).
 * - **Correlation** → `genkitContext()` reads a field the integrator
 *   put on `generate({ context })` / the tool handler's `{ context }`
 *   (`correlationId`, then `sessionId`, then `conversationId`, then a
 *   caller-owned flow / run id). It never mints a new id. It never
 *   reads `traceId`. It never treats `interrupt` / `resumed` as
 *   correlation.
 *
 * ## Screen user text before `generate()` — there is no inbound hook. Middleware `model` is not Guard.
 *
 * There is no first-class inbound channel, so there is no `guardInbound`.
 * Put prompt-injection (and other inbound rules) in the application
 * before `ai.generate()` / `chat.send()`. The middleware `model` hook
 * intercepts the model call, not user text. It is not this policy gate.
 *
 * ## `interrupt()` / `defineInterrupt` / `toolApproval` are HITL, not a policy gate.
 *
 * `interrupt()` / `defineInterrupt` / `@genkit-ai/middleware`
 * `toolApproval` / `restartTool` / `finishReason === "interrupted"` is
 * human-in-the-loop. Same trap as Mastra `requireApproval`, Claude
 * `canUseTool`, LangGraph `interrupt()`, and OpenAI Agents
 * `needsApproval`. There is no `guardApproval`.
 *
 * ## Deny inside `defineTool` (and `guardMiddleware`'s `tool` hook). MCP and filesystem-injected tools skip an unwrapped handler.
 *
 * The authored `defineTool` handler is the deny point for tools you own.
 * Filesystem middleware tools, MCP tools, and anything not wrapped with
 * `guardTool` skip that handler. `guardMiddleware` is the generate()-wide
 * gate for those. `returnToolRequests: true` means the app calls the tool
 * itself — `guardTool` on the defineTool handler still gates that;
 * `guardMiddleware` does not run if they never `generate()` the tool.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardTool, guardMiddleware, genkitContext } from "@arcjet/guard/genkit/v1";
 * import { genkit, z } from "genkit";
 *
 * const ai = genkit({ ... });
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const lookupLimit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * const lookupOrder = guardTool(
 *   client,
 *   ai.defineTool(
 *     {
 *       name: "lookup_order",
 *       description: "Look up an order",
 *       inputSchema: z.object({ orderNumber: z.string() }),
 *     },
 *     async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *   ),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 *
 * const appContext = { sessionId: conversationId };
 * const inbound = detectPromptInjection();
 * const decision = await client.guard({
 *   label: "message.received",
 *   rules: [inbound(userText)],
 *   ...genkitContext({ context: appContext }),
 * });
 * if (decision.conclusion === "DENY") {
 *   throw new Error("message blocked");
 * }
 * await ai.generate({
 *   prompt: userText,
 *   tools: [lookupOrder],
 *   use: [guardMiddleware(client, { sessionId: conversationId })],
 *   context: appContext,
 * });
 * ```
 */

export { genkitContext } from "./context.ts";
export type { GenkitAgentContext, GenkitContextSource } from "./context.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy, GenkitTool, GenkitToolInput } from "./guard-tool.ts";
export { guardMiddleware } from "./guard-middleware.ts";
export type {
  GuardMiddlewareCall,
  GuardMiddlewarePolicy,
  GenkitGuardMiddleware,
} from "./guard-middleware.ts";
export * from "../../agents/index.ts";
