---
name: integrate-arcjet-guard-eve
description: Integrate Arcjet security into a Vercel Eve agent using @arcjet/guard — add guard gates to tools and connections, screen inbound messages, and record agent lifecycle events correlated to the session. Use when asked to add Arcjet to an Eve agent, rate limit its tools, guard connection access, or screen inbound messages.
license: Apache-2.0
compatibility: Requires the target app to use Vercel Eve (eve >= 0.25.1 < 1) on Node.js >= 24.
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into a Vercel Eve agent

`@arcjet/guard`'s Vercel Eve v0 namespace wraps the agent's existing Arcjet
client. It never talks to the Arcjet API itself. Four surfaces, one decision
rule:

- **An authored tool** (`agent/tools/*.ts`) → `guardTool()` if you need its
  execution outcome at the call site, or `guardApproval()` if you only need to
  gate it. Only `guardTool` observes success or failure.
- **A connection's operations** (`agent/connections/*.ts`) → `guardApproval()`
  on the connection's `approval` field. There is no local `execute`; nothing
  else can gate these.
- **An inbound message** (`agent/channels/*.ts`) → `guardInbound()` to screen
  text before the agent sees it. This is the only place a turn can be declined
  before it starts.
- **Everything else** → `arcjetHooks()` to observe agent lifecycle events.
  Hooks are observe-only by design and cannot block.

The three in-session helpers correlate by session id, so their decisions land
on one Sequence. `guardInbound` runs before the session exists and correlates
by whatever identity the channel has, so its decision lands on a _second_
Sequence. `arcjetHooks` emits an `eve.session-started` record carrying both, which
is what lets you pivot from one to the other.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools and connections are **risky** (external side effects,
   irreversible, spends money, sends messages)? Those get gates. Purely
   informational tools can be left unguarded or gated with no `rules`.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`;
   "5 integrations/hour" → `slidingWindow`.)
3. Who is the **user** for metadata — an opaque user/tenant/installation ID
   (never PII)? Default: the Eve principal from the session context.
4. Is an Arcjet outage unacceptable? Should the agent be blocked if the guard
   is unavailable? Every helper defaults to `onGuardError: "deny"`, including
   the channel. Ask explicitly about the channel anyway: failing closed there
   means the agent stops answering entirely for the duration of the outage,
   so `"allow"` is a routine and legitimate choice at that one call site.

## The six things readers get wrong

State plainly why each applies to Eve, not other frameworks:

1. **Hooks cannot reject a turn.** Their handlers return `void`. If the request
   is "block prompt injection", the answer is `guardInbound` at the channel, not
   a hook. Hooks are for audit trails, not enforcement.

2. **The import path is versioned and there is no alias.** `@arcjet/guard/vercel-eve/v0`.
   `@arcjet/guard/vercel-eve` does not resolve, and neither does `/v1`. The segment
   tracks Eve's major, and Eve is pre-1.0, so it gets `v0`. When Eve ships 1.0,
   a `/v1` path will be added alongside this one.

3. **Correlation is not passed; it is read from the session.** Never call
   `createAgentContext` inside an Eve callback — the session id already is the
   run identity, and generating a second one splits the Sequence. `eveAgentContext`
   is exported for callers who need the context explicitly. Three of the four
   helpers call it themselves; `guardInbound` runs before the session exists,
   so it takes an explicit `correlationId` instead.

4. **`approval` is one function per tool or connection.** There is no composition
   with `always()`/`once()`/`never()` from `eve/tools/approval`. To require a
   human _in addition_ to the guard check, use `onAllow: "user-approval"`.

5. **`defineDynamic` tools are not covered.** Eve's compiler hoists a dynamic
   tool's inline `execute` to a module-scope step function, so a wrapper is not
   visible to it. Gate those with `guardApproval()` instead — the approval gate
   runs at decision time.

6. **A denial from `guardTool` throws** (Eve projects it as a failed `action.result`),
   whereas a denial from `guardApproval` is a `denied` status carrying a reason the
   model reads. Prefer the gate when you want the model to adapt; use `guardTool`
   when you need the outcome.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `eve` (optional peer, needed for
`@arcjet/guard/vercel-eve/v0` and must be on Node 24+). Every agent helper lives
on that one path. Always use explicit versions: `@arcjet/guard/vercel-eve/v0`
resolves, but `@arcjet/guard/vercel-eve` does not — omitting the version is
deliberate (it prevents silent API breaking changes when a new major version is
supported). Attempting to import from an unversioned path throws
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

```sh
npm install @arcjet/guard eve
```

**Note:** Eve requires Node.js >= 24. `@arcjet/guard` supports Node >= 22, but
the Eve integration does not. Verify the agent's `engines` declares `">=24"` or
note the floor in deployment docs.

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate authored tools

```ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/vercel-eve/v0";
import { tokenBucket } from "@arcjet/guard";

import { arcjet } from "../arcjet.js";

const lookupLimit = tokenBucket({
  bucket: "lookups",
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});

