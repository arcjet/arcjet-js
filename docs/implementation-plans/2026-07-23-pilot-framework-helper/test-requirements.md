# Pilot Framework Helper (`@arcjet/ai`) — Test Requirements

Maps every in-scope acceptance criterion (AC1–AC6, all prefixed
`pilot-framework-helper.`) from
`docs/design-plans/2026-07-23-pilot-framework-helper.md` to either an
automated test or documented human verification.

Conventions honored:

- **Greppable AC ids:** each automated test's description string names its AC
  id (e.g. `"AC2.2: ..."`), so `grep -r "AC2.2" arcjet-ai/test/` finds it.
- **Test files run against built `dist/`** (repo convention; the `test` script
  builds first).
- Verification types: **automated (unit)** — stubbed guard client, direct
  calls; **automated (integration)** — real `ai@7` `generateText` +
  `MockLanguageModelV4` + stub guard client; **automated (operational)** — CI
  build/typecheck, no assertions in a test file; **human** — manual procedure
  with recorded evidence.

## Out of scope

The design's **pilot-framework-helper.AC7** group (review-bot dogfood: AC7.1–
AC7.3) is out of scope for this plan — it belongs to the separate `review`
repository's implementation plan (design Phases 7–8) and is verified there.

---

## AC1: Correlation context propagates end to end

| Criterion | Text | Type | Test file (phase/task) | Assertion |
| --- | --- | --- | --- | --- |
| AC1.1 | **Success:** `createAiContext()` with no arguments generates a valid correlation ID (ULID, ≤256 bytes printable ASCII). | automated (unit) | `arcjet-ai/test/context.test.ts` (Phase 2, Task 2) | `createAiContext()` returns `correlationId` matching `/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/`; two consecutive calls differ; ID satisfies the printable-ASCII ≤256 rule. |
| AC1.2 | **Success:** a caller-supplied `correlationId` (e.g. `reviewId`) is preserved verbatim. | automated (unit) | `arcjet-ai/test/context.test.ts` (Phase 2, Task 2) | `createAiContext({ correlationId: "review_2026-07-23_00042" })` returns exactly that string, unmodified. |
| AC1.3 | **Failure:** an invalid correlation ID (>256 bytes or non-printable characters) is rejected at creation with a clear error — not truncated. | automated (unit) | `arcjet-ai/test/context.test.ts` (Phase 2, Task 2) | `assert.throws` (message `/correlationId/`) for a 257-char string, a `\n` string, a non-ASCII string (`"café"`), and the empty string; asserts the 257-char case throws rather than returning a truncated 256-char context. |
| AC1.4 | **Success:** a context survives JSON serialization round-trip unchanged (the workflow-boundary case). | automated (unit) | `arcjet-ai/test/context.test.ts` (Phase 2, Task 2) | For a context with custom `correlationId` + `metadata`, `JSON.parse(JSON.stringify(ctx))` `assert.deepEqual`s the original. |
| AC1.5 | **Success:** a context passed via `aiToolsContext()` arrives in a wrapped tool's `execute` and its `correlationId` reaches the `guard()` call. | automated (integration) | `arcjet-ai/test/generate-text.test.ts` (Phase 3, Task 4) | Real `generateText` + `MockLanguageModelV4`, ALLOW stub client, `ctx` correlationId `"corr-e2e-1"`: inner execute ran and `guardCalls[0].correlationId === "corr-e2e-1"` — context flowed route → `toolsContext` → wrapped execute → guard. |
| AC1.6 | **Edge:** a wrapped tool invoked with no context still runs its guard check (uncorrelated) and logs a dev-mode warning. | automated (integration) | `arcjet-ai/test/generate-text.test.ts` (Phase 3, Task 4) | Same setup but `toolsContext` omitted: inner execute still ran, `guardCalls[0].correlationId === undefined`, and (with `ARCJET_LOG_LEVEL=warn`) a mocked `console.warn` captured a message matching `/no ArcjetAiContext/`. |
| AC1.7 | **Success:** an explicit `correlationId` in a tool policy overrides the context's. | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | Policy `correlationId: "explicit-1"` + context correlationId `"ctx-1"`: `guardCalls[0].correlationId === "explicit-1"` and capture uses `"explicit-1"` too. **Deviation:** moved from Phase 2 to Phase 3 (override lives in `protectTool` policy handling; documented in `phase_02.md`). |

