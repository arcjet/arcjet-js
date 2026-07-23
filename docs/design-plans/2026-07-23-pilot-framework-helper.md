# Pilot Framework Helper (`@arcjet/ai`) Design

## Summary

`@arcjet/ai` adds a thin instrumentation layer on top of the existing
`@arcjet/guard` client so that applications built on the Vercel AI SDK (v7)
can enforce security checks and emit audit events around model-invoked tool
calls and app-invoked actions, all tied together by a single correlation ID.
Rather than introducing a new runtime mechanism, the design threads a plain,
JSON-serializable context object (`ArcjetAiContext`) explicitly through the
call chain — HTTP route, Vercel Workflow input, `generateText`/`streamText`
call, and finally into each wrapped tool's `execute` — so the same correlation
ID can join an HTTP-level `protect()` decision, guard decisions on individual
tool calls, and capture events into one reconstructable "Sequence" in the
Arcjet Console. Of three approaches considered (a per-tool wrapper, a
loop-level decorator riding the AI SDK's native `toolApproval`, and an ambient
AsyncLocalStorage-based context), we chose the tool-wrapper approach because
it gives the model a readable denial reason, works unmodified across
`generateText`, `streamText`, `ToolLoopAgent`, and `WorkflowAgent`, and avoids
introducing a pattern (ambient context) that doesn't survive Workflow-step
serialization and doesn't otherwise exist in the codebase.

The work ships as three coordinated surfaces — `protectTool()` for
model-invoked tool calls (guard before `execute`, capture after,
deny-by-default with a structured denial result), `protectAction()` /
`captureAction()` for the same guard/capture semantics on non-tool application
code, and a `securityMetadata()` builder that standardizes the metadata
vocabulary attached to guard and capture calls. Delivery is split into
package/skill-file work done in this repo (arcjet-js) and a dogfood proof done
in the separate `review` repo, where the review bot is upgraded to AI SDK v7
and instrumented end to end as the first real-world validation that a
correlated Sequence of decisions and events can be reconstructed from a single
PR review run.

## Definition of Done

### Deliverables

