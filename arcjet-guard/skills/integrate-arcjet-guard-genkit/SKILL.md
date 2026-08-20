---
name: integrate-arcjet-guard-genkit
description: Integrate Arcjet security into a Genkit JS agent using @arcjet/guard — wrap ai.defineTool, put guardMiddleware on generate({ use }) for unwrapped / MCP / filesystem tools, and read a caller-owned id from generate({ context }). Use when asked to add Arcjet to genkit, rate limit its tools, screen inbound messages, or block prompt injection / PII.
license: Apache-2.0
compatibility: Requires the target app to use Genkit JS (genkit >=1.0.0 <2) on Node.js >= 22. This is JS genkit() + ai.defineTool + ai.generate, not Go / Python Genkit. guardMiddleware needs the generateMiddleware tool hook (Genkit >= 1.33).
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into a Genkit app

`@arcjet/guard`'s Genkit v1 namespace wraps the agent's existing Arcjet
client. It never talks to the Arcjet API itself. Three surfaces, one
decision rule:

- **An authored tool** (`ai.defineTool(config, handler)`) → `guardTool()`.
  After `defineTool` the object is a `ToolAction`; `generate()` calls it
  as a function. DENY returns a structured `ArcjetDenialResult`. Do not
  throw. Do not call `interrupt()`. Do not throw `ToolInterruptError`.
- **Filesystem / MCP / unwrapped tools** → `guardMiddleware()`. A
  `generate({ use })` middleware whose `tool` hook is the generate()-wide
  gate. It denies by returning a completed `ToolResponsePart` without
  calling `next()`. Already-branded tools are skipped when they can be
  looked up. Requires the `generateMiddleware` `tool` hook (Genkit >=
  1.33).
- **Correlation** → `genkitContext()` reads a field the integrator put
  on `generate({ context })` / the tool handler's `{ context }`
  (`correlationId`, then `sessionId`, then `conversationId`, then a
  caller-owned flow / run id). It never mints a new id. It never reads
  `traceId`. It never treats `interrupt` / `resumed` as correlation.

This namespace is JS **`genkit()` + `ai.defineTool` + `ai.generate`**.
Not Go / Python Genkit. Do not also wrap the same tool with
`@arcjet/guard/vercel-ai/v7`. Zod is Genkit's, not ours.

## Screen user text before `generate()` — there is no inbound hook. Middleware `model` is not Guard.

There is no first-class inbound channel, so there is no `guardInbound`.
Put prompt-injection (and other inbound rules) in the application before
`ai.generate()` / `chat.send()`. The middleware `model` hook intercepts
the model call, not user text. It is not this policy gate.

## `interrupt()` / `defineInterrupt` / `toolApproval` are HITL, not a policy gate.

`interrupt()` / `defineInterrupt` / `@genkit-ai/middleware`
`toolApproval` / `restartTool` / `finishReason === "interrupted"` is
human-in-the-loop. Same trap as Mastra `requireApproval`, Claude
`canUseTool`, LangGraph `interrupt()`, and OpenAI Agents
`needsApproval`. There is no `guardApproval`. Do not wrap them as Guard.

## Deny inside `defineTool` (and `guardMiddleware`'s `tool` hook). MCP and filesystem-injected tools skip an unwrapped handler.

The authored `defineTool` handler is the deny point for tools you own.
Filesystem middleware tools, MCP tools, and anything not wrapped with
`guardTool` skip that handler. `guardMiddleware` is the generate()-wide
gate for those. `returnToolRequests: true` means the app calls the tool
itself — `guardTool` on the defineTool handler still gates that;
`guardMiddleware` does not run if they never `generate()` the tool.

`guardMiddleware` **can deny**. Genkit's `resolveToolRequest` treats a
`ToolResponsePart` returned without calling `next()` as a completed tool
result. Throwing `ToolInterruptError` sets `finishReason: "interrupted"`
(HITL — do not do this). Returning `undefined` drops the tool request
(do not do this).

`generate({ use })` must receive a **plain object `{ name, instantiate }`**.
A raw function becomes a *model* hook only. A function with `instantiate`
+ `plugin` throws “must be called with ()”.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those get `guardTool`. MCP / filesystem /
   tools you did not author get `guardMiddleware`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Put the
   conversation / session id you already have on
   `ai.generate({ context: { sessionId } })` *and* on
   `guardMiddleware({ sessionId })` — the tool hook does not receive ALS
   context today. That id is the correlation id, not the user.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   `generate()`: failing closed there means the agent does not run for
   the duration of the outage, so `"allow"` is a routine and legitimate
   choice at that one call site.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   `ai.generate()` / `chat.send()`. Middleware `model` is not Guard.