## AC2: `protectTool` enforces by default

AC2.1–AC2.8 are unit tests against a stubbed guard client, calling
`wrapped.execute(input, { toolCallId, messages, context })` directly. AC2.9 is
an integration test with `MockLanguageModelV4` + real `generateText`.

| Criterion | Text | Type | Test file (phase/task) | Assertion |
| --- | --- | --- | --- | --- |
| AC2.1 | **Success:** on ALLOW, the original `execute` runs and its result is returned unchanged. | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | ALLOW decision → original execute called once with the same input; wrapper returns the sentinel unchanged. |
| AC2.2 | **Success:** on DENY, `execute` is never called and the tool result is an `ArcjetDenialResult` with the denial reason. | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | DENY → execute never called; return has `arcjetDenied: true`, `reason: "RATE_LIMIT"`, non-empty `message`, `retryable: true`, `retryAfterSeconds` within [0, 30]. |
| AC2.3 | **Success:** `guard()` receives `label` = policy action and metadata merged in order context ← policy ← per-call function. | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | Context `{ metadata: { user, workflow } }` + policy metadata fn `(input) => ({ workflow: "override", resource: input.id })`: `guardCalls[0].label === action` and metadata `{ user: "u1", workflow: "override", resource: <input.id> }` (later wins; two-layer merge per design decision 5). |
| AC2.4 | **Success:** after successful execution, `experimental_capture()` fires with the action, correlation ID, and merged metadata. | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | ALLOW + successful execute → exactly one capture call with `action`, `correlationId` (context's), `decisionId` of the decision, and metadata including the merge plus `outcome: "success"`. |
| AC2.5 | **Success:** on the denied path, capture fires with a denied outcome referencing the guard decision ID. | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | DENY → capture called once with `decisionId: "gdec_deny1"` and metadata `outcome: "denied"`. |
| AC2.6 | **Failure:** when the guard API errors, the tool fails open — `execute` runs, and the failure is observable (warning + `hasFailedOpen()`). | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | **Two flavors:** (a) `guard()` throws → execute still runs, a fail-open warning emitted (`ARCJET_LOG_LEVEL=warn` + mocked `console.warn`); (b) `guard()` resolves a fail-open ALLOW (`hasFailedOpen() === true`) → execute runs and a warning mentions failing open. |
| AC2.7 | **Success:** `onDeny` reshapes the denial payload the model sees. | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | DENY + `onDeny: (d) => ({ blocked: d.reason })` → tool result is `{ blocked: "RATE_LIMIT" }` (default denial shape absent). |
| AC2.8 | **Edge:** when `execute` throws, capture records an error outcome and the original error propagates unchanged. | automated (unit) | `arcjet-ai/test/protect-tool.test.ts` (Phase 3, Task 3) | Execute throws sentinel → same error instance propagates (`assert.rejects` with equality) and capture fired once with metadata `outcome: "error"`. |
| AC2.9 | **Success:** in a `generateText` loop with a mock model, a denied tool call produces the denial result in the conversation and the loop continues. | automated (integration) | `arcjet-ai/test/generate-text.test.ts` (Phase 3, Task 4) | DENY stub client: `generateText` completes without throwing; `result.steps.length === 2` (loop continued); first step's tool-result `output` deep-includes `{ arcjetDenied: true, reason: "RATE_LIMIT" }`; `mockModel.doGenerateCalls[1].prompt` stringify matches `/arcjetDenied/`; inner execute never ran. |

## AC3: `protectAction` / `captureAction`

All unit tests against a stubbed guard client (no AI SDK).

| Criterion | Text | Type | Test file (phase/task) | Assertion |
| --- | --- | --- | --- | --- |
| AC3.1 | **Success:** on ALLOW, `fn` runs and its return value is passed through. | automated (unit) | `arcjet-ai/test/protect-action.test.ts` (Phase 4, Task 2) | ALLOW → `fn` runs once; `protectAction` resolves with `fn`'s return value (sentinel, `assert.equal` reference check). |
| AC3.2 | **Failure:** on DENY, `ArcjetDeniedError` (carrying the decision) is thrown and `fn` is never called. | automated (unit) | `arcjet-ai/test/protect-action.test.ts` (Phase 4, Task 2) | DENY → `assert.rejects` where `error instanceof ArcjetDeniedError`, `error.name === "ArcjetDeniedError"`, `error.decision.reason === "RATE_LIMIT"`, message mentions action + reason; `fn` spy never called. |
| AC3.3 | **Success:** capture fires after `fn` with the outcome (success/denied/error). | automated (unit) | `arcjet-ai/test/protect-action.test.ts` (Phase 4, Task 2) | Three outcomes: success → one capture `outcome: "success"` + `decisionId`; denied → one capture `outcome: "denied"` + `decisionId`; error (`fn` rejects) → sentinel propagates and one capture `outcome: "error"`. |
| AC3.4 | **Success:** `captureAction` emits a capture event with the context's correlation ID and merged metadata. | automated (unit) | `arcjet-ai/test/protect-action.test.ts` (Phase 4, Task 2) | `captureAction(client, ctx, { action: "notification.sent", metadata: { destination: "slack" } })` with ctx metadata `{ agent: "review-bot" }` → one capture with `action: "notification.sent"`, `correlationId: "run-1"`, metadata `{ agent: "review-bot", destination: "slack" }`, and NO `outcome` key. |
| AC3.5 | **Failure:** guard API errors fail open (`fn` runs). | automated (unit) | `arcjet-ai/test/protect-action.test.ts` (Phase 4, Task 2) | `guard()` throws → `fn` still runs, result passes through, and (with `ARCJET_LOG_LEVEL=warn` + mocked `console.warn`) a fail-open warning emitted. |

## AC4: Metadata vocabulary

All unit tests; no client involved.

| Criterion | Text | Type | Test file (phase/task) | Assertion |
| --- | --- | --- | --- | --- |
| AC4.1 | **Success:** `securityMetadata()` maps each field to its documented wire key (`user`, `agent`, `workflow`, `data-class`, `destination`, `reversibility`, `resource`). | automated (unit) | `arcjet-ai/test/metadata.test.ts` (Phase 2, Task 4) | All seven fields set → `assert.deepEqual` to the seven documented wire keys with given values; in particular `dataClass: "internal"` arrives as `{ "data-class": "internal" }`. |
| AC4.2 | **Success:** custom string values outside the suggested vocabularies pass through unchanged. | automated (unit) | `arcjet-ai/test/metadata.test.ts` (Phase 2, Task 4) | `securityMetadata({ dataClass: "customer-pii", destination: "our-internal-billing-thing" })` passes both custom strings through unchanged. |
| AC4.3 | **Edge:** undefined fields are omitted entirely (no empty-string keys). | automated (unit) | `arcjet-ai/test/metadata.test.ts` (Phase 2, Task 4) | `securityMetadata({ user: "user_123" })` deep-equals `{ user: "user_123" }` (no other keys); `securityMetadata({})` deep-equals `{}`. |

## AC5: Example app

| Criterion | Text | Type | Test file / procedure (phase/task) | Assertion / verification |
| --- | --- | --- | --- | --- |
| AC5.1 | **Success:** the example builds in CI and demonstrates route → workflow → guarded tool → guarded external action using the helpers. | automated (operational) | CI matrix entry in `.github/workflows/reusable-examples.yml` (`node-examples` job, `folder: nextjs-ai-agent`) running `npm run build` / `npm run typecheck` for `examples/nextjs-ai-agent` (Phase 5, Task 3) | This is an infrastructure-style deliverable with no unit tests (example CI runs none). CI runs root `npm ci && npm run build`, then example `npm ci`, `npm run build --if-present`, `npm run typecheck`; all must exit 0. The built example wires route → workflow → `protectTool` tool → `protectAction` → `captureAction`. |
| AC5.2 | **Success:** a local run against a dev Arcjet site produces decisions and events sharing one correlation ID. | human | Manual procedure — `examples/nextjs-ai-agent/README.md` + `phase_05.md` Task 3 Step 4 | **Justification:** needs a live dev Arcjet site + dashboard/MCP inspection that no CI job or unit test can perform. **Procedure:** with real `.env.local` values, `npm run dev`, submit a question; (1) `npx workflow inspect runs` shows the run completing; (2) Arcjet dashboard / MCP `list-guards` shows the `order.looked-up` and `ticket.updated` guard decisions carrying the returned `correlationId`; (3) record the observed correlation ID in the PR description as evidence. **Deferral:** the capture-**events** portion is deferred until `@arcjet/guard` ships `experimental_capture()` (currently unmerged, on `origin/quinn/experimental-capture`) — until then `@arcjet/ai` warns and skips capture. Guard-**decision** correlation is verifiable now. |

## AC6: Agent skill file

| Criterion | Text | Type | Procedure (phase/task) | Verification |
| --- | --- | --- | --- | --- |
| AC6.1 | **Success:** a fresh coding-agent session given only the skill file and a sample AI SDK v7 app completes the integration with only clarifying questions (manual verification, one recorded transcript). | human | Manual procedure — `phase_06.md` Task 3 | **Justification:** by design an observed fresh-agent integration run whose success is the *skill file quality*, judged from a recorded transcript — not expressible as an automated assertion. **Procedure:** (1) prepare a sample AI SDK v7 app OUTSIDE this repo (a `generateText` call with one/two real-`execute` tools + one app-invoked side-effect fn, no Arcjet); (2) start a fresh coding-agent session with exactly two inputs — a copy of `skills/integrate-arcjet-ai/SKILL.md` and the prompt "Using this skill, integrate Arcjet security into this app"; (3) observe the agent complete the integration (launch client, context at entry point, `protectTool` + `toolsContext`, `protectAction`/`captureAction`, denial line in system prompt) asking only clarifying questions — any correction of wrong API usage is a failure that requires refining the skill and re-running; (4) export the transcript and reference it in the PR with a one-line verdict. **Deferral:** a clean recorded transcript must exist and be referenced from the PR before it merges. |

---

## Coverage summary

- **In scope:** 27 criteria across AC1–AC6.
- **Automated:** 25 — comprising 21 unit (AC1.1–AC1.4, AC1.7, AC2.1–AC2.8,
  AC3.1–AC3.5, AC4.1–AC4.3), 3 integration (AC1.5, AC1.6, AC2.9), and 1
  operational (AC5.1, the CI example build/typecheck matrix entry).
- **Human:** 2 — AC5.2 (live dev-site decision/MCP inspection) and AC6.1
  (fresh-agent transcript).
- **Known deferrals:**
  1. **AC5.2 capture events** — deferred until `@arcjet/guard` ships
     `experimental_capture()` (unmerged, on `origin/quinn/experimental-capture`);
     guard-decision correlation is verifiable now.
  2. **AC6.1 recorded transcript** — a clean fresh-agent transcript must be
     recorded and referenced in the PR before it merges.

Phase 1 (package scaffolding) carries no acceptance criteria; its "done when"
is the workspace build/typecheck/CI gate, not an AC.