1. **`@arcjet/ai` package** in arcjet-js targeting the Vercel AI SDK v7, providing:
   - Correlation-ID propagation through agent → tool → queue/workflow
     boundaries (ambient where possible, explicit carriage where serialization
     breaks context).
   - Security-metadata helpers with a vocabulary defined in this project
     (grounded in the Arcjet glossary at `arcjet/docs/GLOSSARY.md`, approved by
     @qw-in/@davidmytton at PR review).
   - Guard checks around tool calls and risky actions, **enforcing by
     default**: denied tool calls do not execute and the model receives a
     structured denial. Built on `guard()` and `capture()` (`capture()` is
     presumed available from @qw-in's parallel work).
2. **Agent skill file** so a coding agent can integrate a customer's Vercel AI
   SDK app with only minor clarifying questions.
3. **Example app** in arcjet-js showing route → agent/tool → queue/job →
   external action.
4. **Review bot integration PR** in the `review` repo (dogfood proof),
   including upgrading it from AI SDK v6 to v7 as a prerequisite.

### Success criteria

- A coding agent given the package + skill file (or a developer given the
  docs) can instrument a Vercel AI SDK v7 app with simple API calls analogous
  to using Arcjet guards or the standard protect SDK.
- After instrumentation, one review-bot run produces guard decisions and
  capture events joined into a single Sequence via correlation ID.

### Out of scope

- OTel span ingestion (nice-to-have only after the basics are fulfilled).
- Frameworks other than the Vercel AI SDK.
- Sequence policy evaluation, security trace UI, backend drains / SIEM
  delivery.
- Polished public launch docs.

## Acceptance Criteria

### pilot-framework-helper.AC1: Correlation context propagates end to end

- **pilot-framework-helper.AC1.1 Success:** `createAiContext()` with no
  arguments generates a valid correlation ID (ULID, ≤256 bytes printable
  ASCII).
- **pilot-framework-helper.AC1.2 Success:** a caller-supplied `correlationId`
  (e.g. `reviewId`) is preserved verbatim.
- **pilot-framework-helper.AC1.3 Failure:** an invalid correlation ID
  (>256 bytes or non-printable characters) is rejected at creation with a
  clear error — not truncated.
- **pilot-framework-helper.AC1.4 Success:** a context survives JSON
  serialization round-trip unchanged (the workflow-boundary case).
- **pilot-framework-helper.AC1.5 Success:** a context passed via
  `aiToolsContext()` arrives in a wrapped tool's `execute` and its
  `correlationId` reaches the `guard()` call.
- **pilot-framework-helper.AC1.6 Edge:** a wrapped tool invoked with no
  context still runs its guard check (uncorrelated) and logs a dev-mode
  warning.
- **pilot-framework-helper.AC1.7 Success:** an explicit `correlationId` in a
  tool policy overrides the context's.

### pilot-framework-helper.AC2: `protectTool` enforces by default

- **pilot-framework-helper.AC2.1 Success:** on ALLOW, the original `execute`
  runs and its result is returned unchanged.
- **pilot-framework-helper.AC2.2 Success:** on DENY, `execute` is never called
  and the tool result is an `ArcjetDenialResult` with the denial reason.
- **pilot-framework-helper.AC2.3 Success:** `guard()` receives `label` =
  policy action and metadata merged in order context ← policy ← per-call
  function.
- **pilot-framework-helper.AC2.4 Success:** after successful execution,
  `experimental_capture()` fires with the action, correlation ID, and merged
  metadata.
- **pilot-framework-helper.AC2.5 Success:** on the denied path, capture fires
  with a denied outcome referencing the guard decision ID.
- **pilot-framework-helper.AC2.6 Failure:** when the guard API errors, the
  tool fails open — `execute` runs, and the failure is observable (warning +
  `hasFailedOpen()`).
- **pilot-framework-helper.AC2.7 Success:** `onDeny` reshapes the denial
  payload the model sees.
- **pilot-framework-helper.AC2.8 Edge:** when `execute` throws, capture
  records an error outcome and the original error propagates unchanged.
- **pilot-framework-helper.AC2.9 Success:** in a `generateText` loop with a
  mock model, a denied tool call produces the denial result in the
  conversation and the loop continues.

### pilot-framework-helper.AC3: `protectAction` / `captureAction`

- **pilot-framework-helper.AC3.1 Success:** on ALLOW, `fn` runs and its return
  value is passed through.
- **pilot-framework-helper.AC3.2 Failure:** on DENY, `ArcjetDeniedError`
  (carrying the decision) is thrown and `fn` is never called.
- **pilot-framework-helper.AC3.3 Success:** capture fires after `fn` with the
  outcome (success/denied/error).
- **pilot-framework-helper.AC3.4 Success:** `captureAction` emits a capture
  event with the context's correlation ID and merged metadata.
- **pilot-framework-helper.AC3.5 Failure:** guard API errors fail open (`fn`
  runs).

### pilot-framework-helper.AC4: Metadata vocabulary

- **pilot-framework-helper.AC4.1 Success:** `securityMetadata()` maps each
  field to its documented wire key (`user`, `agent`, `workflow`, `data-class`,
  `destination`, `reversibility`, `resource`).
- **pilot-framework-helper.AC4.2 Success:** custom string values outside the
  suggested vocabularies pass through unchanged.
- **pilot-framework-helper.AC4.3 Edge:** undefined fields are omitted entirely
  (no empty-string keys).

### pilot-framework-helper.AC5: Example app

- **pilot-framework-helper.AC5.1 Success:** the example builds in CI and
  demonstrates route → workflow → guarded tool → guarded external action
  using the helpers.
- **pilot-framework-helper.AC5.2 Success:** a local run against a dev Arcjet
  site produces decisions and events sharing one correlation ID.

### pilot-framework-helper.AC6: Agent skill file

- **pilot-framework-helper.AC6.1 Success:** a fresh coding-agent session given
  only the skill file and a sample AI SDK v7 app completes the integration
  with only clarifying questions (manual verification, one recorded
  transcript).

### pilot-framework-helper.AC7: Review bot dogfood

- **pilot-framework-helper.AC7.1 Success:** the review bot runs on AI SDK v7
  with its test suite passing.
- **pilot-framework-helper.AC7.2 Success:** `loadSkill` is
  capture-instrumented; review submission and label changes are guarded; Slack
  notify is captured.
- **pilot-framework-helper.AC7.3 Success:** one dev/staging review run shows
  the `protect()` decision, guard decisions, and capture events joined by one
  correlation ID in the Console/MCP.

## Glossary

- **Vercel AI SDK (`ai` package, v6/v7)**: The third-party TypeScript SDK for
  building LLM applications (`generateText`, `streamText`, tool calling, agent
  loops) that `@arcjet/ai` is written against; this project targets its v7
  major.
- **`guard()` / `@arcjet/guard`**: The existing Arcjet client library that
  evaluates security rules (rate limiting, prompt injection detection, etc.)
  and returns a decision (ALLOW/DENY/ERROR). `@arcjet/ai` wraps calls to it
  rather than talking to the Arcjet API directly.
- **`capture()` / `experimental_capture()`**: An in-flight guard-client
  function that records an application fact (action, correlation ID, metadata)
  without making an enforcement decision — the "observe-only" half of the
  guard/capture pair this design builds on.
- **Correlation ID**: A single identifier (≤256 bytes, printable ASCII)
  threaded through a request/workflow/agent run so that every guard decision
  and capture event from that run can be joined together afterward.
- **ULID**: Universally Unique Lexicographically Sortable Identifier — the ID
  format used to auto-generate correlation IDs when the caller doesn't supply
  one.
- **Sequence**: The Arcjet Console's view that reconstructs a full run (all
  decisions and events sharing one correlation ID and site ID) as a single
  timeline.