export default guardTool(
  arcjet,
  defineTool({
    description: "Look up an order by ID",
    inputSchema: z.object({ orderId: z.string() }),
    async execute(input) {
      return { orderId: input.orderId, status: "shipped" };
    },
  }),
  {
    action: "order.looked-up",
    rules: (input) => [lookupLimit({ key: input.orderId, requested: 1 })],
  },
);
```

- Omit `rules` to submit none. The guard call still happens, so the decision is
  correlatable and the tool can be managed via policy configured outside the
  code.
- `rules` may be a callback over the tool's parsed input, computed from the
  data being acted on.
- On DENY the tool's `execute` never runs; Eve projects it as a failed
  `action.result`. The model receives details about the denial.
- Guard policy unavailability: if the guard cannot be evaluated (e.g. Arcjet
  API unreachable), the default is `onGuardError: "deny"` — the tool is blocked
  and Eve reports the error. For read-only operations like lookups, set
  `onGuardError: "allow"` if availability matters more than enforcement.

**Tool-only:** `guardTool` is called at tool invocation time and observes the
outcome. If you only need to gate the tool without observing its result, use
`guardApproval()` instead — it is simpler and can be composed with Eve's native
`approval` field if the tool ever needs human sign-off.

## Step 3: Gate connection operations

```ts
import { defineOpenAPIConnection } from "eve/connections";
import { guardApproval } from "@arcjet/guard/vercel-eve/v0";
import { tokenBucket } from "@arcjet/guard";

import { arcjet } from "../arcjet.js";

const apiLimit = tokenBucket({
  bucket: "api-access",
  refillRate: 30,
  intervalSeconds: 60,
  maxTokens: 30,
});

export default defineOpenAPIConnection({
  description: "Orders API",
  spec: "https://api.example.com/openapi.json",
  approval: guardApproval(arcjet, {
    action: "orders-api.read",
    rules: (ctx) => [apiLimit({ key: ctx.session.id, requested: 1 })],
  }),
  operations: {
    allow: ["GetOrder"],
  },
});
```

- The `approval` callback receives the `ApprovalContext` which carries
  `session.id`, so you can key limits per user/session.
- On DENY the operation is blocked; Eve returns a `denied` status the model can
  read and adapt to. Contrast `guardTool`, which throws.
- This gate is the only way to protect connection operations — there is no
  middleware or hook alternative.

## Step 4: Screen inbound messages

```ts
import { defineChannel, POST } from "eve/channels";
import { guardInbound } from "@arcjet/guard/vercel-eve/v0";
import { detectPromptInjection } from "@arcjet/guard";

import { arcjet } from "../arcjet.js";

export default defineChannel({
  routes: [
    POST("/webhook", async (req, args) => {
      const body = (await req.json()) as Record<string, unknown>;
      const message = body.message as string | undefined;
      const conversationId = body.conversationId as string | undefined;

      if (!message || typeof message !== "string") {
        return new Response(JSON.stringify({ error: "Missing message" }), { status: 400 });
      }

      // Require a stable conversation identity. A generated or per-request id
      // joins to nothing, and `from()` would mint a new continuation every
      // time, so no session is ever resumed.
      if (!conversationId || typeof conversationId !== "string") {
        return new Response(JSON.stringify({ error: "Missing conversationId" }), { status: 400 });
      }

      // Authenticate the caller before trusting a body-supplied conversation
      // id: `from()` resolves it to whichever session currently owns that
      // address, so an unauthenticated route lets anyone post into — and read
      // the decisions of — a conversation whose id they can guess.
      //
      // The same value is the guard's correlation id and the channel-local
      // continuation address, which is what makes the two Sequences joinable.
      const correlationId = conversationId;
      const verdict = await guardInbound(arcjet, message, {
        rules: [detectPromptInjection()(message)],
        action: "message.received",
        correlationId,
      });

      if (!verdict.allowed) {
        return new Response(JSON.stringify({ error: verdict.message }), { status: 403 });
      }

      // Message passed; create a session and run the agent.
      const session = await args.from(correlationId).send(message, {
        auth: null,
      });

      return new Response(JSON.stringify({ success: true, sessionId: session.id }), {
        headers: { "Content-Type": "application/json" },
      });
    }),
  ],
});
```

- `guardInbound` is the only place in the agent's lifecycle where a turn can be
  declined _before_ it starts. Hooks are observe-only.
- The `correlationId` is passed explicitly and should be a value the app already
  has (request ID, session ID, a derived identifier). Pass it to `args.from()` to
  join the inbound decision with the agent's session in the Arcjet Console.
- On DENY the handler returns an HTTP error; the agent never runs.
- Guard policy unavailability: default is `onGuardError: "deny"` — if the guard
  cannot be evaluated, the message is rejected. This is the safe choice where
  the agent stops answering during an Arcjet outage. For channels where the human
  cost of rejecting a legitimate message exceeds the security cost of an outage,
  use `onGuardError: "allow"` to let it through anyway.

## Step 5: Record agent lifecycle events

```ts
import { defineHook } from "eve/hooks";
import { arcjetHooks } from "@arcjet/guard/vercel-eve/v0";

import { arcjet } from "../arcjet.js";

export default defineHook(arcjetHooks(arcjet));
```

This hook registers for Eve's session and tool lifecycle events and emits capture
events joined to the session's correlation ID. The hook is observe-only and cannot
block anything.

## Verify the integration

1. `npm run typecheck` passes; `npm run build` (or `eve build`) succeeds.
2. Exercise the agent with a test message or tool call.
3. Confirm in the Arcjet dashboard (`list-requests`, `list-guards`) that the
   tool and connection gate decisions and the lifecycle captures share the
   session id as their correlation id. The inbound decision is on its own
   Sequence, correlated by the conversation id; find the `eve.session-started`
   capture to pivot between the two. Eve namespaces continuation tokens per
   channel, so that record's `eve.continuation-token` reads
   `<channel-name>:<conversation-id>` rather than the bare id.
4. Trip a rate limit deliberately; confirm the model receives the denial and
   does not loop on retries (tools that throw) or attempts the operation (gates
   that deny).

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed, never
thrown.
