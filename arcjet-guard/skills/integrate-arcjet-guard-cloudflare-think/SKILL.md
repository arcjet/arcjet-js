---
name: integrate-arcjet-guard-cloudflare-think
description: Integrate Arcjet security into a Cloudflare Think app using @arcjet/guard — assign guardHooks().beforeToolCall on a Think subclass so the hook gates tools, and read a caller-owned id from helper options. Use when asked to add Arcjet to Cloudflare Think, @cloudflare/think, rate limit its tools, screen inbound messages, or block prompt injection / PII. This is Cloudflare Think, not the Vercel AI SDK.
license: Apache-2.0
compatibility: Requires the target app to use Cloudflare Think (@cloudflare/think >=0.3.0 <1) on Node.js >= 22. This is Think + class beforeToolCall. There is no /v1 until Think ships 1.x. Do not use @arcjet/guard/vercel-ai/v7.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/guard"
  library_version: "1.13.0" # x-release-please-version
sources:
  - README.md
---

# Integrate Arcjet Guard into Cloudflare Think

`@arcjet/guard`'s Cloudflare Think v0 namespace wraps the agent's existing
Arcjet client. It never talks to the Arcjet API itself. Two surfaces, one
decision rule:

- **Tool calls** → `guardHooks()`. A `{ beforeToolCall }` object assigned
  on a `Think` subclass. Default DENY is
  `{ action: "substitute", output: ArcjetDenialResult }` so the tool
  never runs and the model sees the payload. Optional `onDeny: "block"`
  returns `{ action: "block", reason }` and skips the tool — the model
  does not get `ArcjetDenialResult`. Do not throw from the hook.
  Fail-closed unavailable stays substitute even when `onDeny` is
  `"block"`.
- **Correlation** → `cloudflareThinkContext()` reads a caller-owned id
  from helper options (`guardHooks({ sessionId })`) or a wrap
  (`cloudflareThinkContext({ context: appContext })`). It never mints a
  new id. It never reads `toolCallId` (Think always generates it). It
  never reads `requestId` / `traceId` / Durable Object `name` / `id`.

There is **no `guardTool`**. There is no `guardInbound`, no
`guardApproval`, and no `afterToolCall` capture hook.

This namespace is Cloudflare Think **`Think` + class `beforeToolCall`**.
Not the Vercel AI SDK. Do not also wrap with
`@arcjet/guard/vercel-ai/v7` or `@arcjet/guard/claude-managed-agents/v0`.
Client tools with no local `execute` are out of scope.

Docs live at
[docs.arcjet.com/guards/cloudflare-think/](https://docs.arcjet.com/guards/cloudflare-think/).
Do **not** overwrite any other `/guards/...` slug.

The floor is `@cloudflare/think@0.3.0` because that is the first
release whose `beforeToolCall` returns a functional `ToolCallDecision`
(`allow` / `block` / `substitute`) and wraps every server-side tool's
`execute` so the hook runs first.

## Screen inbound before the Think turn — there is no inbound hook.

There is no first-class inbound deny channel, so there is no
`guardInbound`. Put prompt-injection (and other inbound rules) in the
application before the turn. Call `guard()` directly. `guard()` fails
open — callers must check `hasFailedOpen()`.

## `needsApproval` is HITL, not a policy gate.

Think `needsApproval` is human-in-the-loop. After a human yes, Guard
still runs on the tool call. Same trap as Mastra `requireApproval`,
Claude `canUseTool`, LangGraph `interrupt()`, Genkit `toolApproval`,
OpenAI Agents `needsApproval`, LangChain `humanInTheLoopMiddleware`,
TanStack `needsApproval`, and Google ADK `requireConfirmation`. There
is no `guardApproval`.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those are gated by `guardHooks`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Put the
   conversation / session id you already have on
   `guardHooks({ sessionId })`. That id is the correlation id.
   Do not use `toolCallId`.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   the turn: failing closed there means the chat does not run for the
   duration of the outage, so `"allow"` is a routine and legitimate
   choice at that one call site. `guard()` itself still fails open —
   check `hasFailedOpen()`.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   the turn with `guard()`. Check `hasFailedOpen()`.
2. **`needsApproval` is not a policy gate.** It is HITL. After a
   human yes, Guard still runs.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/cloudflare-think/v0`. `@arcjet/guard/cloudflare-think`
   does not resolve. There is no `/v1` until Think ships 1.x. Docs
   are `/guards/cloudflare-think/`.
4. **Correlation is read, never minted.** Do not call
   `createAgentContext` inside a hook — that generates a second id
   and splits the Sequence. Put the id you already chose on
   `guardHooks({ sessionId })`. Do not read `toolCallId`, `requestId`,
   `traceId`, or the Durable Object `name` / `id`.
5. **Default DENY is substitute, not block.** The model sees
   `ArcjetDenialResult`. `onDeny: "block"` is real DENY only;
   unavailable stays substitute.
6. **Do not add `guardTool` and do not double-wrap with
   `@arcjet/guard/vercel-ai/v7`.** Think is not the Vercel AI SDK.

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

## Step 2: Gate tool calls

```ts
import { Think } from "@cloudflare/think";
import { guardHooks } from "@arcjet/guard/cloudflare-think/v0";
import { tokenBucket, localDetectSensitiveInfo, policyInput } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const lookupLimit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});
const detectPii = localDetectSensitiveInfo();