- **Console / MCP (`list-guards`, `list-requests`)**: The Arcjet dashboard and
  its Model Context Protocol tool interface, used here to verify that a
  review-bot run produced a correlated Sequence.
- **`ArcjetDenialResult` / `ArcjetDeniedError`**: Types this package
  introduces to represent a DENY outcome — the former is returned as an
  ordinary tool result (so the model can read and react to it), the latter is
  thrown for non-tool app code where there's no model to hand a result to.
- **Fail open**: The safety posture where, if the guard API itself errors, the
  protected code still runs (rather than blocking) so a security helper can
  never be the reason an agent or app crashes.
- **`toolApproval`**: The AI SDK's own native mechanism for gating tool calls,
  considered and rejected as the primary integration surface because it only
  shows the model a bare denial with no reason text.
- **AsyncLocalStorage (ALS)**: A Node.js API for implicit ("ambient") context
  propagation without passing values explicitly; rejected for this design
  because it doesn't survive Vercel Workflow step serialization and isn't used
  elsewhere in this codebase.
- **Vercel Workflow / Workflow DevKit**: A framework for durable, serializable
  multi-step workflows (`"use workflow"` / `"use step"`); the design treats
  its serialization boundary as the reason context must be passed explicitly
  rather than ambiently.
- **`ToolLoopAgent` / `WorkflowAgent`**: AI SDK agent constructs that run
  tool-calling loops; called out to show the tool wrapper works unchanged
  across all of the SDK's execution modes.
- **`toolsContext` / `contextSchema`**: The AI SDK v7 mechanism for delivering
  a typed context value into a tool's `execute` function; this is the specific
  "slot" `@arcjet/ai`'s context rides in.
