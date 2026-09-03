---
name: integrate-arcjet-guard-google-adk
description: Integrate Arcjet security into a Google ADK JS app using @arcjet/guard — put guardPlugin first on Runner({ plugins }) so beforeToolCallback gates tools, and read a caller-owned id from helper options or context. Use when asked to add Arcjet to Google ADK, @google/adk, rate limit its tools, screen inbound messages, or block prompt injection / PII. This is Google ADK JS, not @google/genai and not Python google-adk.
license: Apache-2.0
compatibility: Requires the target app to use Google ADK JS (@google/adk >=2 <3) on Node.js >= 22. This is Runner + BasePlugin.beforeToolCallback. Path is /v2 to match ADK 2.x. Do not use @arcjet/guard/vercel-ai/v7.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/guard"
  library_version: "1.11.0" # x-release-please-version
sources:
  - README.md
---

# Integrate Arcjet Guard into Google ADK JS

`@arcjet/guard`'s Google ADK v2 namespace wraps the agent's existing Arcjet
client. It never talks to the Arcjet API itself. Two surfaces, one
decision rule:

- **Tool calls** → `guardPlugin()`. A Runner `BasePlugin` whose
  `beforeToolCallback` is the run-wide gate. DENY is a dictionary
  (`ArcjetDenialResult`) so ADK skips `runAsync` and the model sees
  the payload. `undefined` lets the tool execute. Do not throw from
  the callback — PluginManager treats a throw as a plugin error, not
  skip. Tools already branded by a sibling `guardTool` are skipped so
  Guard is not double-called. Inbound `guard()` before
  `Runner.runAsync` does not brand tools and does not skip this gate.
  The plugin does not screen inbound (`onUserMessageCallback` /
  `beforeModelCallback` are no-ops) so a preceding `guard()` does
  not double-call.
- **Correlation** → `googleAdkContext()` reads a caller-owned id from
  the helper options or a bag the integrator put on the run. It never
  mints a new id. It never reads `invocationId` (ADK always generates
  it). It never reads `traceId`. It never reads
  `toolContext.sessionId` / `session.id` (session auto-ids).

There is **no `guardTool`**. Skip is the plugin return, not
throw-from-execute. There is no `guardInbound`, no `guardApproval`,
and this namespace does not use ADK `SecurityPlugin` as the Arcjet
policy gate.

This namespace is Google ADK JS **`Runner` +
`BasePlugin.beforeToolCallback`**. Not `@google/genai`. Not the
Python SDK. Do not also wrap with `@arcjet/guard/vercel-ai/v7`.

Docs live at
[docs.arcjet.com/guards/google-adk/](https://docs.arcjet.com/guards/google-adk/).
Do **not** overwrite any other `/guards/...` slug.

Put Arcjet **first** in `new Runner({ plugins })`. PluginManager is
first-win; if another plugin (including `SecurityPlugin`) returns a
value first, Guard never runs.

## Screen inbound before `Runner.runAsync` — there is no inbound hook.

There is no first-class inbound deny-dict channel, so there is no
`guardInbound`. Put prompt-injection (and other inbound rules) in the
application before `runner.runAsync()`. Call `guard()` directly.
`guard()` fails open — callers must check `hasFailedOpen()`.
`onUserMessageCallback` replaces the user message; it is not this
policy gate.

## `requireConfirmation` / `requestConfirmation` is HITL, not a policy gate.

`requireConfirmation` / `toolContext.requestConfirmation` /
`SecurityPlugin` CONFIRM is human-in-the-loop. After a human yes,
Guard still runs on the tool call. Same trap as Mastra
`requireApproval`, Claude `canUseTool`, LangGraph `interrupt()`,
Genkit `toolApproval`, OpenAI Agents `needsApproval`, LangChain
`humanInTheLoopMiddleware`, and TanStack `needsApproval`. There is no
`guardApproval`.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those are gated by `guardPlugin`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Put the
   conversation / session id you already have on helper options or
   session `state`. That id is the correlation id. Do not use
   `invocationId` or `toolContext.sessionId`.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   `Runner.runAsync`: failing closed there means the run does not start
   for the duration of the outage, so `"allow"` is a routine and
   legitimate choice at that one call site. `guard()` itself still
   fails open — check `hasFailedOpen()`.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   `Runner.runAsync` with `guard()`. Check `hasFailedOpen()`.
   `onUserMessageCallback` is not Guard.
2. **`requireConfirmation` / `requestConfirmation` / `SecurityPlugin`
   CONFIRM is not a policy gate.** It is HITL. After a human yes,
   Guard still runs. Do not use `SecurityPlugin` as the Arcjet gate.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/google-adk/v2`. `@arcjet/guard/google-adk` does
   not resolve. Docs are `/guards/google-adk/`.
4. **Correlation is read, never minted.** Do not call
   `createAgentContext` inside a plugin callback — that generates
   a second id and splits the Sequence. Put the id you already chose
   on helper options or `state`. Do not read `invocationId`,
   `traceId`, or `toolContext.sessionId`.
5. **Put Arcjet first.** PluginManager is first-win. If another
   plugin returns a dict first, Guard never runs.
6. **Do not add `guardTool` and do not double-wrap with
   `@arcjet/guard/vercel-ai/v7`.** Google ADK JS is not the Vercel
   AI SDK. Skip is the plugin return.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@google/adk` (optional
peer, needed for `@arcjet/guard/google-adk/v2`). Always use the
versioned path: `@arcjet/guard/google-adk/v2` resolves;
`@arcjet/guard/google-adk` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.
The peer range is `>=2 <3`. Node 22+ — do not bump Node for this
adapter.

```sh
npm install @arcjet/guard @google/adk
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate tool calls — Arcjet first

```ts
import { Runner } from "@google/adk";
import { guardPlugin } from "@arcjet/guard/google-adk/v2";
import { tokenBucket, localDetectSensitiveInfo } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const lookupLimit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});
const detectPii = localDetectSensitiveInfo();

