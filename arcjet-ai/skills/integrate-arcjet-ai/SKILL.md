---
name: integrate-arcjet-ai
description: Integrate Arcjet security into a Vercel AI SDK (v7) application using @arcjet/ai — wrap agent tools with guard checks, enforce rules on risky app actions, and emit audit events joined by one correlation ID. Use when asked to add Arcjet to an AI SDK app, protect or rate limit agent tool calls, guard AI agent actions, or audit what an agent did.
license: Apache-2.0
compatibility: Requires the target app to use the Vercel AI SDK (`ai` >= 7) on Node.js >= 22.
metadata:
  author: arcjet
---

# Integrate `@arcjet/ai` into a Vercel AI SDK app

`@arcjet/ai` wraps the app's existing `@arcjet/guard` client. It never talks
to the Arcjet API itself. Three surfaces, one decision rule:

- **Model-invoked** (the LLM decides to call a tool) → `protectTool()`
- **App-invoked** (your code performs a risky action) → `protectAction()`
- **Observe-only** (record that something happened) → `captureAction()`

All three attach the same correlation ID so the Arcjet Console reconstructs
the whole run as one Sequence.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tool calls / actions are **risky** (external side effects,
   irreversible, spends money, sends messages)? Those get rules. Purely
   informational ones get capture-only wrapping (no `rules`).
2. What **limits**? (e.g. "10 lookups/min per user" → `tokenBucket`;
   "5 posts/min" → `slidingWindow`.)
3. Who is the **user** for metadata — an opaque user/tenant/installation ID
   (never PII)?
4. Is there an existing **run identifier** (request ID, job ID, review ID)
   to use as the correlation ID? Default: auto-generated ULID.

## Step 1: Install and find the guard client

`@arcjet/ai` peer-depends on `@arcjet/guard` and `ai` (>= 7) — install all
three:

```sh
npm install @arcjet/ai @arcjet/guard ai
```

If the app has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";
export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Create the context at the run's entry point

In the HTTP route / job handler / webhook that starts the run:

```ts
import { createAiContext, securityMetadata } from "@arcjet/ai";

const ctx = createAiContext({
  correlationId: existingRunId, // omit to auto-generate a ULID
  metadata: securityMetadata({ agent: "support-agent", workflow: "support-request", user: userId }),
});
```

Constraints: correlation IDs are 1–256 characters of printable ASCII;
invalid values throw at creation.

## Step 3: Thread the context explicitly

The context is a plain JSON-serializable object. Pass it hand to hand — as a
field on queue payloads and workflow inputs (it survives serialization).
Never stash it in module state or AsyncLocalStorage.

## Step 4: Wrap model-invoked tools

```ts
import { protectTool } from "@arcjet/ai";
import { tokenBucket } from "@arcjet/guard";

const lookupLimit = tokenBucket({ bucket: "lookups", refillRate: 5, intervalSeconds: 60, maxTokens: 10 });

const tools = {
  lookupOrder: protectTool(arcjet, lookupOrderTool, {
    action: "order.looked-up", // "resource.verb", past tense
    rules: () => [lookupLimit({ key: userId, requested: 1 })],
    metadata: (input) => securityMetadata({ resource: `order:${input.orderNumber}` }),
  }),
};
```

- Omit `rules` for capture-only wrapping (audit without enforcement).
- On DENY the tool's `execute` never runs; the model receives a structured
  denial result (`arcjetDenied`, `reason`, `message`, `retryable`,
  `retryAfterSeconds`) it can read and adapt to. Reshape it with `onDeny`.
- Guard API failures fail open: the tool still runs, a warning is logged
  when `ARCJET_LOG_LEVEL=warn`.
- Pilot limitation: `protectTool` throws if the tool already declares its
  own `contextSchema`.

## Step 5: Deliver the context to the tools

```ts
import { aiToolsContext } from "@arcjet/ai";

const result = await generateText({
  model,
  instructions:
    systemPrompt +
    " If a tool call is denied by security policy, do not retry it; explain the denial to the user or try a different approach.",
  prompt,
  tools,
  toolsContext: aiToolsContext(ctx, tools),
  stopWhen: stepCountIs(5),
});
```

Works identically with `streamText` and `ToolLoopAgent`, and inside a Vercel
Workflow (`"use workflow"`) as the example shows — the wrapper only changes the
tool's own behavior. Always add the denial
line to the system prompt (shown above).

**The compiler will NOT catch a missing `toolsContext`.** The injected
context type includes `undefined` (so uncorrelated calls still run, fail-open),
which makes the `toolsContext` option optional at the type level. Forget it and
guard checks run uncorrelated with only a `console.warn` (gated behind
`ARCJET_LOG_LEVEL`) as the signal — so always run once with
`ARCJET_LOG_LEVEL=warn` and confirm correlation before shipping.

## Step 6: Wrap app-invoked actions; capture side effects

```ts
import { ArcjetDeniedError, captureAction, protectAction } from "@arcjet/ai";

await protectAction(
  arcjet,
  ctx,
  {
    action: "review.submitted",
    rules: [submitLimit({ key: repoId })],
    metadata: securityMetadata({ destination: "github", reversibility: "compensable" }),
  },
  () => octokit.pulls.createReview(...),
);

captureAction(arcjet, ctx, {
  action: "notification.sent",
  metadata: securityMetadata({ destination: "slack" }),
});
```

`protectAction` throws `ArcjetDeniedError` (carrying the decision) on DENY —
decide with the human whether to catch-and-skip or let it abort.

## Metadata vocabulary

Use `securityMetadata()` keys consistently: `user` (whose authority — opaque
ID), `agent` (which automated actor), `workflow` (logical workflow name),
`dataClass` (`public`/`internal`/`confidential`/`regulated`), `destination`
(where effects go: `github`, `slack`, `internal`), `reversibility`
(`reversible`/`compensable`/`irreversible`), `resource` (what's acted on,
e.g. `repo:owner/name#123`). The `action` is not metadata — it is the guard
label / capture action: `resource.verb` past tense, validated server-side as
a slug (lowercase letters, digits, dash, and dot only — no underscores or
uppercase). Use `order.looked-up`, not `order.looked_up`.

Guard caps metadata server-side (max 20 pairs, key ≤64 bytes, value ≤512
bytes), so keep maps small — merging `ctx.metadata` with per-call
`securityMetadata()` can quietly exceed 20 pairs and the extras are dropped.

## Verify the integration

1. `tsc --noEmit` (or the app's typecheck) passes.
2. Run the app with `ARCJET_LOG_LEVEL=warn`; exercise the agent.
3. Confirm in the Arcjet dashboard (or MCP `list-guards`) that the run's
   decisions share the expected correlation ID.
4. Trip a rate limit deliberately; confirm the model receives the denial
   and does not loop on retries.

Note: capture events require a `@arcjet/guard` version that ships
`experimental_capture()`; on older versions `@arcjet/ai` skips them with a
warning — guard decisions still correlate.