- **`MockLanguageModelV*`**: A test helper shipped by the AI SDK that
  simulates a language model's responses, used so this package's tests can
  exercise real `generateText` calls without hitting a real model.
- **OTel (OpenTelemetry) / OTel ADR**: An industry-standard
  tracing/observability format; referenced as a future direction (span
  ingestion, ambient correlation) that this pilot deliberately excludes but
  stays design-compatible with.
- **ADR (Architecture Decision Record)**: A written record of a prior design
  decision (e.g., "the OTel ADR," "the capture ADR") that this document treats
  as settled precedent to follow.
- **Dogfood**: Using the feature internally (here, instrumenting Arcjet's own
  review bot) as the real-world proof that the package works before wider
  release.
- **Dependency level (e.g., "level 4")**: An internal arcjet-js convention
  classifying packages by their position in the publish/release dependency
  graph, governing how `publish.yml` is wired.
- **`release-please`**: A tool that automates changelog/version-bump PRs from
  conventional commits; referenced via its manifest/config files as part of
  standard package scaffolding.
- **`tsdown` / `tsgo` / `isolatedDeclarations`**: Build and type-checking
  tools and a strict TypeScript compiler flag used by existing arcjet-js
  packages and followed here for consistency.
- **SKILL.md / skill file**: A portable, standardized format for packaging
  instructions an AI coding agent can follow to perform an integration; new to
  this repo, intended to later graduate to Arcjet's public skills repository.
- **Codemod**: An automated source-to-source transformation script (here,
  `@ai-sdk/codemod`) used to mechanically upgrade code from AI SDK v6 to v7.

## Architecture

`@arcjet/ai` is a thin instrumentation layer over `@arcjet/guard` for
applications built on the Vercel AI SDK v7. It never talks to the Arcjet API
itself; every check and event goes through the guard client the application
already launches. The package lives at `arcjet-ai/` in this monorepo and
publishes at the framework-integration level (level 4) alongside `@arcjet/next`
and friends.

Peer dependencies: `ai >= 7` and `@arcjet/guard` (broad ranges, per repo
convention). No dependency on the `workflow` package: the Vercel Workflow
boundary is crossed with plain serializable values, so the package works in and
outside Vercel Workflows.

### Chosen approach: tool wrapper

Three approaches were considered in brainstorming:

- **A. Tool wrapper (chosen):** wrap each protected tool; guard before
  `execute`, structured denial as the tool result, capture after.
- **B. Loop-level decorator:** one `withArcjet()` around the whole
  `generateText` config driving the AI SDK's native `toolApproval`. Rejected as
  primary surface: native denial shows the model only a bare
  `tool-output-denied` part (no reason text), and it couples the package to the
  call-level API shape.
- **C. Ambient AsyncLocalStorage runtime:** rejected for the pilot: ALS does
  not survive Workflow step serialization, has edge-runtime gotchas, and would
  be a novel pattern in a codebase that is explicit-context throughout. The
  context object's shape leaves room to layer ambience on later (the OTel ADR
  direction) without breaking changes.

The wrapper works identically under `generateText`, `streamText`,
`ToolLoopAgent`, and `WorkflowAgent`, because it changes only the tool's own
`execute` behavior.

### Components and contracts

**1. Security context** — the single carrier of correlation. A plain
JSON-serializable value, never a class or ambient store:

```ts
interface ArcjetAiContext {
  correlationId: string;              // ≤256 bytes printable ASCII, validated at creation
  metadata?: Record<string, string>;  // base metadata merged into every guard/capture
}

function createAiContext(init?: {
  correlationId?: string;             // e.g. an existing reviewId; auto-generated (ULID) if omitted
  metadata?: Record<string, string>;
}): ArcjetAiContext;

// Fans one context out to every Arcjet-wrapped tool's toolsContext slot.
function aiToolsContext(
  ctx: ArcjetAiContext,
  tools: ToolSet,
): Record<string, ArcjetAiContext>;
```

