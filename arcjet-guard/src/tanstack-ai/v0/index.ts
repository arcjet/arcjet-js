/**
 * @packageDocumentation
 *
 * TanStack AI namespace for Arcjet Guards.
 *
 * This module provides TanStack AI `chat()` helpers plus the
 * framework-agnostic layer they build on, so a TanStack AI app needs
 * one import path and no notion of layering.
 *
 * **Requires the optional peer dependency `@tanstack/ai`
 * (`>=0.8.0 <1`)**. Nothing in this module imports that package at
 * runtime: every TanStack AI type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls it in. Latest supported
 * development pin is 0.52.x. There is no `/v1` until TanStack AI
 * ships 1.x.
 *
 * **Note:** the version segment is `v0` because `@tanstack/ai` is
 * pre-1.0. There is deliberately no unversioned
 * `@arcjet/guard/tanstack-ai` alias. A `v1` namespace is added when
 * the SDK reaches 1.0; the segment names the SDK's major, not this
 * integration's iteration. 0.x minors can break.
 *
 * v0 is `chat({ middleware })` + `ChatMiddleware.onBeforeToolCall`.
 * Not the Vercel AI SDK — do not also wrap with
 * `@arcjet/guard/vercel-ai/v7`.
 *
 * Two surfaces, and the things this namespace does not build:
 *
 * - **Tool calls** → `guardMiddleware()`. A `ChatMiddleware` whose
 *   `onBeforeToolCall` is the `chat()`-wide gate. Default DENY is
 *   `{ type: "skip", result: ArcjetDenialResult }` so the tool never
 *   runs and the model sees the payload. Optional `onDeny: "abort"`
 *   returns `{ type: "abort", reason }` and stops the run — the model
 *   does not get `ArcjetDenialResult`. The hook does not throw.
 *   Tools already branded by a sibling `guardTool` are skipped so
 *   Guard is not double-called. Inbound `guard()` before `chat()`
 *   does not brand tools and does not skip this gate.
 * - **Correlation** → `tanstackAiContext()` reads a caller-owned id
 *   from the helper options or `chat({ context })`. It never mints a
 *   new id. It never reads `ctx.threadId` (TanStack auto-generates
 *   it). It never reads `traceId` / `requestId` / `streamId`.
 *
 * There is no `guardTool`. A throw from `execute` is swallowed into
 * `{ error }` and is not a usable deny envelope. There is no
 * `guardInbound`, no `guardApproval`, and nothing named
 * `contentGuardMiddleware` (TanStack already has that name).
 *
 * Put Arcjet **first** in the middleware array. `onBeforeToolCall` is
 * first-win; if `toolCacheMiddleware` (or anything else) skips first,
 * Guard never runs.
 *
 * ## Screen inbound before `chat()` — there is no inbound hook.
 *
 * There is no first-class inbound channel, so there is no
 * `guardInbound`. Put prompt-injection (and other inbound rules) in
 * the application before `chat()`. Call `guard()` directly.
 * `guard()` fails open — callers must check `hasFailedOpen()`.
 * `contentGuardMiddleware` redacts the stream; it is not this policy
 * gate.
 *
 * ## `needsApproval` / `defineInterrupt` / `onInterruptBoundary` is HITL, not a policy gate.
 *
 * `needsApproval` / `defineInterrupt` / `onInterruptBoundary` is
 * human-in-the-loop. After a human yes, Guard still runs on the tool
 * call. Same trap as Mastra `requireApproval`, Claude `canUseTool`,
 * LangGraph `interrupt()`, Genkit `toolApproval`, OpenAI Agents
 * `needsApproval`, and LangChain `humanInTheLoopMiddleware`. There is
 * no `guardApproval`.
 *
 * Client tools and provider-native tools with no local `execute` are
 * out of scope.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardMiddleware, tanstackAiContext } from "@arcjet/guard/tanstack-ai/v0";
 * import { chat } from "@tanstack/ai";
 *
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const lookupLimit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * const appContext = { sessionId: conversationId };
 * const inbound = detectPromptInjection();
 * const decision = await client.guard({
 *   label: "message.received",
 *   rules: [inbound(userText)],
 *   ...tanstackAiContext({ context: appContext }),
 * });
 * if (decision.conclusion === "DENY") {
 *   throw new Error("message blocked");
 * }
 * if (decision.hasFailedOpen()) {
 *   throw new Error("inbound screening failed open");
 * }
 *
 * const stream = chat({
 *   adapter,
 *   messages,
 *   tools: [lookupOrder],
 *   context: appContext,
 *   middleware: [
 *     guardMiddleware(client, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [lookupLimit({ key: toolName, requested: 1 })],
 *       sessionId: conversationId,
 *     }),
 *   ],
 * });
 * ```
 */

export { tanstackAiContext } from "./context.ts";
export type { TanStackAiAgentContext, TanStackAiContextSource } from "./context.ts";
export { guardMiddleware } from "./guard-middleware.ts";
export type {
  GuardMiddlewareCall,
  GuardMiddlewarePolicy,
  TanStackAiGuardMiddleware,
} from "./guard-middleware.ts";
export * from "../../agents/index.ts";
