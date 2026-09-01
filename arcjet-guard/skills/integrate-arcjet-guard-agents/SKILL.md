---
name: integrate-arcjet-guard-agents
description: Integrate Arcjet security into a Vercel AI SDK (v7) application using @arcjet/guard — wrap agent tools with guard checks, enforce rules on risky app actions, and emit audit events joined by one correlation ID. Use when asked to add Arcjet to an AI SDK app, protect or rate limit agent tool calls, guard AI agent actions, or audit what an agent did.
license: Apache-2.0
compatibility: Requires the target app to use the Vercel AI SDK (`ai` >= 7) on Node.js >= 22.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/guard"
  library_version: "1.11.0" # x-release-please-version
sources:
  - README.md
---

# Integrate Arcjet Guard into a Vercel AI SDK app

`@arcjet/guard`'s Vercel AI v7 namespace wraps the app's existing Arcjet
client. It never talks to the Arcjet API itself. Three surfaces, one decision
rule:

- **Model-invoked** (the LLM decides to call a tool) → `guardTool()`
- **App-invoked** (your code performs a risky action) → `guardAction()`
- **Observe-only** (record that something happened) → `captureAction()`

All three attach the same correlation ID so the Arcjet Console reconstructs
the whole run as one Sequence.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tool calls / actions are **risky** (external side effects,
   irreversible, spends money, sends messages)? Those get rules. Purely
   informational ones can be wrapped with no `rules` (recorded, nothing
   enforced locally) or left to `captureAction()`.
2. What **limits**? (e.g. "10 lookups/min per user" → `tokenBucket`;
   "5 posts/min" → `slidingWindow`.)
3. Who is the **user** for metadata — an opaque user/tenant/installation ID
   (never PII)?
4. Is there an existing **run identifier** (request ID, job ID, review ID)
   to use as the correlation ID? Default: auto-generated ULID.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `ai` and `@ai-sdk/provider-utils`
(optional peers, needed only for `@arcjet/guard/vercel-ai/v7`). Every agent
helper lives on that one path. Always use explicit versions:
`@arcjet/guard/vercel-ai/v7` resolves, but `@arcjet/guard/vercel-ai` does not —
omitting the version is deliberate (it prevents silent API breaking changes
when a new major version is supported). Attempting to import from an
unversioned path throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.

```sh
npm install @arcjet/guard ai @ai-sdk/provider-utils
```

If the app has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";
export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Create the context at the run's entry point

In the HTTP route / job handler / webhook that starts the run:

```ts
import { createAgentContext, securityMetadata } from "@arcjet/guard/vercel-ai/v7";

const ctx = createAgentContext({
  correlationId: existingRunId, // omit to auto-generate a ULID
  metadata: securityMetadata({ agent: "support-agent", workflow: "support-request", user: userId }),
});
```

Constraints: correlation IDs are 1–256 characters of printable ASCII;
invalid values throw at creation.

The `correlationId` joins every guard decision and capture event from one
logical run **or session** into a single sequence in the Arcjet console, so
the best value is an ID the app already has and can search by (request ID,
job ID, ticket ID, review ID). Omit it and a ULID is generated.

## Step 3: Thread the context explicitly

The context is a plain JSON-serializable object. Pass it hand to hand — as a
field on queue payloads and workflow inputs (it survives serialization).
Never stash it in module state or AsyncLocalStorage.

## Step 4: Wrap model-invoked tools

```ts
import { guardTool, securityMetadata } from "@arcjet/guard/vercel-ai/v7";
import { tokenBucket } from "@arcjet/guard";

const lookupLimit = tokenBucket({ bucket: "lookups", refillRate: 5, intervalSeconds: 60, maxTokens: 10 });

const tools = {
  lookupOrder: guardTool(arcjet, lookupOrderTool, {
    action: "order.looked-up", // "resource.verb", past tense
    rules: ({ orderNumber }) => [lookupLimit({ key: `order:${orderNumber}`, requested: 1 })],
    // securityMetadata() maps the flat vocabulary to wire keys, so its fields
    // are strings. Nested values go alongside it in the raw metadata object.
    metadata: (input) => ({
      ...securityMetadata({ resource: `order:${input.orderNumber}`, user: userId }),
      caller: { id: userId, role: "customer" },
    }),
  }),
};
```

- Omit `rules` to submit none. The guard call still happens, so the decision is
  correlatable and the call site stays reachable by policy configured outside
  the code — but it costs a round trip. Use `captureAction()` instead when you
  want a record and no decision.
- `rules` may be a callback over the tool's parsed input, computed from the
  data being acted on — here, keying the rate limit on the specific order
  being looked up.
- On DENY the tool's `execute` never runs; the model receives a structured
  denial result carrying the deciding rule's own `reason` — for the
  `tokenBucket` above that is `reason: "RATE_LIMIT"`, `retryable: true`, and a
  computed `retryAfterSeconds`. Only rate-limit denials are retryable; every
  other reason reports `retryable: false` and no backoff hint. Reshape it with
  `onDeny`.