const runner = new Runner({
  appName: "my_app",
  agent,
  sessionService,
  plugins: [
    guardPlugin(arcjet, {
      action: ({ toolName }) => `${toolName}.invoked`,
      rules: ({ toolName, input }) => {
        const note =
          typeof input === "object" && input !== null && "note" in input
            ? String((input as { note?: unknown }).note ?? "")
            : "";
        return [
          lookupLimit({ key: toolName, requested: 1 }),
          ...(note.length > 0 ? [detectPii(note)] : []),
        ];
      },
      sessionId: conversationId,
    }),
  ],
});
```

- Omit `rules` to submit none. The guard call still happens.
- On DENY the original `runAsync` never runs. Delivery is
  `{ arcjetDenied: true, reason, message, retryable }` — the dict
  ADK treats as skip.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.
  A Guard error ALWAYS returns a deny dict, never `undefined`.
- ALLOW captures `outcome: "success"` when the policy lets the tool
  run, not when `runAsync` finishes. `beforeToolCallback` cannot wrap
  the tool; a later tool throw does not flip that capture.
- Tools already branded by a sibling `guardTool` skip the plugin
  so Guard is not double-called. This namespace has no `guardTool`.
  Inbound `guard()` before `Runner.runAsync` does not stamp that brand.

## Step 3: Screen inbound before Runner.run

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { googleAdkContext } from "@arcjet/guard/google-adk/v2";

import { arcjet } from "./arcjet.js";

const inbound = detectPromptInjection();
const decision = await arcjet.guard({
  label: "message.received",
  rules: [inbound(userText)],
  ...googleAdkContext({ context: { sessionId: conversationId } }),
});

if (decision.conclusion === "DENY") {
  throw new Error("message blocked");
}
if (decision.hasFailedOpen()) {
  throw new Error("inbound screening failed open");
}

for await (const event of runner.runAsync({
  userId,
  sessionId: conversationId,
  newMessage: { parts: [{ text: userText }] },
})) {
  void event;
}
```

There is no `guardInbound`. `guard()` fails open — always check
`hasFailedOpen()`. The plugin does not implement inbound screening,
so this call does not double-call Guard.

## Step 4: Correlation

Put the id you already have on helper options or session `state`:

```ts
guardPlugin(arcjet, { sessionId: conversationId });
```

Preference order: `context.correlationId`, then `context.sessionId`,
then `context.conversationId`, then the same keys on `state`, then
`init.sessionId` / `init.correlationId`. If none is a valid 1–256
printable-ASCII string, the call is uncorrelated rather than joined
to a generated id nobody has.

Pass a caller-owned bag as `googleAdkContext({ context: appContext })`.
A `toolContext` that has `invocationId` looks like ADK's Context
envelope, so top-level `sessionId` on that object is ignored.

Never mint a new id. Never read `invocationId` (ADK always generates
it). Never read `traceId`. Never read `toolContext.sessionId` /
`session.id`. `requireConfirmation` resumes after a human yes —
Guard still runs on the tool call. Do not treat the confirmation or
its resume value as correlation.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before `Runner.runAsync`, including
   `hasFailedOpen()`), a plugin deny-dict skip, undefined execute,
   first-plugin short-circuit (Arcjet first), no-throw, never-mint,
   and fail-closed (an unreachable guard → deny dict, never
   `undefined`). Confirm the denial is a dict and the run is not a
   confirmation / HITL pause.
3. Confirm in the Arcjet dashboard that decisions share the
   caller-owned session id as their correlation id — not
   `invocationId` or an ephemeral session id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `google-adk-agent`](https://github.com/arcjet/examples/tree/main/examples/google-adk-agent)
as a later follow-up. Do not add an example under `examples/` in the
JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