2. **`interrupt()` is not a policy gate.** It is HITL. Use `guardTool`
   or `guardMiddleware`. A denial is a completed `toolResponse`, not
   `finishReason: "interrupted"`.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/genkit/v1`. `@arcjet/guard/genkit` does not resolve.
4. **Correlation is read, never minted.** Do not call `createAgentContext`
   inside a generate / tool callback — that generates a second id and
   splits the Sequence. Put the id you already chose on
   `generate({ context })`. Do not read `Session.sessionId` from a Session
   constructed without an id — that class mints a UUID. Do not use
   `traceId` (OTel / Genkit mints one). Do not treat `interrupt` /
   `resumed` as correlation.
5. **Do not double-wrap with `@arcjet/guard/vercel-ai/v7`.** `guardTool`
   throws if the tool already carries the Arcjet protection brand.
6. **A denial from `guardTool` is a structured object, not a throw.**
   Wrap the returned `ToolAction` (the callable `generate()` invokes),
   not the inner handler. `outputSchema` validation runs *inside*
   `action()`. Wrapping outside means DENY returns `ArcjetDenialResult`
   without schema check, so the model still sees a completed tool
   result. Wrapping the inner handler would throw on schema mismatch
   and fail `generate()`.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `genkit` (optional peer, needed
for `@arcjet/guard/genkit/v1`). Always use the versioned path:
`@arcjet/guard/genkit/v1` resolves; `@arcjet/guard/genkit` throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`. Zod is Genkit's peer, not ours —
install `zod` only if the app already uses it outside `genkit`. Public
API is `import { genkit, z } from "genkit"`. Node 22+.

```sh
npm install @arcjet/guard genkit
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate authored tools

```ts
import { genkit, z } from "genkit";
import { guardTool } from "@arcjet/guard/genkit/v1";
import { tokenBucket, localDetectSensitiveInfo } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const ai = genkit({ /* plugins, default model */ });

const lookupLimit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});
// Factory then text — same shape as `detectPromptInjection()(text)`.
// Scan free-text args (a note, reason, body). An opaque `orderNumber`
// will not trip EMAIL / phone / card / IP, so do not pass it here.
const detectPii = localDetectSensitiveInfo();

export const lookupOrder = guardTool(
  arcjet,
  ai.defineTool(
    {
      name: "lookup_order",
      description: "Look up an order by number",
      inputSchema: z.object({
        orderNumber: z.string(),
        note: z.string(),
      }),
    },
    async ({ orderNumber, note }) => ({ orderNumber, note, status: "shipped" }),
  ),
  {
    action: "order.looked-up",
    rules: (input) => [
      lookupLimit({ key: input.orderNumber, requested: 1 }),
      detectPii(input.note),
    ],
  },
);
```

- Omit `rules` to submit none. The guard call still happens.
- On DENY the closed-over handler never runs. The model receives
  `{ arcjetDenied: true, reason, message, retryable }` as
  `toolResponse.output`.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.
- Prefer omitting `outputSchema` on guarded tools, or verify the schema
  accepts `ArcjetDenialResult` / your `onDeny` shape. A denial is not
  schema-checked because the wrapper sits outside `action()`.

## Step 3: Gate unwrapped / MCP / filesystem tools

```ts
import { guardMiddleware } from "@arcjet/guard/genkit/v1";
import { tokenBucket } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const mcpLimit = tokenBucket({
  refillRate: 20,
  intervalSeconds: 60,
  maxTokens: 20,
});

await ai.generate({
  prompt: userText,
  tools: [lookupOrder, ...mcpTools],
  use: [
    guardMiddleware(arcjet, {
      action: ({ toolName }) => `${toolName}.invoked`,
      rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
      sessionId: conversationId,
    }),
  ],
  context: { sessionId: conversationId },
});
```

Already-branded (`guardTool`) actions skip the middleware guard when
they can be looked up on the registry. Tools that cannot be looked up
are still gated.

`generate({ context })` is delivered to authored handlers via ALS. The
tool-hook `ctx` from `toRunOptions` is only `{ metadata, resumed }` —
no ALS context. Put the same id on `policy.sessionId` when you need
tool-time correlation through the hook.

## Step 4: Screen inbound before generate

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { genkitContext } from "@arcjet/guard/genkit/v1";

import { arcjet } from "./arcjet.js";

const appContext = { sessionId: conversationId };
const inbound = detectPromptInjection();
const decision = await arcjet.guard({
  label: "message.received",
  rules: [inbound(userText)],
  ...genkitContext({ context: appContext }),
});

if (decision.conclusion === "DENY") {
  throw new Error("message blocked");
}

await ai.generate({
  prompt: userText,
  tools: [lookupOrder],
  use: [guardMiddleware(arcjet, { sessionId: conversationId })],
  context: appContext,
});
```

There is no `guardInbound`.

## Step 5: Correlation

Put the id you already have on the app context you pass to `generate()`:

```ts
const appContext = { sessionId: conversationId };
await ai.generate({
  prompt: userText,
  context: appContext,
});
```

Preference order: `context.correlationId`, then `context.sessionId`,
then `context.conversationId`, then a caller-owned `flowId` / `runId`,
then the envelope copies, then `init.sessionId`. If none is a valid
1–256 printable-ASCII string, the call is uncorrelated rather than
joined to a generated id nobody has.

Never read `Session.sessionId` from a Session constructed without an
id — that class mints a UUID. Never read `traceId`. Never treat
`interrupt` / `resumed` as correlation.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before generate), a tool deny, PII on args, a
   rate limit, a middleware deny on an unwrapped tool, and fail-closed
   (an unreachable guard). Confirm `finishReason !== "interrupted"`.
3. Confirm in the Arcjet dashboard that decisions share the session /
   conversation id as their correlation id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `genkit-agent`](https://github.com/arcjet/examples)
as a later follow-up. Do not add an example under `examples/` in the
JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
