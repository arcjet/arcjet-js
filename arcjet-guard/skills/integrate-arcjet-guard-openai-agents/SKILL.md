---
name: integrate-arcjet-guard-openai-agents
description: Integrate Arcjet security into an OpenAI Agents text Agent using @arcjet/guard — wrap tool({ execute }), screen inbound before run(), and read a caller-owned id from runContext.context. Use when asked to add Arcjet to @openai/agents, rate limit its tools, screen inbound messages, or block prompt injection / PII.
license: Apache-2.0
compatibility: Requires the target app to use OpenAI Agents (@openai/agents >=0.17.0 <1) on Node.js >= 22. This is text Agent + run() / Runner, not Realtime, not Sandbox, not hosted / MCP / asTool.
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into an OpenAI Agents app

`@arcjet/guard`'s OpenAI Agents v0 namespace wraps the agent's existing
Arcjet client. It never talks to the Arcjet API itself. Two surfaces, one
decision rule:

- **An authored tool** (`tool({ execute })`) → `guardTool()`. After
  `tool()` the object is a `FunctionTool`; the runner calls `invoke`.
  DENY returns a structured `ArcjetDenialResult`. Do not throw.
- **Correlation** → `openaiAgentsContext()` reads a field the integrator
  put on `runContext.context` (then documented copies: `conversationId`,
  `groupId`, already-resolved `sessionId`). It never mints a new id.
  It never calls `session.getSessionId()`.

This namespace is text **`Agent` + `run()` / `Runner`**. Not Realtime,
not Sandbox, not hosted tools, not computer / shell / apply_patch, not
MCP, not `agent.asTool()`.

## Screen inbound before `run()` (SDK `inputGuardrails` are not Arcjet)

There is no first-class inbound channel, so there is no `guardInbound`.
Put prompt-injection (and other inbound rules) in the application before
`run()`. SDK `inputGuardrails` / `outputGuardrails` /
`defineToolInputGuardrail` / `defineToolOutputGuardrail` are the SDK's
own tripwires, not this policy gate. Do not wrap them as Guard.

## `needsApproval` is not a policy gate

`needsApproval` / `requireApproval` / `onApproval` is human-in-the-loop.
The run pauses; `result.state.approve` / `reject`. Same trap as Mastra
`requireApproval`, Claude `canUseTool`, and LangGraph `interrupt()`.
There is no `guardApproval`. Do not wrap them as Guard.

## `tool()` execute is the deny point; hosted, MCP, and handoffs are not

The runner executes authored function tools in `toolExecution.ts` via
`invoke`. Hosted tools, handoffs, computer / shell / apply_patch, and
MCP (`mcpServers` → `mcpToFunctionTool`) skip that authored-`execute`
path. `agent_tool_start` / `agent_tool_end` are void observe-only
hooks; they are not a deny. There is no `guardHooks` and no
`guardToolNode` (there is no ToolNode).

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those get `guardTool`. Hosted / MCP / handoffs
   are out of v0 scope.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Put the
   conversation / session id you already have on
   `run(..., { context: { sessionId } })`. That id is the correlation id,
   not the user.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound screening before
   `run()`: failing closed there means the agent does not run for the
   duration of the outage, so `"allow"` is a routine and legitimate
   choice at that one call site.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection before
   `run()`. SDK input/output guardrails are not Arcjet.
2. **`needsApproval` is not a policy gate.** It is HITL. Use `guardTool`.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/openai-agents/v0`. `@arcjet/guard/openai-agents` does
   not resolve.
4. **Correlation is read, never minted.** Do not call `createAgentContext`
   inside a run callback — that generates a second id and splits the
   Sequence. `RunContext` has no session / conversation id of its own.
   Put the id you already chose on `run(..., { context })`. Do not call
   `session.getSessionId()` from the helper: `MemorySession` mints a UUID
   when constructed without `sessionId`. Do not use `traceId` (the SDK
   mints one when omitted).
5. **Do not double-wrap with `@arcjet/guard/vercel-ai/v7`.** `guardTool`
   throws if the tool already carries the Arcjet protection brand.
6. **A denial from `guardTool` is a structured object, not a throw.**
   Throwing would hit the SDK `errorFunction` (a generic string, or
   `ToolCallError` when `outputSchema` / `errorFunction: null`). The
   runner stringifies the object onto a `function_call_result` with
   `status: "completed"` — the denial is in the payload
   (`arcjetDenied: true`). If `onDeny` throws, the tool still does not
   run and the model still receives the default denial.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@openai/agents` (optional peer,
needed for `@arcjet/guard/openai-agents/v0`). Always use the versioned
path: `@arcjet/guard/openai-agents/v0` resolves;
`@arcjet/guard/openai-agents` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.
Zod is the OpenAI Agents peer, not ours — install `zod` only if the app
already uses it for `tool({ parameters })`.