**Propagation is explicit, by value, hand to hand:**

- Route → workflow: the context rides as a field on the workflow input, which
  the Workflow DevKit already serializes and persists.
- Workflow step → agent loop: `generateText({ ..., toolsContext:
  aiToolsContext(ctx, tools) })` — the AI SDK's v7 context system carries it.
- Loop → tool: the AI SDK delivers it to each wrapped tool's `execute` as
  `options.context`, validated against the `contextSchema` the wrapper
  declares.
- Explicit wins: a `correlationId` supplied directly in a policy or call
  overrides the context's (per the OTel ADR rule).
- Missing context degrades gracefully: guard checks run uncorrelated and a
  dev-mode warning is logged.

**2. Tool protection** — guard-gated execution for model-invoked actions:

```ts
function protectTool<T extends Tool>(client: ArcjetGuard, tool: T, policy: {
  action: string;                     // guard label + capture action, "resource.verb" past tense
  rules?: RuleWithInput[] | ((input: ToolInput<T>) => RuleWithInput[]);
  metadata?: Record<string, string> | ((input: ToolInput<T>) => Record<string, string>);
  correlationId?: string;             // explicit override; normally from context
  onDeny?: (decision: DecisionDeny) => unknown;  // reshape the denial tool-result
}): T;  // same input schema; output becomes ToolOutput<T> | ArcjetDenialResult

interface ArcjetDenialResult {
  arcjetDenied: true;
  reason: string;                     // "RATE_LIMIT", "PROMPT_INJECTION", ...
  message: string;                    // human/model-readable explanation
  retryable: boolean;
  retryAfterSeconds?: number;
}
```

Execution order per tool call: read context → `guard({ label: action, rules,
correlationId, metadata })` → on DENY return `ArcjetDenialResult` as the tool
result (the model reads why and adapts; `execute` never runs) → on ALLOW run
`execute` → fire-and-forget `experimental_capture()` recording the outcome.
Both paths capture: denials capture with a denied outcome and the guard
decision id, per the capture ADR's facts-first posture. Guard API errors fail
open (a security helper must not take the agent down); the decision records
the failure.

Metadata merge order: context base ← policy ← per-call function output.

**3. Action protection** — same semantics for app-invoked (non-tool) code such
as workflow steps that post to GitHub:

```ts
function protectAction<T>(client: ArcjetGuard, ctx: ArcjetAiContext, policy: {
  action: string;
  rules?: RuleWithInput[];
  metadata?: Record<string, string>;
}, fn: () => Promise<T>): Promise<T>;   // DENY throws ArcjetDeniedError (carries the decision)

function captureAction(client: ArcjetGuard, ctx: ArcjetAiContext, opts: {
  action: string;
  metadata?: Record<string, string>;
}): void;                               // observe-only sugar over experimental_capture
```

`protectAction` throws on DENY because there is no model to hand a structured
denial to; the caller decides whether to catch, skip, or abort. The decision
rule the skill file teaches: **model-invoked → `protectTool`; app-invoked →
`protectAction`; observe-only → `captureAction`.** All three converge on
identical guard/capture wire shapes.

**4. Metadata vocabulary** — a documented key convention plus typed builder
over guard's existing `metadata: Record<string, string>` (max 20 pairs). Not a
protocol change; stays alignable with the in-flight identity-fields schema by
renaming keys in types/docs only:

```ts
function securityMetadata(fields: {
  user?: string;          // whose authority the agent acts under (opaque ID, not PII)
  agent?: string;         // which automated actor: "review-bot"
  workflow?: string;      // logical workflow name: "pr-review"
  dataClass?: "public" | "internal" | "confidential" | "regulated" | (string & {});
  destination?: string;   // where data/effects go: "github", "slack", "internal"
  reversibility?: "reversible" | "compensable" | "irreversible";
  resource?: string;      // what's acted on: "repo:owner/name#123"
}): Record<string, string>;
```

