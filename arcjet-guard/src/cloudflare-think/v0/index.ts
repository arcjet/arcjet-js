/**
 * @packageDocumentation
 *
 * Cloudflare Think namespace for Arcjet Guards.
 *
 * This module provides Cloudflare Think `beforeToolCall` helpers plus
 * the framework-agnostic layer they build on, so a Think agent needs
 * one import path and no notion of layering.
 *
 * **Requires the optional peer dependency `@cloudflare/think`
 * (`>=0.3.0 <1`)**. Nothing in this module imports that package at
 * runtime: every Think type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls it in. Latest supported
 * development pin is 0.17.x. The floor is 0.3.0 because that is when
 * `ToolCallDecision` intercepts before `execute`; earlier hooks were
 * post-execution. There is no `/v1` until Think ships 1.x.
 *
 * **Note:** the version segment is `v0` because `@cloudflare/think` is
 * pre-1.0. There is deliberately no unversioned
 * `@arcjet/guard/cloudflare-think` alias. A `v1` namespace is added
 * when the SDK reaches 1.0; the segment names the SDK's major, not
 * this integration's iteration. 0.x minors can break.
 *
 * v0 is `Think` subclass `beforeToolCall(ctx) => ToolCallDecision | void`.
 * Not the Vercel AI SDK — do not also wrap with
 * `@arcjet/guard/vercel-ai/v7`. Think re-wraps `execute` on the
 * Cloudflare Agents harness (Durable Objects, workspace / MCP / client
 * tools). Mixing the two wrappers on the same tools is disallowed.
 *
 * Two surfaces, and the things this namespace does not build:
 *
 * - **Tool calls** → `guardHooks()`. A `{ beforeToolCall }` object
 *   the `Think` subclass delegates to. Default DENY is
 *   `{ action: "substitute", output: ArcjetDenialResult }` so the
 *   tool never runs and the model sees the payload. Optional
 *   `onDeny: "block"` returns `{ action: "block", reason }` — the
 *   model sees the denial `message` string. void /
 *   `{ action: "allow" }` lets `execute` run. The hook does not
 *   throw. Tools already branded by a sibling `guardTool` are
 *   skipped so Guard is not double-called. Inbound `guard()` before
 *   `chat()` does not brand tools and does not skip this gate.
 * - **Correlation** → `cloudflareThinkContext()` reads a caller-owned
 *   id from helper options or a wrap
 *   (`cloudflareThinkContext({ context: appContext })`). It never
 *   mints a new id. It never reads `toolCallId` (Think / AI SDK
 *   minted). It never reads a Durable Object `name` / `id`. It never
 *   reads `traceId`.
 *
 * There is no `guardTool`. Skip is the hook return, not
 * throw-from-execute. There is no `guardInbound` and no
 * `guardApproval`. Think starter `needsApproval` is HITL, not
 * policy. After a human yes, Guard still runs. Client tools and
 * tools with no local `execute` are out of scope.
 *
 * ## Screen inbound before `chat()` — there is no inbound hook.
 *
 * There is no first-class inbound channel, so there is no
 * `guardInbound`. Put prompt-injection (and other inbound rules) in
 * the application before `chat()` / `saveMessages()`. Call `guard()`
 * directly. `guard()` fails open — callers must check
 * `hasFailedOpen()`.
 *
 * ## `needsApproval` is HITL, not a policy gate.
 *
 * Think starter `needsApproval` is human-in-the-loop. After a human
 * yes, Guard still runs on the tool call. Same trap as Mastra
 * `requireApproval`, Claude `canUseTool`, LangGraph `interrupt()`,
 * Genkit `toolApproval`, OpenAI Agents `needsApproval`, LangChain
 * `humanInTheLoopMiddleware`, TanStack `needsApproval`, and Google
 * ADK `requireConfirmation`. There is no `guardApproval`.
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
 *   beforeToolCall(ctx) {
 *     return hooks.beforeToolCall(ctx);
 *   }
 * }
 * ```
 */

export { cloudflareThinkContext } from "./context.ts";
export type { CloudflareThinkAgentContext, CloudflareThinkContextSource } from "./context.ts";
export { guardHooks } from "./hooks.ts";
export type { CloudflareThinkGuardHooks, GuardHooksCall, GuardHooksPolicy } from "./hooks.ts";
export * from "../../agents/index.ts";
