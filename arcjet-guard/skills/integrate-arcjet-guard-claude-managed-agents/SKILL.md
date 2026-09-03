---
name: integrate-arcjet-guard-claude-managed-agents
description: Integrate Arcjet security into Claude Managed Agents (hosted REST+SSE, beta managed-agents-2026-04-01) using @arcjet/guard — screen user.message / initial_events before sessions.events.send, and gate custom tools on agent.custom_tool_use. Use when asked to add Arcjet to Claude Managed Agents, rate limit custom tools, or block prompt injection on hosted sessions. Not the Claude Agent SDK.
license: Apache-2.0
compatibility: Requires the target app to use Claude Managed Agents via @anthropic-ai/sdk >=0.86.0 <1 on Node.js >= 22.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/guard"
  library_version: "1.11.0" # x-release-please-version
sources:
  - README.md
---

# Integrate Arcjet Guard into Claude Managed Agents

`@arcjet/guard`'s Claude Managed Agents v0 namespace wraps the agent's
existing Arcjet client. It never talks to the Arcjet API itself. Anthropic
runs the hosted tool loop. There is **no PreToolUse**.

This is **not** `@arcjet/guard/claude-agent-sdk/v0`. Do not reuse that
adapter, its hooks, or `guardTool`.

- **Inbound text** (`user.message` / `initial_events`) → `guardEvents()`
  **before** `sessions.events.send`. DENY does not send. There is no
  `guardInbound`.
- **A custom tool you execute** (`agent.custom_tool_use`) →
  `guardCustomTool()`. DENY does not run the tool; send
  `user.custom_tool_result` with `is_error: true` and error text (that
  field exists on the real events API). Self-hosted `EnvironmentWorker` /
  `betaTool({ run })` uses the same gate. The CLI worker cannot register
  custom tools.
- **Correlation** → `claudeManagedAgentsContext()` is caller-owned only.
  It never mints. It never treats Anthropic session/event ids as if we
  created them. Never `traceId`.

## What cannot be gated

Default `permission_policy: always_allow` **cannot** be gated. Anthropic
executes bash/read/write in the cloud sandbox before your process sees an
event. `web_search` / `web_fetch` always run on Anthropic. MCP: Anthropic
is the client; customer-side Guard is on custom tools and MCP servers
**you** host. `user.tool_confirmation` is HITL (`always_ask`), not a
policy gate — do not add a confirmation helper as the happy path.

`protect()` stays fail-open. These helpers are fail-closed.

Docs:
[https://docs.arcjet.com/guards/claude-managed-agents/](https://docs.arcjet.com/guards/claude-managed-agents/)
(shared JS+Python page). Do not edit `/guards/claude-agent-sdk/` or
`/guards/claude-agent-sdk-py/`.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which **custom tools** does the app execute on `agent.custom_tool_use`?
   Those get `guardCustomTool`. Built-ins under `always_allow` cannot.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Session/event ids from Anthropic are not the correlation
   id.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound `guardEvents`:
   failing closed there means the turn is not sent.

## The things readers get wrong

1. **This is not the Claude Agent SDK.** No `guardTool`, no `guardHooks`,
   no PreToolUse, no `UserPromptSubmit`.
2. **There is no `guardInbound`.** The helper is `guardEvents`.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/claude-managed-agents/v0`.
   `@arcjet/guard/claude-managed-agents` does not resolve. There is no
   `/v1`.
4. **Correlation is caller-owned, never minted.** Do not pass
   `session.id` / event ids to `claudeManagedAgentsContext` as if Arcjet
   created them. Never `traceId`.
5. **Default `always_allow` cannot be gated.** Do not claim we can block
   Anthropic-cloud bash/read/write.
6. **On custom-tool DENY, send `user.custom_tool_result`.** Do not invent
   fields the schema lacks. `is_error` exists — use it. Do not run the
   tool.
7. **Do not add a `claude-managed-agents` example in this SDK repo.**
   Examples belong in `arcjet/examples`.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@anthropic-ai/sdk` (optional
peer, needed for types). Always use the versioned path.

```sh
npm install @arcjet/guard @anthropic-ai/sdk
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Screen inbound before `sessions.events.send`

```ts
import { detectPromptInjection } from "@arcjet/guard";
import {
  claudeManagedAgentsContext,
  guardEvents,
} from "@arcjet/guard/claude-managed-agents/v0";

import { arcjet } from "./arcjet.js";

const ctx = claudeManagedAgentsContext({ correlationId: conversationId });
const events = [
  { type: "user.message" as const, content: [{ type: "text" as const, text: userText }] },
];

const verdict = await guardEvents(
  arcjet,
  {
    events,
    inbound: {
      action: "message.received",
      rules: ({ text }) => [detectPromptInjection()(text)],
    },
    context: ctx,
  },
  (body) => client.beta.sessions.events.send(session.id, body),
);

if (!verdict.allowed) {
  return verdict.message;
}
```

The same helper gates `sessions.create({ initial_events })` — pass those
events and send them only on ALLOW.

## Step 3: Gate custom tools you execute

```ts
import { tokenBucket } from "@arcjet/guard";
import { guardCustomTool } from "@arcjet/guard/claude-managed-agents/v0";

import { arcjet } from "./arcjet.js";

const lookupLimit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});

if (event.type === "agent.custom_tool_use") {
  const gated = await guardCustomTool(
    arcjet,
    {
      event,
      execute: (input) => lookupOrder(input),
      send: (result) =>
        client.beta.sessions.events.send(session.id, { events: [result] }),
    },
    {
      action: "order.looked-up",
      rules: (input) => [lookupLimit({ key: String(input["orderNumber"]), requested: 1 })],
      context: ctx,
    },
  );
  if (gated.allowed) {
    await client.beta.sessions.events.send(session.id, {
      events: [{
        type: "user.custom_tool_result",
        custom_tool_use_id: event.id,
        content: [{ type: "text", text: JSON.stringify(gated.output) }],
      }],
    });
  }
}
```

Self-hosted: wrap `betaTool({ run })` with the same `guardCustomTool`
(pass the tool as the second argument). The CLI worker cannot register
custom tools.

## Step 4: Correlation

Mint (or load) a conversation id **the app owns**. Pass it to
`claudeManagedAgentsContext({ correlationId })`. Do not use Anthropic
`session.id` or event ids as if Arcjet created them. If the id is
missing or invalid, the call is uncorrelated rather than joined to a
generated id nobody has.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI (send is not called), a custom-tool deny (execute
   is not called; `user.custom_tool_result` with `is_error: true` is
   sent), a rate limit, and fail-closed (an unreachable guard).
3. Confirm in the Arcjet dashboard that decisions share the caller-owned
   conversation id — not an Anthropic session/event id you did not pass.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo belongs in
[`arcjet/examples`](https://github.com/arcjet/examples)
(follow-up; do not add an example under `examples/` in the JS SDK repo).

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
