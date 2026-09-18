/**
 * @packageDocumentation
 *
 * Cloudflare Think namespace for Arcjet Guards.
 *
 * This module provides Cloudflare Think `beforeToolCall` helpers plus
 * the framework-agnostic layer they build on, so a Think app needs
 * one import path and no notion of layering.
 *
 * **Requires the optional peer dependency `@cloudflare/think`
 * (`>=0.3.0 <1`)**. Nothing in this module imports that package at
 * runtime: every Think type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls it in. Latest supported
 * development pin is 0.19.x. There is no `/v1` until Think ships
 * 1.x. The floor is 0.3.0 because that is the first release whose
 * `beforeToolCall` returns a functional `ToolCallDecision`
 * (`allow` / `block` / `substitute`).
 *
 * **Note:** the version segment is `v0` because `@cloudflare/think` is
 * pre-1.0. There is deliberately no unversioned
 * `@arcjet/guard/cloudflare-think` alias. A `v1` namespace is added
 * when the SDK reaches 1.0; the segment names the SDK's major, not
 * this integration's iteration. 0.x minors can break.
 *
 * v0 is a `Think` subclass + class `beforeToolCall`. Not the Vercel
 * AI SDK — do not also wrap with `@arcjet/guard/vercel-ai/v7`.
 *
 * Two surfaces, and the things this namespace does not build:
 *
 * - **Tool calls** → `guardHooks()`. A `{ beforeToolCall }` object
 *   assigned on a `Think` subclass. Default DENY is
 *   `{ action: "substitute", output: ArcjetDenialResult }` so the
 *   tool never runs and the model sees the payload. Optional
 *   `onDeny: "block"` returns `{ action: "block", reason }` and
 *   skips the tool — the model does not get `ArcjetDenialResult`.
 *   The hook does not throw. Fail-closed unavailable stays
 *   substitute even when `onDeny` is `"block"`.
 * - **Correlation** → `cloudflareThinkContext()` reads a caller-owned
 *   id from helper options (`guardHooks({ sessionId })`) or a wrap
 *   (`cloudflareThinkContext({ context: appContext })`). It never
 *   mints a new id. It never reads `toolCallId` (Think always
 *   generates it). It never reads `requestId` / `traceId` / Durable
 *   Object `name` / `id`.
 *
 * There is no `guardTool`. There is no `guardInbound`, no
 * `guardApproval`, and no `afterToolCall` capture hook.
 * `needsApproval` is HITL, not a policy gate.
 *
 * ## Screen inbound before the Think turn — there is no inbound hook.
 *
 * There is no first-class inbound deny channel, so there is no
 * `guardInbound`. Put prompt-injection (and other inbound rules) in
 * the application before the turn. Call `guard()` directly.
 * `guard()` fails open — callers must check `hasFailedOpen()`.
 *
 * ## `needsApproval` is HITL, not a policy gate.
 *
 * Think `needsApproval` is human-in-the-loop. After a human yes,
 * Guard still runs on the tool call. Same trap as Mastra
 * `requireApproval`, Claude `canUseTool`, LangGraph `interrupt()`,
 * Genkit `toolApproval`, OpenAI Agents `needsApproval`, LangChain
 * `humanInTheLoopMiddleware`, TanStack `needsApproval`, and Google
 * ADK `requireConfirmation`. There is no `guardApproval`.
 *
 * Client tools with no local `execute` are out of scope. Do not
 * double-wrap with `@arcjet/guard/vercel-ai/v7`. Think is not the
 * Vercel AI SDK.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardHooks, cloudflareThinkContext } from "@arcjet/guard/cloudflare-think/v0";
 * import { Think } from "@cloudflare/think";
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
 *   ...cloudflareThinkContext({ context: appContext }),
 * });
 * if (decision.conclusion === "DENY") {
 *   throw new Error("message blocked");
 * }
 * if (decision.hasFailedOpen()) {
 *   throw new Error("inbound screening failed open");
 * }
 *
 * const hooks = guardHooks(client, {
 *   action: ({ toolName }) => `${toolName}.invoked`,
 *   rules: ({ toolName }) => [lookupLimit({ key: toolName, requested: 1 })],
 *   sessionId: conversationId,
 * });
 *
 * export class SupportAgent extends Think<Env> {
 *   override beforeToolCall = hooks.beforeToolCall;
 * }
 * ```
 */

export { cloudflareThinkContext } from "./context.ts";
export type { CloudflareThinkAgentContext, CloudflareThinkContextSource } from "./context.ts";
export { guardHooks } from "./hooks.ts";
export type { CloudflareThinkGuardHooks, GuardHooksCall, GuardHooksPolicy } from "./hooks.ts";
export * from "../../agents/index.ts";
