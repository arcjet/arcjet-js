---
name: integrate-arcjet-guard-tanstack-ai
description: Integrate Arcjet security into a TanStack AI chat() app using @arcjet/guard — put guardMiddleware first on chat({ middleware }) so onBeforeToolCall gates tools, and read a caller-owned id from chat({ context }). Use when asked to add Arcjet to TanStack AI, rate limit its tools, screen inbound messages, or block prompt injection / PII. This is TanStack AI, not the Vercel AI SDK.
license: Apache-2.0
compatibility: Requires the target app to use TanStack AI (@tanstack/ai >=0.8.0 <1) on Node.js >= 22. This is chat() + ChatMiddleware.onBeforeToolCall. There is no /v1 until TanStack AI ships 1.x. Do not use @arcjet/guard/vercel-ai/v7.
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into TanStack AI

`@arcjet/guard`'s TanStack AI v0 namespace wraps the agent's existing Arcjet
client. It never talks to the Arcjet API itself. Two surfaces, one
decision rule:

- **Tool calls** → `guardMiddleware()`. A `chat({ middleware })`
  middleware whose `onBeforeToolCall` is the chat()-wide gate. Default
  DENY is `{ type: "skip", result: ArcjetDenialResult }` so the tool
  never runs and the model sees the payload. Optional `onDeny: "abort"`
  returns `{ type: "abort", reason }` and stops the run. Do not throw
  from the hook. Already-branded tools are skipped so a preceding
  `guard()` is not double-called.
- **Correlation** → `tanstackAiContext()` reads a caller-owned id from
  the helper options or `chat({ context })`. It never mints a new id.
  It never reads `ctx.threadId` (TanStack auto-generates it). It never
  reads `traceId` / `requestId` / `streamId`.

There is **no `guardTool`**. A throw from `execute` is swallowed into
`{ error }` and is not a usable deny envelope. There is no
`guardInbound`, no `guardApproval`, and nothing named
`contentGuardMiddleware` (TanStack already has that name).

This namespace is TanStack AI **`chat({ middleware })` +
`onBeforeToolCall`**. Not the Vercel AI SDK. Do not also wrap with
`@arcjet/guard/vercel-ai/v7`. Client tools and provider-native tools
with no local `execute` are out of scope.

Docs live at
[docs.arcjet.com/guards/tanstack-ai/](https://docs.arcjet.com/guards/tanstack-ai/).
Do **not** overwrite any other `/guards/...` slug.

Put Arcjet **first** in the middleware array. `onBeforeToolCall` is
first-win; if `toolCacheMiddleware` (or anything else) skips first,
Guard never runs.

## Screen inbound before `chat()` — there is no inbound hook.

There is no first-class inbound channel, so there is no
`guardInbound`. Put prompt-injection (and other inbound rules) in the
application before `chat()`. Call `guard()` directly. `guard()` fails
open — callers must check `hasFailedOpen()`. TanStack's
`contentGuardMiddleware` redacts the stream; it is not this policy
gate.

## `needsApproval` / `defineInterrupt` / `onInterruptBoundary` is HITL, not a policy gate.

`needsApproval` / `defineInterrupt` / `onInterruptBoundary` is
human-in-the-loop. After a human yes, Guard still runs on the tool
call. Same trap as Mastra `requireApproval`, Claude `canUseTool`,
LangGraph `interrupt()`, Genkit `toolApproval`, OpenAI Agents
`needsApproval`, and LangChain `humanInTheLoopMiddleware`. There is no
`guardApproval`.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those are gated by `guardMiddleware`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Put the
   conversation / session id you already have on
   `chat({ context: { sessionId } })`. That id is the correlation id.
   Do not use `ctx.threadId`.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   `chat()`: failing closed there means the chat does not run for the
   duration of the outage, so `"allow"` is a routine and legitimate
   choice at that one call site. `guard()` itself still fails open —
   check `hasFailedOpen()`.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   `chat()` with `guard()`. Check `hasFailedOpen()`.
   `contentGuardMiddleware` is not Guard.
2. **`needsApproval` / `defineInterrupt` / `onInterruptBoundary` is not
   a policy gate.** It is HITL. After a human yes, Guard still runs.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/tanstack-ai/v0`. `@arcjet/guard/tanstack-ai` does
   not resolve. There is no `/v1` until TanStack AI ships 1.x. Docs
   are `/guards/tanstack-ai/`.
4. **Correlation is read, never minted.** Do not call
   `createAgentContext` inside a middleware callback — that generates
   a second id and splits the Sequence. Put the id you already chose
   on `chat({ context })`. Do not read `ctx.threadId`, `traceId`,
   `requestId`, or `streamId`.
5. **Put Arcjet first.** `onBeforeToolCall` is first-win. If
   `toolCacheMiddleware` skips first, Guard never runs.
6. **Do not add `guardTool` and do not double-wrap with
   `@arcjet/guard/vercel-ai/v7`.** TanStack AI is not the Vercel AI
   SDK. A throw from `execute` becomes `{ error }`.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@tanstack/ai` (optional
peer, needed for `@arcjet/guard/tanstack-ai/v0`). Always use the
versioned path: `@arcjet/guard/tanstack-ai/v0` resolves;
`@arcjet/guard/tanstack-ai` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.
The peer range is `>=0.8.0 <1`. Node 22+ — do not bump Node for this
adapter.

```sh
npm install @arcjet/guard @tanstack/ai
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate tool calls — Arcjet first

```ts
import { chat } from "@tanstack/ai";
import { toolCacheMiddleware } from "@tanstack/ai/middlewares";
import { guardMiddleware } from "@arcjet/guard/tanstack-ai/v0";
import { tokenBucket, localDetectSensitiveInfo } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const lookupLimit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});
const detectPii = localDetectSensitiveInfo();

