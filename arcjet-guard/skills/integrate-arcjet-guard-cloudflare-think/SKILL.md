---
name: integrate-arcjet-guard-cloudflare-think
description: Integrate Arcjet security into a Cloudflare Think agent using @arcjet/guard — delegate beforeToolCall to guardHooks so ToolCallDecision gates tools before execute, and read a caller-owned id from helper options. Use when asked to add Arcjet to Cloudflare Think, @cloudflare/think, rate limit its tools, screen inbound messages, or block prompt injection / PII. This is Cloudflare Think, not the Vercel AI SDK.
license: Apache-2.0
compatibility: Requires the target app to use Cloudflare Think (@cloudflare/think >=0.3.0 <1) on Node.js >= 22. This is Think subclass beforeToolCall. The floor is 0.3.0 because ToolCallDecision intercepts before execute. There is no /v1 until Think ships 1.x. Do not use @arcjet/guard/vercel-ai/v7.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/guard"
  library_version: "1.11.0" # x-release-please-version
sources:
  - README.md
---

# Integrate Arcjet Guard into Cloudflare Think

`@arcjet/guard`'s Cloudflare Think v0 namespace wraps the agent's existing
Arcjet client. It never talks to the Arcjet API itself. Two surfaces, one
decision rule:

- **Tool calls** → `guardHooks()`. A `{ beforeToolCall }` object the
  `Think` subclass delegates to. Default DENY is
  `{ action: "substitute", output: ArcjetDenialResult }` so the tool
  never runs and the model sees the payload. Optional `onDeny: "block"`
  returns `{ action: "block", reason }` and the model sees the denial
  `message` string. void / `{ action: "allow" }` lets `execute` run.
  Do not throw from the hook. Tools already branded by a sibling
  `guardTool` are skipped so Guard is not double-called. Inbound
  `guard()` before `chat()` does not brand tools and does not skip
  this gate.
- **Correlation** → `cloudflareThinkContext()` reads a caller-owned id
  from helper options (`guardHooks({ sessionId })`) or a wrap
  (`cloudflareThinkContext({ context: appContext })`). It never mints
  a new id. It never reads `toolCallId` (Think / AI SDK minted). It
  never reads a Durable Object `name` / `id`. It never reads `traceId`.

There is **no `guardTool`**. Skip is the hook return, not
throw-from-execute. There is no `guardInbound` and no `guardApproval`.
Think starter `needsApproval` is HITL, not a policy gate.

This namespace is Cloudflare Think **`beforeToolCall` +
`ToolCallDecision`**. Not the Vercel AI SDK. Think re-wraps `execute`
on the Cloudflare Agents harness (Durable Objects, workspace / MCP /
client tools). Do not also wrap with `@arcjet/guard/vercel-ai/v7` or
`@arcjet/guard/claude-managed-agents/v0`. Mixing those wrappers on the
same tools is disallowed. Client tools and tools with no local
`execute` are out of scope.

Docs live at
[docs.arcjet.com/guards/cloudflare-think/](https://docs.arcjet.com/guards/cloudflare-think/).
Do **not** overwrite any other `/guards/...` slug.

## Screen inbound before `chat()` — there is no inbound hook.

There is no first-class inbound channel, so there is no
`guardInbound`. Put prompt-injection (and other inbound rules) in the
application before `chat()` / `saveMessages()`. Call `guard()`
directly. `guard()` fails open — callers must check
`hasFailedOpen()`.

## `needsApproval` is HITL, not a policy gate.

Think starter `needsApproval` is human-in-the-loop. After a human yes,
Guard still runs on the tool call. Same trap as Mastra
`requireApproval`, Claude `canUseTool`, LangGraph `interrupt()`,
Genkit `toolApproval`, OpenAI Agents `needsApproval`, LangChain
`humanInTheLoopMiddleware`, TanStack `needsApproval`, and Google ADK
`requireConfirmation`. There is no `guardApproval`.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those are gated by `guardHooks`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Put the
   conversation / session id you already have on helper options
   (`guardHooks({ sessionId })`). That id is the correlation id.
   Do not use `toolCallId` or a Durable Object `name` / `id`.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   `chat()`: failing closed there means the turn does not start
   for the duration of the outage, so `"allow"` is a routine and
   legitimate choice at that one call site. `guard()` itself still
   fails open — check `hasFailedOpen()`.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   `chat()` with `guard()`. Check `hasFailedOpen()`.
2. **`needsApproval` is not a policy gate.** It is HITL. After a
   human yes, Guard still runs.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/cloudflare-think/v0`. `@arcjet/guard/cloudflare-think`
   does not resolve. Docs are `/guards/cloudflare-think/`.
4. **Correlation is read, never minted.** Do not call
   `createAgentContext` inside a hook — that generates a second id
   and splits the Sequence. Put the id you already chose on
   `guardHooks({ sessionId })`. Do not read `toolCallId`, `traceId`,
   or a Durable Object `name` / `id`.
5. **Do not also wrap with `@arcjet/guard/vercel-ai/v7`.** Think
   already re-wraps `execute`. Mixing the two wrappers on one tool
   is disallowed.
6. **Do not add `guardTool`.** Skip is `{ action: "block" }` or
   `{ action: "substitute" }` from `beforeToolCall`.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@cloudflare/think` (optional
peer, needed for `@arcjet/guard/cloudflare-think/v0`). Always use the
versioned path: `@arcjet/guard/cloudflare-think/v0` resolves;
`@arcjet/guard/cloudflare-think` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.
The peer range is `>=0.3.0 <1`. Node 22+ — do not bump Node for this
adapter.

```sh
npm install @arcjet/guard @cloudflare/think
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate tool calls — delegate beforeToolCall

```ts
import { Think } from "@cloudflare/think";
import { guardHooks } from "@arcjet/guard/cloudflare-think/v0";
import { tokenBucket, localDetectSensitiveInfo } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const lookupLimit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});
const detectPii = localDetectSensitiveInfo();