- Guard policy unavailability: if the guard cannot be evaluated (e.g. Arcjet
  API unreachable), the default is `onGuardError: "deny"` — the tool is blocked
  and the model receives `reason: "ERROR"` with `retryable: true` and a fixed
  `retryAfterSeconds: 5` backoff hint. For read-only operations like lookups,
  set `onGuardError: "allow"` if availability matters more than enforcement: the
  tool executes normally and the model receives its ordinary output.
- Pilot limitation: `guardTool` throws if the tool already declares its
  own `contextSchema`.
- **Alternative form:** calling `guardAction` directly inside the tool's
  `execute` block is also supported and keeps control flow visible, but
  requires threading the context in by hand. `guardTool` wrapping extracts it
  automatically via the injected `contextSchema`.

## Step 5: Deliver the context to the tools

```ts
import { aiToolsContext } from "@arcjet/guard/vercel-ai/v7";

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
guard checks run uncorrelated: the first uncorrelated call always warns, but
further ones are silent unless `ARCJET_LOG_LEVEL` is set — so run once with
`ARCJET_LOG_LEVEL=warn` and confirm correlation before shipping.

## Step 6: Wrap app-invoked actions; capture side effects

```ts
import {
  ArcjetDeniedError,
  ArcjetGuardUnavailableError,
  captureAction,
  guardAction,
} from "@arcjet/guard/vercel-ai/v7";

try {
  await guardAction(
    arcjet,
    ctx,
    {
      action: "review.submitted",
      rules: [submitLimit({ key: repoId })],
      metadata: securityMetadata({ destination: "github", reversibility: "compensable" }),
    },
    async () => {
      // Example: calling an external service (e.g. GitHub API client)
      return await externalServiceClient.pulls.createReview({
        owner: repoOwner,
        repo: repoName,
        pull_number: prNumber,
        body: reviewText,
      });
    },
  );
} catch (error) {
  if (error instanceof ArcjetDeniedError) {
    // A rule denied the call. Tell the user why; do not retry.
    console.warn("denied:", error.decision.reason);
  } else if (error instanceof ArcjetGuardUnavailableError) {
    // The policy could not be evaluated. Distinct from a denial, and usually
    // the one worth alerting on.
    console.warn("policy unavailable for:", error.action);
  } else {
    throw error;
  }
}

captureAction(arcjet, ctx, {
  action: "notification.sent",
  metadata: securityMetadata({ destination: "slack" }),
});
```

`guardAction` throws `ArcjetDeniedError` (carrying the decision) on DENY and
`ArcjetGuardUnavailableError` (carrying the decision or cause) when the guard
policy could not be evaluated — decide with the human whether to catch-and-skip
or let it abort. The two error types are distinct so an unavailable guard can be
alerted on separately from a DENY decision. `ArcjetGuardUnavailableError` carries
`cause` (the guard call threw) or `decision` (a decision failed open), making the
two distinguishable in a handler. The fail-closed tool result carries a fixed
`retryAfterSeconds: 5` backoff hint. The capture `outcome` on that path is
`"unavailable"`, not `"denied"`, so an operator can query the two separately. The
layering resolves a potential confusion: the core `@arcjet/guard` client still
fails open by construction and *reports* it via `hasFailedOpen()`; these helpers
*decide* to block on it.

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

Metadata accepts any JSON-serializable value — nested objects and arrays
included. The server enforces the following limits, dropping keys that exceed
them and reporting each drop on `decision.warnings`:

| Limit | Value | Over the limit |
|---|---|---|
| Top-level keys | 128 | extra keys dropped |
| Serialized bytes per value | 4 KiB | that key dropped |
| Nesting depth per value | 10 | that key dropped |
| Key names | letters, digits, `-`, `.`, `_` | that key dropped |

Nothing about metadata can fail a call or change a decision; it is excluded
from fingerprinting. Metadata is untrusted and **not redacted** — no secrets
or PII. Numbers are float64, so integers above `Number.MAX_SAFE_INTEGER`
should be passed as strings. The SDK adds `AJ1017` warnings naming values it
could not encode (`undefined`, a function, a `BigInt`, a circular reference).

## Verify the integration

1. `tsc --noEmit` (or the app's typecheck) passes.
2. Run the app with `ARCJET_LOG_LEVEL=warn`; exercise the agent.
3. Confirm in the Arcjet dashboard (or MCP `list-guards`) that the run's
   decisions and capture events share the expected correlation ID.
4. Trip a rate limit deliberately; confirm the model receives the denial
   and does not loop on retries.

Note: capture is fire-and-forget and batched, so events can lag the decisions
they accompany by a few seconds. A dropped event is diagnosed, never thrown.