The `action` dimension is not a metadata key — it is the guard `label` /
capture `action`. Suggested-vocabulary unions stay open (`(string & {})`)
except `reversibility`, the one dimension policies will most likely branch on.
Key names are subject to approval by @qw-in/@davidmytton at PR review.

### Data flow (review bot pilot path)

```
GitHub webhook route            createAiContext({ correlationId: reviewId })
  │  protect(..., { correlationId })          ── joins the HTTP decision to the run
  ▼
start(reviewWorkflow, [{ ...input, arcjet: ctx }])   ── serialized workflow input
  ▼
stepRunReview: generateText({ tools: { loadSkill: protectTool(...) },
                              toolsContext: aiToolsContext(ctx, tools) })
  ▼
stepSubmitReview: protectAction(client, ctx, { action: "review.submitted",
                              rules: [...], metadata }, () => octokit...)
  ▼
stepNotifyNeedsReview: captureAction(client, ctx, { action: "notification.sent" })
```

Every decision and event carries the same `correlationId`, so the Console's
Sequence view (`site_id` + `correlation_id`) reconstructs the run end to end.

## Existing Patterns

**Followed:**

- **Package conventions** (`arcjet-guard/`, `redact/`, `sensitive-info-rampart/`
  as references): ESM-only, `tsdown` build, `tsgo --noEmit` typecheck, Node
  built-in test runner with coverage, strict tsconfig with
  `isolatedDeclarations`, source in `src/` with colocated `*.test.ts`, release
  wiring via `.github/.release-please-manifest.json`,
  `.github/release-please-config.json`, and `publish.yml` dependency level 4.
- **Peer dependency style**: broad ranges (`next: >=13`, `fastify: >=5`
  precedent) → `ai: >=7`.
- **Guard client usage** (`arcjet-guard/src/index.ts`): client launched once at
  module scope and passed in; `@arcjet/ai` accepts the client rather than
  launching its own.
- **Explicit context passing**: the review bot threads a `LogContext` object
  through its workflow already; `ArcjetAiContext` follows the identical
  pattern. No AsyncLocalStorage exists anywhere in arcjet-js — this design
  deliberately keeps it that way for the pilot.
- **Examples conventions** (`examples/`): framework-named directory,
  single-purpose app, `.env.local.example`, README, dependabot + example CI
  workflow wiring.

**New patterns introduced:**

- **Agent skill file in the repo** — no skill files exist in arcjet-js today.
  The skill ships in the standard portable skill format (SKILL.md) so it can
  graduate to Arcjet's public skills repository unchanged when `@arcjet/ai` is
  ready for public use.
- **AI SDK tool wrapping** — first framework helper targeting a non-HTTP
  framework; the adapter naming convention (`arcjet-FRAMEWORK` → `@arcjet/ai`)
  still applies.

**Upstream dependency:** `experimental_capture()` exists in arcjet-guard (main
branch, commits `fe02cf1bc`, `0e9e5bcad`, `1cd60fc5b`) with shape
`{ action, correlationId?, occurredAt? }` — dogfood-grade, which matches this
project's pilot posture. Metadata on capture events depends on @qw-in's
in-flight work; if capture metadata is not available in time, the helper
captures without metadata and the design notes the gap.

## Implementation Phases

<!-- START_PHASE_1 -->
### Phase 1: Package scaffolding

**Goal:** `@arcjet/ai` exists as a buildable, publishable workspace package.

**Components:**
- `arcjet-ai/` package: `package.json` (ESM, exports map, peer deps `ai >= 7` +
  `@arcjet/guard`), `tsconfig.json`, `tsdown.config.ts`, `src/index.ts` stub,
  README stub, LICENSE
