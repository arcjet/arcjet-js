/**
 * @packageDocumentation
 *
 * TanStack AI 1.x namespace for Arcjet Guards.
 *
 * This module provides TanStack AI `chat()` helpers plus the
 * framework-agnostic layer they build on, so a TanStack AI app needs
 * one import path and no notion of layering.
 *
 * **Requires `@tanstack/ai` 1.x.** The package declares one optional
 * peer range, `>=0.8.0 <2`, for both this path and
 * `@arcjet/guard/tanstack-ai/v0`, so npm and pnpm do not warn when this
 * path is used with 0.x. TanStack AI 0.x never calls `onGuardToolCall`;
 * `guardMiddleware` detects a 0.x run in `onStart`, warns, and aborts
 * the run (or only warns with `onGuardError: "allow"`). For TanStack AI
 * 0.x use `@arcjet/guard/tanstack-ai/v0`.
 *
 * Nothing in this module imports `@tanstack/ai` at runtime: every
 * TanStack AI type arrives through `import type`, so installing
 * `@arcjet/guard` never pulls it in. Latest supported development pin
 * is 1.0.x.
 *
 * **Note:** the version segment names the SDK's major, not this
 * integration's iteration. There is deliberately no unversioned
 * `@arcjet/guard/tanstack-ai` alias. A `v2` namespace is added when
 * TanStack AI ships 2.x.
 *
 * v1 is `chat({ middleware })` + `ChatMiddleware.onGuardToolCall`, the
 * guard tier TanStack AI 1.0 added for checks that must not be
 * skipped. v0 used `onBeforeToolCall`, which is first-win: there, a
 * `transformArgs` from another middleware could change the args after
 * Guard allowed them. Not the Vercel AI SDK — do not also wrap with
 * `@arcjet/guard/vercel-ai/v7`.
 *
 * Two surfaces, and the things this namespace does not build:
 *
 * - **Tool calls** → `guardMiddleware()`. A `ChatMiddleware` whose
 *   `onGuardToolCall` is the `chat()`-wide gate. It runs after every
 *   `onBeforeToolCall` hook and after the `inputSchema` check, on the
 *   args the tool runs with. Default DENY is
 *   `{ type: "skip", result: ArcjetDenialResult }` so the tool never
 *   runs and the model sees the payload. Optional `onDeny: "abort"`
 *   returns `{ type: "abort", reason }` and stops the run — the model
 *   does not get `ArcjetDenialResult`. The hook does not throw.
 *   Tools already branded by a sibling `guardTool` are skipped so
 *   Guard is not double-called. Inbound `guard()` before `chat()`
 *   does not brand tools and does not skip this gate.
 * - **Correlation** → `tanstackAiContext()` reads a caller-owned id
 *   from the helper options, `chat({ context })`, or — last —
 *   `chat({ threadId })`. It never mints a new id. It never reads
 *   `traceId` / `requestId` / `streamId`.
 *
 * There is no `guardTool`. A throw from `execute` is swallowed into
 * `{ error }` and is not a usable deny envelope. There is no
 * `guardInbound`, no `guardApproval`, and nothing named
 * `contentGuardMiddleware` (TanStack already has that name).
 *
 * An `onBeforeToolCall` skip — for example a `toolCacheMiddleware`
 * hit — answers the call without running the tool, and no guard runs
 * for that call.
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
 * Client tools with no local `execute` are gated before TanStack AI
 * sends them to the client. Provider-native tools that the provider
 * runs are out of scope.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardMiddleware, tanstackAiContext } from "@arcjet/guard/tanstack-ai/v1";
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
 *   ...tanstackAiContext({ threadId, context: appContext }),
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
 *   threadId,
 *   tools: [lookupOrder],
 *   context: appContext,
 *   middleware: [
 *     guardMiddleware(client, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [lookupLimit({ key: toolName, requested: 1 })],
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
