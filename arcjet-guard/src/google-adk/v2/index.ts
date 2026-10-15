/**
 * @packageDocumentation
 *
 * Google ADK namespace for Arcjet Guards.
 *
 * This module provides Google ADK JS Runner plugin helpers plus the
 * framework-agnostic layer they build on, so a Google ADK app needs
 * one import path and no notion of layering.
 *
 * **Requires the optional peer dependency `@google/adk`
 * (`>=2 <3`)**. Nothing in this module imports that package at
 * runtime: every Google ADK type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls it in. Latest supported
 * development pin is 2.0.0.
 *
 * **Note:** the version segment is `v2` because it names Google ADK
 * JS 2.x. There is deliberately no unversioned
 * `@arcjet/guard/google-adk` alias. A `v3` namespace is added when
 * the SDK reaches 3.x; the segment names the SDK's major, not this
 * integration's iteration.
 *
 * v2 is JS `@google/adk` `Runner` + `BasePlugin.beforeToolCallback`.
 * Not `@google/genai`. Not the Python google-adk SDK.
 *
 * Two surfaces, and the things this namespace does not build:
 *
 * - **Tool calls** → `guardPlugin()`. A Runner `BasePlugin` whose
 *   `beforeToolCallback` is the run-wide gate. DENY is a dictionary
 *   (`ArcjetDenialResult`) so ADK skips `runAsync` and the model
 *   sees the payload. `undefined` lets the tool execute. The
 *   callback does not throw — PluginManager treats a throw as a
 *   plugin error, not skip. Tools already branded by a sibling
 *   `guardTool` are skipped so Guard is not double-called. Inbound
 *   `guard()` before `Runner.runAsync` does not brand tools and
 *   does not skip this gate. The plugin does not screen inbound
 *   (`onUserMessageCallback` / `beforeModelCallback` are no-ops) so
 *   a preceding `guard()` does not double-call.
 * - **Correlation** → `googleAdkContext()` reads a caller-owned id
 *   from helper options (`guardPlugin({ sessionId })`) or a wrap
 *   (`googleAdkContext({ context: appContext })`). ADK `Context` has
 *   no nested `context` field; `state` is durable and loses to helper
 *   options. It never mints a new id. It never reads `invocationId`
 *   (ADK always generates it). It never reads `traceId`. It never
 *   reads `toolContext.sessionId` / `session.id` (session auto-ids).
 *
 * There is no `guardTool`. Skip is the plugin return, not
 * throw-from-execute. There is no `guardInbound` and no
 * `guardApproval`. `onUserMessageCallback` replaces the user
 * message; `beforeRunCallback` / `beforeModelCallback` return
 * `Content` / `LlmResponse` rather than a deny dict. Confirmation
 * (`requireConfirmation` / `requestConfirmation`) is HITL, not
 * policy. Do not use ADK `SecurityPlugin` as the Arcjet policy
 * gate. Tool gate is enough for v2.
 *
 * Put Arcjet **first** in `new Runner({ plugins })`. PluginManager
 * is first-win; if another plugin returns a value first, Guard
 * never runs.
 *
 * ## Screen inbound before `Runner.runAsync` — there is no inbound hook.
 *
 * There is no first-class inbound deny-dict channel, so there is no
 * `guardInbound`. Put prompt-injection (and other inbound rules) in
 * the application before `runner.runAsync()`. Call `guard()`
 * directly. `guard()` fails open — callers must check
 * `hasFailedOpen()`. `onUserMessageCallback` replaces the user
 * message; it is not this policy gate.
 *
 * ## `requireConfirmation` / `requestConfirmation` is HITL, not a policy gate.
 *
 * `requireConfirmation` / `toolContext.requestConfirmation` /
 * `SecurityPlugin` CONFIRM is human-in-the-loop. After a human yes,
 * Guard still runs on the tool call. Same trap as Mastra
 * `requireApproval`, Claude `canUseTool`, LangGraph `interrupt()`,
 * Genkit `toolApproval`, OpenAI Agents `needsApproval`, LangChain
 * `humanInTheLoopMiddleware`, and TanStack
 * `needsApproval`. There is no `guardApproval`.
 *
 * Do not double-wrap with `@arcjet/guard/vercel-ai/v7`.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardPlugin, googleAdkContext } from "@arcjet/guard/google-adk/v2";
 * import { Runner } from "@google/adk";
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
 *   ...googleAdkContext({ context: appContext }),
 * });
 * if (decision.conclusion === "DENY") {
 *   throw new Error("message blocked");
 * }
 * if (decision.hasFailedOpen()) {
 *   throw new Error("inbound screening failed open");
 * }
 *
 * const runner = new Runner({
 *   appName: "my_app",
 *   agent,
 *   sessionService,
 *   plugins: [
 *     guardPlugin(client, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [lookupLimit({ key: toolName, requested: 1 })],
 *       sessionId: conversationId,
 *     }),
 *   ],
 * });
 *
 * for await (const event of runner.runAsync({
 *   userId,
 *   sessionId: conversationId,
 *   newMessage: { parts: [{ text: userText }] },
 * })) {
 *   void event;
 * }
 * ```
 */

export { googleAdkContext } from "./context.ts";
export type { GoogleAdkAgentContext, GoogleAdkContextSource } from "./context.ts";
export { guardPlugin } from "./guard-plugin.ts";
export type { GoogleAdkGuardPlugin, GuardPluginCall, GuardPluginPolicy } from "./guard-plugin.ts";
export * from "../../agents/index.ts";
