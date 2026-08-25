---
name: integrate-arcjet-guard-strands-agents
description: Integrate Arcjet security into a Strands Agents JS app using @arcjet/guard — wrap tool({ callback }), put guardHooks on Agent({ plugins }) for unwrapped / MCP / vended tools, and read a caller-owned id from invocationState. Use when asked to add Arcjet to strands-agents, rate limit its tools, screen inbound messages, or block prompt injection / PII.
license: Apache-2.0
compatibility: Requires the target app to use Strands Agents JS (@strands-agents/sdk >=1.1.0 <2) on Node.js >= 22. This is JS Agent + tool({ callback }) + Plugin / addHook, not the Python SDK. The floor is 1.1.0 because HookOrder + interrupt() shipped then.
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into a Strands Agents app

`@arcjet/guard`'s Strands Agents v1 namespace wraps the agent's existing
Arcjet client. It never talks to the Arcjet API itself. Three surfaces,
one decision rule:

- **An authored tool** (`tool({ callback })`) → `guardTool()`. After
  `tool()` the object is a `FunctionTool` / `ZodTool` whose runner path
  is `_callback` (`stream()` / `invoke()`). DENY returns a plain
  `ArcjetDenialResult`. Do not throw. Do not fabricate a
  `ToolResultBlock`.
- **MCP / unwrapped / vended tools** → `guardHooks()`. A Plugin whose
  `initAgent` registers `BeforeToolCallEvent` at
  `HookOrder.SDK_FIRST - 1`. On DENY it sets `event.cancel` to
  `JSON.stringify(ArcjetDenialResult)`. Already-branded tools are
  skipped. Do **not** use `BeforeToolsEvent.cancel` (that skips
  per-tool hooks).
- **Correlation** → `strandsAgentContext()` reads a field the
  integrator put on `invocationState` (`correlationId`, then
  `sessionId`, then `requestId`). It never mints a new id. It never
  reads `traceId`. It never uses `SessionManager` or `agent.id`.

This namespace is JS **`@strands-agents/sdk` `Agent` + `tool({
callback })` + Plugin / `addHook`**. Not the Python SDK. Do not also
wrap the same tool with `@arcjet/guard/vercel-ai/v7` or
`@arcjet/guard/langgraph/v1`. Zod is their peer, not ours.

## Screen inbound before `invoke()` / `stream()` — there is no inbound hook.

There is no first-class inbound channel, so there is no `guardInbound`.
Put prompt-injection (and other inbound rules) in the application
before `agent.invoke()` / `stream()`. Middleware / model hooks are not
this policy gate.

## `interrupt()` is not a policy gate.

`event.interrupt()` is human-in-the-loop. Same trap as Mastra
`requireApproval`, Claude `canUseTool`, LangGraph `interrupt()`,
OpenAI Agents `needsApproval`, and LangChain
`humanInTheLoopMiddleware`. There is no `guardApproval` /
`guardInterrupt`. Do not wrap `interrupt()` as Guard.

## Deny with `BeforeToolCallEvent.cancel` (and `guardTool` on authored callbacks). `BeforeToolsEvent.cancel` skips per-tool hooks — do not use it.

The authored `callback` is the deny point for tools you own. MCP,
vended tools, and anything not wrapped with `guardTool` skip that
callback. `guardHooks` is the invoke-wide gate for those. Official:
set `event.cancel` to a string; `tool.stream()` does not run;
`AfterToolCallEvent` still fires.

Do not use `BeforeToolsEvent.cancel`. A truthy value skips
`_toolExecutor.execute()`, so per-tool hooks never run.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those get `guardTool`. MCP / vended / tools
   you did not author get `guardHooks`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Put the
   conversation / session id you already have on
   `agent.invoke(..., { invocationState: { sessionId } })` *and* on
   `guardHooks({ sessionId })`. That id is the correlation id, not the
   user.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   `invoke()`: failing closed there means the agent does not run for
   the duration of the outage, so `"allow"` is a routine and legitimate
   choice at that one call site.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   `agent.invoke()` / `stream()`. Middleware / model hooks are not Guard.
