---
name: integrate-arcjet-guard-mastra
description: Integrate Arcjet security into a Mastra agent using @arcjet/guard — wrap createTool execute, screen input/output with a Processor tripwire, and gate unwrapped MCP/workspace tools with hooks. Use when asked to add Arcjet to a Mastra agent, rate limit its tools, screen inbound messages, or block prompt injection / PII.
license: Apache-2.0
compatibility: Requires the target app to use Mastra (@mastra/core >=1 <2) on Node.js >= 22.
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into a Mastra agent

`@arcjet/guard`'s Mastra v1 namespace wraps the agent's existing Arcjet
client. It never talks to the Arcjet API itself. Four surfaces, one
decision rule:

- **An authored tool** (`createTool({ execute })`) → `guardTool()`. DENY is a
  structured tool result. Do not throw.
- **Inbound / outbound text** (`inputProcessors` / `outputProcessors`) →
  `guardProcessor()`. `processInput` + `abort()` on DENY raises a tripwire.
  `processInputStep` screens later agentic steps (tool continuations).
  Channels already hit `processInput`, so there is no `guardInbound`.
- **MCP / workspace / toolsets you did not wrap** → `guardHooks()`.
  `beforeToolCall` can return `{ proceed: false, output }`.
- **Correlation** → `mastraAgentContext()` reads `MASTRA_THREAD_ID_KEY`, then
  resource, then run. It never mints a new id.

Mastra `requireApproval` is human HITL, not policy. There is no
`guardApproval`. Do not also wrap these tools with
`@arcjet/guard/vercel-ai/v7`.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those get `guardTool`. Purely informational tools
   can be left unguarded or gated with no `rules`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: Mastra's resource id (`MASTRA_RESOURCE_ID_KEY`).
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about the inbound processor:
   failing closed there means the agent stops answering for the duration of
   the outage, so `"allow"` is a routine and legitimate choice at that one
   call site.

## The six things readers get wrong

1. **There is no `guardInbound`.** Mastra channels already run through
   `processInput`. Screen prompt injection on `guardProcessor` in
   `inputProcessors`.
2. **There is no `guardApproval`.** Mastra `requireApproval` is a human
   in-the-loop pause, not a policy gate. Use `guardTool` or `guardHooks`.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/mastra/v1`. `@arcjet/guard/mastra` does not resolve.
4. **Correlation is read, never minted.** Do not call `createAgentContext`
   inside a Mastra callback — that generates a second id and splits the
   Sequence. `mastraAgentContext` reads thread / resource / run and omits
   `correlationId` when none of those is a valid id.
5. **Do not double-wrap with `@arcjet/guard/vercel-ai/v7`.** Mastra tools
   are `createTool`, not AI SDK `tool()`. `guardTool` throws if the tool
   already carries the Arcjet protection brand.
6. **A denial from `guardTool` is a structured result**, not a throw. Prefer
   omitting `outputSchema` on guarded tools, or verify the schema accepts
   `ArcjetDenialResult`. If `onDeny` throws, the tool still does not run
   and the model still receives the default denial object.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@mastra/core` (optional peer,
needed for `@arcjet/guard/mastra/v1`). Always use the versioned path:
`@arcjet/guard/mastra/v1` resolves; `@arcjet/guard/mastra` throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

```sh
npm install @arcjet/guard @mastra/core
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate authored tools

```ts
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/mastra/v1";
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
  createTool({
    id: "lookup-order",
    description: "Look up an order by ID",
    inputSchema: z.object({
      orderId: z.string(),
      note: z.string(),
    }),
    async execute({ orderId, note }) {
      return { orderId, note, status: "shipped" };
    },
  }),
  {
    action: "order.looked-up",
    rules: (input) => [
      lookupLimit({ key: input.orderId, requested: 1 }),
      // Right: factory already bound above; pass free text, not orderId.
      detectPii(input.note),
    ],
  },
);
```

- Omit `rules` to submit none. The guard call still happens.
- On DENY the tool's `execute` never runs. The model receives
  `{ arcjetDenied: true, reason, message, retryable }`.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.

## Step 3: Screen inbound (and optional outbound) text

```ts
import { Agent } from "@mastra/core/agent";
import { guardProcessor } from "@arcjet/guard/mastra/v1";
import { detectPromptInjection } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const inbound = guardProcessor(arcjet, {
  action: "message.received",
  rules: ({ text }) => [detectPromptInjection()(text)],
});
const outbound = guardProcessor(arcjet, {
  action: "message.completed",
  rules: ({ text }) => [detectPromptInjection()(text)],
});

export const agent = new Agent({
  id: "support-agent",
  name: "support-agent",
  instructions: "Help the user.",
  model: "openai/gpt-4o",
  inputProcessors: [inbound],
  outputProcessors: [outbound],
});
```

- On DENY, `processInput` / `processInputStep` call `abort()` and Mastra
  raises a tripwire. If `abort()` were to return, the processor still
  throws so the turn cannot fail open.
- The same processor implements `processOutputResult` so it can sit on
  `outputProcessors` as well. Use a separate action name for outbound.
- Default `onGuardError: "deny"` — if the guard cannot be evaluated, the
  turn is aborted. Use `"allow"` when the human cost of rejecting a
  legitimate message exceeds the security cost of an outage.

## Step 4: Gate tools you did not wrap

```ts
import { guardHooks } from "@arcjet/guard/mastra/v1";
import { tokenBucket } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const mcpLimit = tokenBucket({
  bucket: "mcp-access",
  refillRate: 20,
  intervalSeconds: 60,
  maxTokens: 20,
});

export const hooks = guardHooks(arcjet, {
  action: ({ toolName }) => `${toolName}.invoked`,
  rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
});
```

Pass `hooks` to the `Agent` constructor (or to `generate` / `stream`).
`beforeToolCall` returns `{ proceed: false, output }` on DENY so MCP /
workspace / toolset calls never execute. `afterToolCall` is observe-only.

Use this for tools you did **not** pass through `guardTool`. Applying both
to the same authored tool double-calls the guard.

## Step 5: Correlation

Set Mastra's reserved keys on `RequestContext` before `generate` / `stream`.
`mastraAgentContext` reads them; it never calls `createAgentContext`.

```ts
import {
  RequestContext,
  MASTRA_THREAD_ID_KEY,
  MASTRA_RESOURCE_ID_KEY,
} from "@mastra/core/request-context";

const requestContext = new RequestContext();
requestContext.set(MASTRA_THREAD_ID_KEY, conversationId);
requestContext.set(MASTRA_RESOURCE_ID_KEY, userId);

await agent.generate(message, { requestContext });
```

Preference order: thread id, then resource id, then `workflow.runId`. If
none is a valid 1–256 printable-ASCII string, the call is uncorrelated
rather than joined to a generated id nobody has.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI, a tool deny, PII on args, a rate limit, and
   fail-closed (an unreachable guard).
3. Confirm in the Arcjet dashboard that decisions share the thread id as
   their correlation id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo lives in
[`arcjet/examples` `mastra-agent`](https://github.com/arcjet/examples/tree/main/examples/mastra-agent)
(lands with [arcjet/examples#193](https://github.com/arcjet/examples/pull/193)).
Do not add an example under `examples/` in the JS SDK repo.

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