- Release wiring: `.github/.release-please-manifest.json`,
  `.github/release-please-config.json` (component + linked-versions),
  `.github/workflows/publish.yml` at dependency level 4

**Dependencies:** None (first phase).

**Done when:** `npm install` succeeds at the root, `npm run build --workspace
@arcjet/ai` and `npm run typecheck --workspace @arcjet/ai` succeed, CI passes.
<!-- END_PHASE_1 -->

<!-- START_PHASE_2 -->
### Phase 2: Security context and metadata vocabulary

**Goal:** Correlation and metadata primitives every other component consumes.

**Components:**
- `ArcjetAiContext` type, `createAiContext()` (ULID generation, correlation-ID
  validation matching the server rules: ≤256 bytes printable ASCII, reject
  don't truncate), in `arcjet-ai/src/`
- `securityMetadata()` builder and the documented key convention
- `aiToolsContext()` fan-out helper (depends on the wrapped-tool contract from
  Phase 3 only via the context slot name — kept here because it is pure
  context plumbing)

**Covers:** pilot-framework-helper.AC1.1–AC1.4, AC1.7, AC4.1–AC4.3

**Dependencies:** Phase 1.

**Done when:** tests pass verifying the listed ACs.
<!-- END_PHASE_2 -->

<!-- START_PHASE_3 -->
### Phase 3: `protectTool`

**Goal:** Guard-gated, capture-emitting AI SDK tool wrapping — the package's
core.

**Components:**
- `protectTool()` in `arcjet-ai/src/`: contextSchema declaration, guard-before-
  execute, `ArcjetDenialResult` on DENY, `onDeny` hook, capture-after with
  outcome (success/denied/error), fail-open on guard API errors, metadata
  merge (context ← policy ← per-call)
- Tests using a stubbed `ArcjetGuard` client and real `ai@7` `generateText`
  with a mock language model (the AI SDK ships `MockLanguageModelV*` test
  helpers)

**Covers:** pilot-framework-helper.AC1.5, AC1.6, AC2.1–AC2.8

**Dependencies:** Phase 2.

**Done when:** tests pass verifying the listed ACs, including an integration
test where a mock model's tool call is denied and the denial result appears in
the conversation.
<!-- END_PHASE_3 -->

<!-- START_PHASE_4 -->
### Phase 4: `protectAction` and `captureAction`

**Goal:** The non-tool enforcement and observe-only surfaces.

**Components:**
- `protectAction()` (throws `ArcjetDeniedError` on DENY, capture with outcome),
  `captureAction()`, `ArcjetDeniedError` in `arcjet-ai/src/`

**Covers:** pilot-framework-helper.AC3.1–AC3.5

**Dependencies:** Phase 2 (context/metadata); shares internals with Phase 3.

**Done when:** tests pass verifying the listed ACs.
<!-- END_PHASE_4 -->

<!-- START_PHASE_5 -->
### Phase 5: Example app

**Goal:** Runnable reference for the canonical route → agent/tool →
queue/job → external action path.

**Components:**
- `examples/` app (Next.js + `ai@7` + `workflow`): route creates context and
  starts a workflow; one step runs `generateText` with a `protectTool`-wrapped,
  rate-limited tool; a later step performs a mock external action behind
  `protectAction`; `captureAction` annotates a side effect
- Example CI wiring (dependabot, reusable-examples workflow)

**Covers:** pilot-framework-helper.AC5.1, AC5.2

**Dependencies:** Phases 2–4.

**Done when:** example builds in CI; a local run against a dev Arcjet site
produces correlated decisions and events.
<!-- END_PHASE_5 -->

<!-- START_PHASE_6 -->
### Phase 6: Agent skill file and docs

**Goal:** A coding agent (or a developer reading the README) can perform the
integration unaided.

**Components:**
- `SKILL.md` in standard portable skill format (pilot home: `arcjet-ai/skills/`;
  graduates to Arcjet's public skills repo at public release): integration
  recipe (find/launch guard client; wrap tools; wrap actions; thread context
  through workflow inputs to `toolsContext`), the model-invoked/app-invoked/
  observe-only decision rule, the questions to ask the human (which actions are
  risky, what limits, who is `user`), recommended system-prompt line for
  denials
- `arcjet-ai/README.md` with the same recipe for humans, JSDoc on all exports

**Covers:** pilot-framework-helper.AC6.1

**Dependencies:** Phases 2–5 (documents what exists).

**Done when:** a fresh coding-agent session given only the skill file and a
sample app completes an integration with only clarifying questions (manual
verification, one recorded transcript).
<!-- END_PHASE_6 -->

<!-- START_PHASE_7 -->
### Phase 7: Review bot AI SDK v7 upgrade (in `../review`)

**Goal:** The dogfood app is on the SDK major the helper targets.

**Components (in the `review` repository, not this repo):**
- `ai` 6.0.190 → 7.x via `npx @ai-sdk/codemod v7` plus manual fixes:
  `system` → `instructions`, lifecycle/callback renames, result aggregation
  changes in `lib/review-engine.ts`, `workflows/index.ts`
- Verify Node ≥22 runtime and `workflow` package compatibility

**Dependencies:** None on Phases 1–6 (can run in parallel).

**Done when:** review bot test suite passes; a staging review run completes
end to end on v7.
<!-- END_PHASE_7 -->

<!-- START_PHASE_8 -->
### Phase 8: Review bot instrumentation (in `../review`)

**Goal:** The dogfood proof — one PR review run is a single correlated
Sequence.

**Components (in the `review` repository):**
- Webhook route: `createAiContext({ correlationId: reviewId })`, context added
  to `ReviewWorkflowInput`, `correlationId` passed to the existing `protect()`
  call
- `stepRunReview`: `loadSkill` wrapped with `protectTool` (capture-only),
  `toolsContext` passed to `generateText`
- `stepSubmitReview` + label steps: `protectAction` (rate-limited,
  `destination: "github"`, `reversibility` set); `stepNotifyNeedsReview`:
  `captureAction`; existing prompt-injection guard gains the `correlationId`

**Covers:** pilot-framework-helper.AC7.1–AC7.3

**Dependencies:** Phases 2–4, 7.

**Done when:** review bot tests pass; one dev/staging review run shows the
`protect()` decision, guard decisions, and capture events sharing one
correlation ID (verified via Console or MCP `list-guards`/`list-requests`).
<!-- END_PHASE_8 -->

## Additional Considerations

**Implementation scoping:** Phases 1–6 execute in arcjet-js; Phases 7–8
execute in the separate `review` repository and should become their own
implementation plan there (this design document is the shared source for
both).

**Denial retry behavior:** because a denial is an ordinary tool result, a
model may re-attempt the call. The denial payload carries
`retryable`/`retryAfterSeconds`, and the skill file recommends a one-line
system-prompt addition (mirroring Vercel's own guidance for native
`toolApproval` denials). Rate-limit rules make repeated attempts self-limiting.

**Failure posture:** guard API errors fail open everywhere (matching guard's
`hasFailedOpen()` semantics); capture is fire-and-forget and never throws.
The helper must never be the reason an agent run dies.

**Future extensibility (explicitly out of scope now):** an ambient
(AsyncLocalStorage) context layer can sit on top of `ArcjetAiContext` without
changing its shape, per the OTel ADR's ambient-correlation direction; a
loop-level `withArcjet()` convenience (approach B) can be added later reusing
the same policies; OTel span ingestion joins on the same correlation ID.

**Version churn risk:** the AI SDK has shipped two majors in ~a year (v6 →
v7). The package touches only small, stable-looking surfaces (`tool()` shape,
`toolsContext`/`contextSchema`) to minimize breakage; the peer range starts at
`>=7 <8` and widens deliberately, not automatically.
