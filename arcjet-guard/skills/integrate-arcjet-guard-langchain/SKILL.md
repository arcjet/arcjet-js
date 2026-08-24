---
name: integrate-arcjet-guard-langchain
description: Integrate Arcjet security into a LangChain JS createAgent using @arcjet/guard — wrap tool() / StructuredTool, put guardMiddleware on createAgent({ middleware }) for MCP / unwrapped tools, and read configurable.thread_id for correlation. Use when asked to add Arcjet to langchain createAgent, rate limit its tools, screen inbound messages, or block prompt injection / PII. This is LangChain JS, not the Python page.
license: Apache-2.0
compatibility: Requires the target app to use LangChain JS (langchain >=1.2.0 <2 and @langchain/core >=1 <2) on Node.js >= 22. This is createAgent + createMiddleware({ wrapToolCall }), not LangGraph StateGraph / ToolNode. wrapToolCall only sees runtime.configurable.thread_id as of langchain 1.2.34.
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into a LangChain JS createAgent

`@arcjet/guard`'s LangChain v1 namespace wraps the agent's existing Arcjet
client. It never talks to the Arcjet API itself. Three surfaces, one
decision rule:

- **An authored tool** (`tool()` / `StructuredTool`) → `guardTool()`.
  DENY returns a plain `ArcjetDenialResult`. Do not throw. Do not
  fabricate a `ToolMessage`. `createAgent`'s `baseHandler` wraps a
  non-ToolMessage in a success `ToolMessage`.
- **MCP / unwrapped / runtime-discovered tools** → `guardMiddleware()`.
  A `createAgent({ middleware })` middleware whose `wrapToolCall` is
  the invoke()-wide gate. It denies by returning a **real**
  `ToolMessage` (`content` = JSON of the payload, `tool_call_id` =
  `request.toolCall.id`, `name` = `request.toolCall.name`) without
  calling `handler`. Already-branded tools are skipped when
  `request.tool` can be looked up. Do not set `status: "error"`. Do
  not throw (throws bubble and drop `arcjetDenied`).
- **Correlation** → `langchainContext()` reads
  `configurable.thread_id` (what wrapToolCall sees on
  `runtime.configurable` as of langchain 1.2.34), then caller-owned
  `sessionId` / `conversationId`. It never mints a new id. It never
  reads `traceId`. It never treats `interrupt` / resume as
  correlation.

This namespace is LangChain JS **`createAgent` + `wrapToolCall`**. Not
LangGraph Graph API (`StateGraph` + `ToolNode`) — that is
`@arcjet/guard/langgraph/v1`. Not `vercel-ai/v7`. Server-side provider
tools and headless `.implement()` tools are out of scope. Do not also
wrap the same tool with `@arcjet/guard/langgraph/v1` or
`@arcjet/guard/vercel-ai/v7`.