const hooks = guardHooks(arcjet, {
  action: ({ toolName }) => `${toolName}.invoked`,
  actor: conversationId,
  inputs: ({ toolName }) => ({
    tool: policyInput.server.string(toolName),
  }),
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
  override beforeToolCall = hooks.beforeToolCall;
}
```

- Omit `rules` to submit none. The guard call still happens.
- Optional `actor` and `inputs` (static, or a resolver over this adapter's native call — parsed input plus trusted runtime/context) are forwarded on the
  guard call so a remote policy that declares those names can evaluate.
  Build each input with `policyInput`. Omit them and the remote policy
  has nothing to read — its rules do not fire. A resolver throw
  fail-closes.
- On DENY the original `execute` never runs. Default delivery is
  `{ action: "substitute", output: { arcjetDenied: true, reason, message, retryable } }`.
- `onDeny: "block"` skips the tool with `{ action: "block", reason }`
  (the denial `message` string). The model does not get
  `ArcjetDenialResult`. Prefer default substitute when the model should
  see the payload. `onDeny: "block"` applies to real DENY only;
  unavailable stays substitute.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.
- ALLOW captures `outcome: "success"` when the policy lets the tool
  run, not when `execute` finishes. `beforeToolCall` cannot wrap
  the tool; a later tool throw does not flip that capture.

## Step 3: Screen inbound before the turn

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { cloudflareThinkContext, guardHooks } from "@arcjet/guard/cloudflare-think/v0";

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

const hooks = guardHooks(arcjet, { sessionId: conversationId });
```

There is no `guardInbound`. `guard()` fails open — always check
`hasFailedOpen()`.

## Step 4: Correlation

Put the id you already have on `guardHooks({ sessionId })`:

```ts
const hooks = guardHooks(arcjet, { sessionId: conversationId });
```

Preference order: `context.correlationId`, then `context.sessionId`,
then `context.conversationId`, then `init.sessionId` /
`init.correlationId`. If none is a valid 1–256 printable-ASCII
string, the call is uncorrelated rather than joined to a generated
id nobody has.

Pass a caller-owned bag as `cloudflareThinkContext({ context: appContext })`.
A `beforeToolCall` context that has `toolName` and `toolCallId` looks
like Think's tool-call envelope, so top-level `sessionId` on that
object is ignored.

Never mint a new id. Never read `toolCallId` (Think auto-generates
it). Never read `requestId` / `traceId` / Durable Object `name` /
`id`. `needsApproval` resumes after a human yes — Guard still runs
on the tool call. Do not treat the approval or its resume value as
correlation.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before the turn, including `hasFailedOpen()`),
   a hook substitute-deny, a block-deny, block+unavailable still
   substitute, no-throw, never-mint, actor/inputs, resolver throw,
   and fail-closed (an unreachable guard). Confirm the denial is
   `{ action: "substitute", output }` (or block) and the run is not
   an approval pause.
3. Confirm in the Arcjet dashboard that decisions share the
   caller-owned session id as their correlation id — not
   `toolCallId`.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `cloudflare-think-agent`](https://github.com/arcjet/examples/tree/main/examples/cloudflare-think-agent)
as a later follow-up. Do not add an example under `examples/` in the
JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