const hooks = guardHooks(arcjet, {
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
});

export class SupportAgent extends Think<Env> {
  beforeToolCall(ctx) {
    return hooks.beforeToolCall(ctx);
  }
}
```

- Omit `rules` to submit none. The guard call still happens.
- On DENY the original `execute` never runs. Delivery is
  `{ action: "substitute", output: { arcjetDenied: true, reason, message, retryable } }`
  so the model sees the payload.
- `onDeny: "block"` returns `{ action: "block", reason }` (the denial
  `message` string). The model does not get `ArcjetDenialResult`.
  Prefer default substitute when the model should see the payload.
  `onDeny: "block"` applies to real DENY only; unavailable stays
  substitute.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.
  A Guard error ALWAYS returns `block` / `substitute`, never void.
- ALLOW captures `outcome: "success"` when the policy lets the tool
  run, not when `execute` finishes. `beforeToolCall` cannot wrap
  the tool; a later tool throw does not flip that capture.
- Tools already branded by a sibling `guardTool` skip the hook
  so Guard is not double-called. This namespace has no `guardTool`.
  Inbound `guard()` before `chat()` does not stamp that brand.

## Step 3: Screen inbound before chat

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { cloudflareThinkContext } from "@arcjet/guard/cloudflare-think/v0";

import { arcjet } from "./arcjet.js";

const inbound = detectPromptInjection();
const decision = await arcjet.guard({
  label: "message.received",
  rules: [inbound(userText)],
  ...cloudflareThinkContext({ context: { sessionId: conversationId } }),
});

if (decision.conclusion === "DENY") {
  throw new Error("message blocked");
}
if (decision.hasFailedOpen()) {
  throw new Error("inbound screening failed open");
}
```

There is no `guardInbound`. `guard()` fails open — always check
`hasFailedOpen()`.

## Step 4: Correlation

Put the id you already have on helper options:

```ts
const hooks = guardHooks(arcjet, { sessionId: conversationId });
```

Preference order: caller wrap `context.correlationId` /
`context.sessionId` / `context.conversationId`, then copies on a
bare app object, then `init.sessionId` / `init.correlationId`. If
none is a valid 1–256 printable-ASCII string, the call is
uncorrelated rather than joined to a generated id nobody has.

A `beforeToolCall` context that has `toolCallId` and `toolName` is
Think's envelope, so top-level `sessionId` on that object is ignored.

Never mint a new id. Never read `toolCallId` (Think / AI SDK always
generates it). Never read a Durable Object `name` / `id`. Never read
`traceId`. `needsApproval` resumes after a human yes — Guard still
runs on the tool call. Do not treat the approval or its resume value
as correlation.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before `chat()`, including `hasFailedOpen()`),
   a hook substitute-deny, a block-deny, block+unavailable still
   substitute, execute not called on deny, no-throw, never-mint, and
   fail-closed (an unreachable guard → substitute, never void).
   Confirm the denial is `{ action: "substitute" }` (or block) and
   the run is not a `needsApproval` pause.
3. Confirm in the Arcjet dashboard that decisions share the
   caller-owned session id as their correlation id — not
   `toolCallId` or a Durable Object id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `cloudflare-think-agent`](https://github.com/arcjet/examples/tree/main/examples/cloudflare-think-agent)
as a later follow-up. Do not add an example under `examples/` in the
JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