Docs live at
[docs.arcjet.com/guards/langchain-js/](https://docs.arcjet.com/guards/langchain-js/).
Do **not** use `/guards/langchain/` — that is the live Python page.

## Screen inbound before `agent.invoke` — there is no inbound hook. SDK middleware that is not `wrapToolCall` is not Guard.

There is no first-class inbound channel, so there is no
`guardInbound`. Put prompt-injection (and other inbound rules) in the
application before `agent.invoke`. `wrapModelCall` / `beforeModel` /
`afterModel` intercept the model call, not user text. They are not
this policy gate.

## `humanInTheLoopMiddleware` / `interrupt` is HITL, not a policy gate.

`humanInTheLoopMiddleware` / `interrupt()` / approve-edit-reject-respond
is human-in-the-loop. Same trap as Mastra `requireApproval`, Claude
`canUseTool`, LangGraph `interrupt()`, Genkit `toolApproval`, and
OpenAI Agents `needsApproval`. There is no `guardApproval`. Policy
sits on `wrapToolCall` only — do not deny in `afterModel`. HITL
already lives there.

## Deny inside `tool()` (and `guardMiddleware`'s `wrapToolCall`). MCP and unwrapped tools skip an unwrapped handler.

The authored `tool()` handler is the deny point for tools you own.
MCP tools, runtime-discovered tools, and anything not wrapped with
`guardTool` skip that handler. `guardMiddleware` is the invoke()-wide
gate for those.

`guardMiddleware` **can deny**. LangChain's official auth example
returns a `ToolMessage` without calling `handler`. wrapToolCall's
return is **not** passed through `baseHandler`. A duck-typed object
without the real class fails `ToolMessage.isInstance` and crashes the
messages reducer. Do not throw. Do not set `status: "error"`.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those get `guardTool`. MCP / runtime-discovered
   / tools you did not author get `guardMiddleware`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Put the
   conversation / session id you already have on
   `agent.invoke(..., { configurable: { thread_id } })`. That id is the
   correlation id, not the user. wrapToolCall only sees
   `runtime.configurable.thread_id` as of langchain 1.2.34.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   `agent.invoke`: failing closed there means the agent does not run for
   the duration of the outage, so `"allow"` is a routine and legitimate
   choice at that one call site.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   `agent.invoke`. `wrapModelCall` / `beforeModel` / `afterModel` are
   not Guard.
2. **`humanInTheLoopMiddleware` / `interrupt()` is not a policy gate.**
   It is HITL. Policy sits on `wrapToolCall` only. Do not deny in
   `afterModel`.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/langchain/v1`. `@arcjet/guard/langchain` does not
   resolve. Docs are `/guards/langchain-js/`, not `/guards/langchain/`.
4. **Correlation is read, never minted.** Do not call `createAgentContext`
   inside a middleware / tool callback — that generates a second id and
   splits the Sequence. Put the id you already chose on
   `configurable.thread_id`. Do not read `traceId`. Do not treat
   `interrupt` / resume as correlation.
5. **Do not double-wrap with `@arcjet/guard/langgraph/v1` or
   `@arcjet/guard/vercel-ai/v7`.** `guardTool` throws if the tool
   already carries the Arcjet protection brand. `guardMiddleware`
   skips branded tools so Guard is not double-called.
6. **Two denial envelopes. Do not collapse them.** `guardTool` returns
   a plain `ArcjetDenialResult`. `guardMiddleware` `wrapToolCall` MUST
   return a real `ToolMessage`. A bare object from wrapToolCall is the
   reducer-crash case.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `langchain` and
`@langchain/core` (optional peers, needed for
`@arcjet/guard/langchain/v1`). Always use the versioned path:
`@arcjet/guard/langchain/v1` resolves; `@arcjet/guard/langchain` throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`. The peer range is `>=1.2.0 <2` for
`langchain` and `>=1 <2` for `@langchain/core` (the range
`langgraph/v1` already shipped — `langchain`'s own `^1.2.9` peer on core
is what actually binds here). wrapToolCall only sees
`runtime.configurable.thread_id` as of langchain 1.2.34. Node 22+.

```sh
npm install @arcjet/guard langchain @langchain/core
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate authored tools

```ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/langchain/v1";
import { tokenBucket, localDetectSensitiveInfo } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

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
  tool(
    async ({ orderNumber, note }) => ({ orderNumber, note, status: "shipped" }),
    {
      name: "lookup_order",
      description: "Look up an order by number",
      schema: z.object({
        orderNumber: z.string(),
        note: z.string(),
      }),
    },
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
- On DENY the original `func` / `invoke` never runs. The caller
  receives `{ arcjetDenied: true, reason, message, retryable }`.
  Through `createAgent`, `baseHandler` wraps that object in a success
  `ToolMessage`.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.

## Step 3: Gate unwrapped / MCP / runtime-discovered tools

```ts
import { createAgent } from "langchain";
import { guardMiddleware } from "@arcjet/guard/langchain/v1";
import { tokenBucket } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const mcpLimit = tokenBucket({
  refillRate: 20,
  intervalSeconds: 60,
  maxTokens: 20,
});

const agent = createAgent({
  model,
  tools: [lookupOrder, ...mcpTools],
  middleware: [
    guardMiddleware(arcjet, {
      action: ({ toolName }) => `${toolName}.invoked`,
      rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
      sessionId: conversationId,
    }),
  ],
});
```

Already-branded (`guardTool`) tools skip the middleware guard when
they are present on `request.tool`. Tools that cannot be looked up
(`request.tool` undefined — MCP / unwrapped / runtime-discovered)
are still gated.

## Step 4: Screen inbound before invoke

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { langchainContext } from "@arcjet/guard/langchain/v1";

import { arcjet } from "./arcjet.js";

const inbound = detectPromptInjection();
const decision = await arcjet.guard({
  label: "message.received",
  rules: [inbound(userText)],
  ...langchainContext({ configurable: { thread_id: conversationId } }),
});

if (decision.conclusion === "DENY") {
  throw new Error("message blocked");
}
if (decision.hasFailedOpen()) {
  throw new Error("inbound screening failed open");
}

await agent.invoke(
  { messages: [{ role: "user", content: userText }] },
  { configurable: { thread_id: conversationId } },
);
```

There is no `guardInbound`.

## Step 5: Correlation

Put the id you already have on `configurable.thread_id`:

```ts
await agent.invoke(
  { messages: [{ role: "user", content: userText }] },
  { configurable: { thread_id: conversationId } },
);
```

Preference order: `configurable.thread_id`, then caller-owned
`sessionId`, then `conversationId`, then `init.sessionId` /
`init.correlationId`. If none is a valid 1–256 printable-ASCII
string, the call is uncorrelated rather than joined to a generated
id nobody has.

Never mint a new id. Never read `traceId`. Never treat `interrupt` /
resume as correlation. wrapToolCall only sees
`runtime.configurable.thread_id` as of langchain 1.2.34.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before invoke), a tool deny, PII on args, a
   rate limit, a middleware deny on an unwrapped tool, and fail-closed
   (an unreachable guard). Confirm the denial is a completed
   `ToolMessage` (`status` is not `"error"`) and the run is not an
   `interrupt()`.
3. Confirm in the Arcjet dashboard that decisions share the
   `thread_id` as their correlation id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `langchain-agent`](https://github.com/arcjet/examples/tree/main/examples/langchain-agent)
as a later follow-up. Do not add an example under `examples/` in the
JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