```sh
npm install @arcjet/guard @openai/agents
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate authored tools

```ts
import { tool } from "@openai/agents";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/openai-agents/v0";
import { tokenBucket, localDetectSensitiveInfo } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const lookupLimit = tokenBucket({
  bucket: "lookups",
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});
// Factory then text — same shape as `detectPromptInjection()(text)`.
// Scan free-text args (a note, reason, body). An opaque `orderId` will
// not trip EMAIL / phone / card / IP, so do not pass it here.
const detectPii = localDetectSensitiveInfo();

export const lookupOrder = guardTool(
  arcjet,
  tool({
    name: "lookup_order",
    description: "Look up an order by ID",
    parameters: z.object({
      orderId: z.string(),
      note: z.string(),
    }),
    execute: async ({ orderId, note }) => ({ orderId, note, status: "shipped" }),
  }),
  {
    action: "order.looked-up",
    rules: (input: { orderId: string; note: string }) => [
      lookupLimit({ key: input.orderId, requested: 1 }),
      detectPii(input.note),
    ],
  },
);
```

- Omit `rules` to submit none. The guard call still happens.
- On DENY the closed-over `execute` never runs. The model receives
  `{ arcjetDenied: true, reason, message, retryable }` as the tool
  result (stringified by the runner).
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.
- The runner treats the denial as the tool's output. If the tool sets
  `timeoutMs`, that race now covers the guard round trip too, so leave
  headroom for it; if it sets `outputGuardrails` or `customDataExtractor`,
  those receive the denial object and must not assume the tool's own shape.

## Step 3: Screen inbound before run

```ts
import { detectPromptInjection } from "@arcjet/guard";
import { openaiAgentsContext } from "@arcjet/guard/openai-agents/v0";

import { arcjet } from "./arcjet.js";

const appContext = { sessionId: conversationId };
const inbound = detectPromptInjection();
const decision = await arcjet.guard({
  label: "message.received",
  rules: [inbound(userText)],
  ...openaiAgentsContext({ context: appContext, conversationId }),
});

if (decision.conclusion === "DENY") {
  throw new Error("message blocked");
}

await run(agent, userText, { context: appContext });
```

There is no `guardInbound`.

## Step 4: Correlation

Put the id you already have on the app context you pass to `run()`:

```ts
const appContext = { sessionId: conversationId };
await run(agent, userText, { context: appContext });
```

`MemorySession({ sessionId })` and `OpenAIConversationsSession({
conversationId })` already exist. Resolve the id yourself
(`await session.getSessionId()` only after you passed that id in) and
copy it onto `context`. `openaiAgentsContext` reads it; it never calls
`createAgentContext` and never calls `getSessionId()`.

Preference order: `context.correlationId`, then `context.sessionId`,
then `context.conversationId`, then `context.groupId`, then the
envelope copies (`conversationId`, `groupId`, already-resolved
`sessionId`). If none is a valid 1–256 printable-ASCII string, the call
is uncorrelated rather than joined to a generated id nobody has.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (before run), a tool deny, PII on args, a rate
   limit, and fail-closed (an unreachable guard).
3. Confirm in the Arcjet dashboard that decisions share the session /
   conversation id as their correlation id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo will land in
[`arcjet/examples` `openai-agent`](https://github.com/arcjet/examples/tree/main/examples/openai-agent)
with [arcjet/examples#193](https://github.com/arcjet/examples/pull/193).
Do not add an example under `examples/` in the JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