2. **`interrupt()` is not a policy gate.** It is HITL. Use `guardTool`
   or `guardHooks`. A denial is `event.cancel = JSON.stringify(...)`,
   not an `InterruptError`.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/strands-agents/v1`. `@arcjet/guard/strands-agents`
   does not resolve.
4. **Correlation is read, never minted.** Do not call `createAgentContext`
   inside a hook — that generates a second id and splits the Sequence.
   Put the id you already chose on `invocationState`. Do not read
   `traceId`. Do not use `SessionManager` or `agent.id`.
5. **Do not use `BeforeToolsEvent.cancel`.** It skips the per-tool
   hooks that `guardHooks` registers. Deny on `BeforeToolCallEvent`.
6. **A denial from `guardTool` is a structured object, not a throw.**
   Wrap both `_callback` and ZodTool's `_functionTool._callback`.
   Returning a plain `ArcjetDenialResult` is correct; `FunctionTool`
   wraps objects in a `JsonBlock`. Do not fabricate a
   `ToolResultBlock`. Do not double-wrap with
   `@arcjet/guard/vercel-ai/v7` or `@arcjet/guard/langgraph/v1`.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@strands-agents/sdk` (optional
peer, needed for `@arcjet/guard/strands-agents/v1`). Always use the
versioned path: `@arcjet/guard/strands-agents/v1` resolves;
`@arcjet/guard/strands-agents` throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`. Zod is Strands' peer, not ours —
install `zod` only if the app already uses it. Node 22+.

```sh
npm install @arcjet/guard @strands-agents/sdk
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate authored tools

```ts
import { tool } from "@strands-agents/sdk";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/strands-agents/v1";
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
  tool({
    name: "lookup_order",
    description: "Look up an order by number",
    inputSchema: z.object({
      orderNumber: z.string(),
      note: z.string(),
    }),
    callback: async ({ orderNumber, note }) => ({ orderNumber, note, status: "shipped" }),
  }),
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
- On DENY the authored callback never runs. The model receives
  `{ arcjetDenied: true, reason, message, retryable }` as the
  callback return (`FunctionTool` wraps that object in a `JsonBlock`).
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.
- Prefer omitting `outputSchema` on guarded tools, or verify the schema
  accepts `ArcjetDenialResult` / your `onDeny` shape. A denial is not
  schema-checked.

## Step 3: Gate unwrapped / MCP / vended tools

```ts
import { Agent } from "@strands-agents/sdk";
import { guardHooks } from "@arcjet/guard/strands-agents/v1";
import { tokenBucket } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const mcpLimit = tokenBucket({
  refillRate: 20,
  intervalSeconds: 60,
  maxTokens: 20,
});

const agent = new Agent({
  tools: [lookupOrder],
  plugins: [
    guardHooks(arcjet, {
      action: ({ toolName }) => `${toolName}.invoked`,
      rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
      sessionId: conversationId,
    }),
  ],
});
```

Already-branded (`guardTool`) tools skip the hook gate. Tools that are
not branded — MCP, vended tools, anything not wrapped — are still
gated.

Put the same id on `invoke(..., { invocationState: { sessionId } })`
and on `guardHooks({ sessionId })` when you need tool-time correlation
through the hook.

## Step 4: Screen inbound before invoke

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { strandsAgentContext } from "@arcjet/guard/strands-agents/v1";

import { arcjet } from "./arcjet.js";

const invocationState = { sessionId: conversationId };
const inbound = detectPromptInjection();
const decision = await arcjet.guard({
  label: "message.received",
  rules: [inbound(userText)],
  ...strandsAgentContext({ invocationState }),
});

if (decision.conclusion === "DENY") {
  throw new Error("message blocked");
}

await agent.invoke(userText, { invocationState });
```

There is no `guardInbound`.

## Step 5: Correlation

Put the id you already have on the `invocationState` bag you pass to
`invoke()` / `stream()`:

```ts
const invocationState = { sessionId: conversationId };
await agent.invoke(userText, { invocationState });
```

Preference order: `invocationState.correlationId`, then
`invocationState.sessionId`, then `invocationState.requestId`, then
documented copies on the envelope, then `init.sessionId`. If none is a
valid 1–256 printable-ASCII string, the call is uncorrelated rather
than joined to a generated id nobody has.

Never read `traceId`. Never read `agent.id`. Never call
`SessionManager`. Never call `createAgentContext` inside a hook.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before invoke), a tool deny, PII on args, a
   rate limit, a hook deny on an unwrapped tool, and fail-closed
   (an unreachable guard). Confirm `interrupt()` is never called.
3. Confirm in the Arcjet dashboard that decisions share the session /
   request id as their correlation id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `strands-agent`](https://github.com/arcjet/examples)
as a later follow-up. Do not add an example under `examples/` in the
JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