const stream = chat({
  adapter,
  messages,
  tools: [lookupOrder, ...mcpTools],
  context: { sessionId: conversationId },
  middleware: [
    guardMiddleware(arcjet, {
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
    toolCacheMiddleware(),
  ],
});
```

- Omit `rules` to submit none. The guard call still happens.
- On DENY the original `execute` never runs. Default delivery is
  `{ type: "skip", result: { arcjetDenied: true, reason, message, retryable } }`.
- `onDeny: "abort"` stops the chat run instead.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.
- Already-branded tools skip the middleware guard so a preceding
  `guard()` is not double-called.

## Step 3: Screen inbound before chat

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { tanstackAiContext } from "@arcjet/guard/tanstack-ai/v0";

import { arcjet } from "./arcjet.js";

const inbound = detectPromptInjection();
const decision = await arcjet.guard({
  label: "message.received",
  rules: [inbound(userText)],
  ...tanstackAiContext({ context: { sessionId: conversationId } }),
});

if (decision.conclusion === "DENY") {
  throw new Error("message blocked");
}
if (decision.hasFailedOpen()) {
  throw new Error("inbound screening failed open");
}

await chat({
  adapter,
  messages: [{ role: "user", content: userText }],
  context: { sessionId: conversationId },
  middleware: [guardMiddleware(arcjet, { sessionId: conversationId })],
});
```

There is no `guardInbound`. `guard()` fails open — always check
`hasFailedOpen()`.

## Step 4: Correlation

Put the id you already have on `chat({ context })`:

```ts
await chat({
  adapter,
  messages,
  context: { sessionId: conversationId },
  middleware: [guardMiddleware(arcjet, { sessionId: conversationId })],
});
```

Preference order: `context.correlationId`, then `context.sessionId`,
then `context.conversationId`, then `init.sessionId` /
`init.correlationId`. If none is a valid 1–256 printable-ASCII
string, the call is uncorrelated rather than joined to a generated
id nobody has.

Never mint a new id. Never read `ctx.threadId` (TanStack
auto-generates it). Never read `traceId` / `requestId` / `streamId`.
`needsApproval` resumes after a human yes — Guard still runs on the
tool call. Do not treat the interrupt or its resume value as
correlation.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before `chat()`, including `hasFailedOpen()`),
   a middleware skip-deny, an abort-deny, first-win ordering (Arcjet
   before `toolCacheMiddleware`), no-throw, never-mint, and
   fail-closed (an unreachable guard). Confirm the denial is
   `{ type: "skip", result }` (or abort) and the run is not an
   interrupt.
3. Confirm in the Arcjet dashboard that decisions share the
   caller-owned session id as their correlation id — not
   `threadId`.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `tanstack-agent`](https://github.com/arcjet/examples/tree/main/examples/tanstack-agent)
as a later follow-up. Do not add an example under `examples/` in the
JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
