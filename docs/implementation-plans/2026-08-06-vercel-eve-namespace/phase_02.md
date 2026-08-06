# Vercel Eve Namespace Implementation Plan — Phase 2: Session-derived correlation and the shared denial extraction

**Goal:** The correlation and denial-message primitives that all three enforcing helpers and the hook factory consume.

**Architecture:** Eve gives every authored callback a `SessionContext` carrying a durable session id, turn, auth principal and (for subagents) parent lineage. `eveAgentContext` reads that into the existing `ArcjetAgentContext` rather than generating a fresh correlation id, so decisions from one conversation land on one Sequence. One function — the retry-after calculation — is extracted from `vercel-ai/v7` into the agnostic layer because three helpers now need it.

**Tech Stack:** TypeScript 7, `node --test`, oxlint. Eve types via `import type` only.

**Scope:** Phase 2 of 8 from `docs/design-plans/2026-08-06-vercel-eve-namespace.md`.

**Codebase verified:** 2026-08-06

---

## Acceptance Criteria Coverage

This phase implements and tests:

### vercel-eve-namespace.AC2: The namespace never imports Eve at runtime
- **vercel-eve-namespace.AC2.1 Success:** Every `eve` (and `eve/*`) import in `src/vercel-eve/v0/**` is type-only — written `import type` or `export type`. A value import of `eve` anywhere in the subtree fails this criterion. Asserted by a static scan over source, in the style of the existing agnostic-layer import-graph test.
- **vercel-eve-namespace.AC2.3 Success:** Nothing reachable from `src/agents/index.ts` imports `eve` or `ai`. The existing agnostic-boundary test is extended to name `eve`, not merely left to cover `ai`.

### vercel-eve-namespace.AC3: Correlation is session-derived
- **vercel-eve-namespace.AC3.1 Success:** `eveAgentContext(ctx)` given a context whose `session.parent` is absent returns an `ArcjetAgentContext` whose `correlationId` is `ctx.session.id`.
- **vercel-eve-namespace.AC3.2 Success:** Given a context whose `session.parent` is present, the `correlationId` is `ctx.session.parent.rootSessionId`, **not** `ctx.session.id`. A subagent's decisions must land on the user-facing session's Sequence rather than a Sequence nobody looks at.
- **vercel-eve-namespace.AC3.3 Edge:** Given a session id that `createAgentContext` would reject (empty, over 256 characters, or containing non-printable characters), `eveAgentContext` does **not** throw. It falls back to a generated ULID, emits a warning gated on `ARCJET_LOG_LEVEL`, and records the rejected value under metadata key `eve.session`. A helper that runs inside a model-driven tool call must never be the reason the call fails.
- **vercel-eve-namespace.AC3.4 Success:** The returned metadata carries `user` set from `ctx.session.auth.current.principalId` when a current principal exists, and omits `user` entirely when `auth.current` is `null`. No empty-string key.
- **vercel-eve-namespace.AC3.5 Success:** The returned metadata carries `eve.session` (the session id) and `eve.turn` (`ctx.session.turn.id`), and carries `eve.parent-session` only for delegated sessions. Caller-supplied metadata is merged **over** these, so an explicit value wins.
- **vercel-eve-namespace.AC3.6 Success:** Every derived metadata key uses only letters, digits, `-`, `.` and `_` — the character class the server enforces, documented in the `@arcjet/guard` README's Metadata section — asserted against that class explicitly, **and** survives a round trip through `encodeMetadata` with no `AJ1017` warning. The second half is a smoke test, not the proof: `arcjet-guard/src/metadata.ts` states that key-name validity is enforced **server-side** (the limits are per-account configurable), and the SDK encoder drops a key only for a lone surrogate or a value `JSON.stringify` cannot represent. So the round trip cannot fail on a key name, and a criterion resting on it alone would be vacuous. The character-class assertion is the load-bearing half.

---

## Context an engineer needs before starting

- `arcjet-guard/src/agents/context.ts` holds `createAgentContext` and its validation regex `/^[ -~]{1,256}$/`. It **throws** on an invalid caller-supplied id, which is correct for a call-site helper and wrong for one that runs inside a tool call. Read it before writing `eveAgentContext`.
- `arcjet-guard/src/agents/ulid.ts` exports `ulid()` for the fallback.
- `arcjet-guard/src/agents/capture.ts` exports `shouldWarn()`, which reads `ARCJET_LOG_LEVEL` and returns true for `debug`/`info`/`warn`. Every warning in this codebase is gated on it, except the deliberate one-time first-occurrence warning in v7's `guard-tool.ts`.
- `arcjet-guard/src/metadata.ts` is guard's metadata encoder (added by arcjet-js#6171). **Read its header comment before writing the AC3.6 test.** It divides responsibility explicitly: the limits — 128 top-level keys, 4 KiB per serialized value, 10 levels of nesting, **and key-name validity** — are enforced **server-side** and are per-account configurable; the server reports every key it drops on `decision.warnings`. The only drop the SDK makes itself is a value `JSON.stringify` cannot represent (`undefined`, a function, a symbol, a `BigInt`, a circular reference, a non-finite number), plus a lone surrogate in a key or value, each with an `AJ1017` warning. `encodeMetadata` performs **no key-name character validation**. That is why AC3.6 asserts the character class directly and treats the encoder round trip as a smoke test only — a test that merely drives the encoder passes for any key name whatsoever and can never fail for `eve.session`.
- `arcjet-guard/src/vercel-ai/v7/guard-tool.ts` contains the retry-after loop inside `denialResult()` (the `for (const result of decision.results)` block reading `resetAtUnixSeconds`). That is the code being extracted.
- Eve's relevant types, all reachable via `import type`:
  - `SessionContext` from `eve/context` — `{ session: { id, auth, turn, parent? }, getSandbox(), getSkill() }`.
  - `SessionAuth` — `{ current: SessionAuthContext | null, initiator: SessionAuthContext | null }`.
  - `SessionAuthContext` — `{ attributes, authenticator, issuer?, principalId, principalType, subject? }`.
  - `SessionTurn` — `{ id, sequence }`.
  - `SessionParent` — `{ callId, rootSessionId, sessionId, turn }`.

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: Extract `retryAfterSeconds` into the agnostic layer

**Verifies:** None directly — this is a refactor under existing v7 coverage. The v7 suite's rate-limit and non-rate-limit denial tests are the safety net and must pass unchanged.

**Files:**
- Create: `arcjet-guard/src/agents/denial.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/denial.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/denial.test.ts`
- Modify: `arcjet-guard/src/vercel-ai/v7/guard-tool.ts` (the `denialResult` function near the end of the file)

Note what is **not** here: `arcjet-guard/src/agents/index.ts`. The extracted function stays off the agnostic barrel (see below), and Phase 2's done-when caps this work at exactly two changed files under `src/agents/`.

**Implementation:**

Create `arcjet-guard/src/agents/denial.ts` exporting one function:

```ts
import type { DecisionDeny } from "../types.ts";

/**
 * Seconds until a rate-limited call may be retried, or `undefined` when the
 * decision carries no reset time to derive one from.
 *
 * Only meaningful for a `RATE_LIMIT` denial. A co-occurring rule that allowed
 * can still leave a `resetAtUnixSeconds` in `decision.results`, so the caller
 * decides whether to consult this at all — the reason check stays with the
 * caller rather than being duplicated here.
 */
export function retryAfterSeconds(decision: DecisionDeny): number | undefined {
  for (const result of decision.results) {
    if ("resetAtUnixSeconds" in result && typeof result.resetAtUnixSeconds === "number") {
      return Math.max(0, Math.ceil(result.resetAtUnixSeconds - Date.now() / 1000));
    }
  }
  return undefined;
}
```

The reason check (`decision.reason === "RATE_LIMIT"`) stays at each call site. Moving it in would make the function look like it decides retryability, and the v7 tests already pin the exact behaviour that a non-rate-limit denial omits the hint even when a co-occurring result carries a reset time (`decisionDenyPromptInjectionWithReset` in `test/_shared/stub-client.ts` exists precisely to hold that line).

Then in `arcjet-guard/src/vercel-ai/v7/guard-tool.ts`, replace the inline loop inside `denialResult()` with a call to the extracted function, keeping the `isRateLimit` guard around it exactly as it is.

Do **not** add `retryAfterSeconds` to `arcjet-guard/src/agents/index.ts`. It is an internal shared helper, and the agnostic barrel is the public surface of the layer (re-exported wholesale by both namespaces). Import it directly: `import { retryAfterSeconds } from "../../agents/denial.ts";`.

**Then create the namespace-local `arcjet-guard/src/vercel-eve/v0/denial.ts`**, which Phases 3 and 4 both import and which nothing else creates. It holds the reason and message strings the three enforcing helpers share, built on the extracted calculation:

```ts
import type { DecisionDeny } from "../../types.ts";

import { retryAfterSeconds } from "../../agents/denial.ts";

/** Model- and user-readable explanation of a denial. */
export function deniedReason(decision: DecisionDeny): string;

/** Explanation used when the policy could not be evaluated. */
export function unavailableReason(): string;
```

Wording, kept aligned with `vercel-ai/v7`'s `ArcjetDenialResult.message` because a model may already be prompted against it. Where v7 says "tool call" this says "call", since the same strings serve connections and inbound messages:

- DENY, `RATE_LIMIT`, hint available: `Arcjet denied this call (RATE_LIMIT). It may be retried after N seconds.`
- DENY, `RATE_LIMIT`, no hint: `… It may be retried later.`
- DENY, anything else: `Arcjet denied this call (REASON). Do not retry; explain the denial to the user or try a different approach.`
- Unavailable: `Arcjet security check could not be completed; please retry later.`

`deniedReason` applies the `decision.reason === "RATE_LIMIT"` check itself and consults `retryAfterSeconds` only then — this is the call site the extracted function deliberately left that check to.

Deliberately **not** here: a `UNAVAILABLE_RETRY_AFTER_SECONDS` constant. None of the four strings carries a retry-after — `unavailableReason()` says "please retry later" without a number — and its only consumer would be the `ArcjetDenialResult` shape in Phase 4 Task 3, which is conditional and may never execute. Adding it now means an exported constant that nothing imports and no test covers. Phase 4 Task 3 adds it if and when it is needed.

**Testing:** co-located `arcjet-guard/src/vercel-eve/v0/denial.test.ts` (**create** it in this task) asserting each of the four strings against the stub decisions in `test/_shared/stub-client.ts`, including that `decisionDenyPromptInjectionWithReset` produces the non-retryable wording with no seconds in it.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
npm run lint --workspace @arcjet/guard
```

Expected: the v7 `guard-tool.test.ts` suite passes with **no edits to it**. If a v7 test needed changing, the extraction changed behaviour — revert and redo. The new `denial.test.ts` passes.

**Commit:** `refactor(guard): extract retryAfterSeconds and add the Eve denial strings`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Extend the agnostic-boundary test to name `eve`

**Verifies:** vercel-eve-namespace.AC2.3.

**Files:**
- Modify: the agnostic import-graph test in `arcjet-guard/src/agents/index.test.ts`

**Implementation:**

The existing test (`arcjet-guard/src/agents/index.test.ts`, the `no AI SDK coupling` case around line 67) walks the transitive import graph from `src/agents/index.ts` with its own recursive walker plus `extractImportSpecifiers` from `arcjet-guard/test/_shared/source-scan.ts`, and asserts nothing reaches `ai` or `@ai-sdk/*`. (`collectTsFiles` from the same helper is used by the sibling identifier sweeps in that file, not by this walk.) Add `eve` and `eve/*` to the forbidden set.

**Testing:** the test must fail if a module reachable from the agnostic barrel imports `eve` in any form — bare (`eve`), subpath (`eve/tools`), value or type. For the agnostic layer the rule is stricter than the namespace's: `import type` from `eve` is forbidden here too, because the layer's guarantee is about coupling, not just about emitted code, and a type dependency is what precedes a value dependency.

Add a fixture-driven assertion so the check itself is tested: write a temporary file under a scratch path, point the scanner at it, and confirm it reports a violation. A boundary test that has never been observed failing is a test that might be scanning nothing — the repo has been bitten by exclusions that silently matched nothing before.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
```

Expected: passes; the new fixture assertion demonstrates the scanner fires.

**Commit:** `test(guard): forbid eve in the agnostic layer's import graph`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-5) -->
<!-- START_TASK_3 -->
### Task 3: `eveAgentContext`

**Verifies:** vercel-eve-namespace.AC3.1, AC3.2, AC3.3, AC3.4, AC3.5.

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/context.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/context.test.ts`
- Modify: `arcjet-guard/src/agents/context.ts` — export the correlation-id validation predicate (see step 2)

**Note on the second `src/agents/` change.** `correlationIdProblem` is private in `arcjet-guard/src/agents/context.ts` today (around line 17). Exporting it is the **second** deliberate edit this work makes to the agnostic layer, alongside Task 1's `denial.ts`. The design's success criteria and its "Shared changes to the agnostic layer" section both account for two; if you find yourself making a third, stop and surface it rather than absorbing it.

**Implementation:**

Export one function plus its metadata key constants. Contract:

```ts
import type { SessionContext } from "eve/context";

import type { ArcjetAgentContext } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

export function eveAgentContext(
  ctx: SessionContext,
  init?: { metadata?: ArcjetMetadata },
): ArcjetAgentContext;
```

Behaviour, in order:

1. **Choose the correlation id.** `ctx.session.parent?.rootSessionId ?? ctx.session.id`. Delegated subagent sessions correlate to the root so the whole conversation is one Sequence; root sessions correlate to themselves.
2. **Validate it without throwing.** Reuse the printable-ASCII/length rule from `createAgentContext`. `createAgentContext` throws, which is wrong here — this function runs inside a model-driven tool call. Add `export` to the existing `correlationIdProblem` in `arcjet-guard/src/agents/context.ts` (it already returns a description or `undefined`, which is exactly the shape needed) rather than duplicating the regex, so the two definitions cannot drift. On failure: generate `ulid()`, warn through `shouldWarn()`, and continue.
3. **Build the derived metadata**, in this order so caller metadata wins:
   - `eve.session`: the raw `ctx.session.id` — always, including when it was rejected in step 2, so a malformed id is still observable on the event.
   - `eve.turn`: `ctx.session.turn.id`, omitted if absent.
   - `eve.parent-session`: `ctx.session.parent.sessionId`, only for delegated sessions. Note this is the *immediate* parent, while the correlation id is the *root* — they differ at depth ≥ 2 and both are worth having.
   - `user`: `ctx.session.auth.current.principalId`, omitted when `auth.current` is `null` or the principal id is not a non-empty string. Use the `user` wire key from `securityMetadata`'s vocabulary rather than a new key — this is the same dimension.
   - then `...init?.metadata`.
4. **Return** `{ correlationId, metadata }`, omitting `metadata` entirely when it would be empty (matching `createAgentContext`, which omits rather than emitting `{}`).

Defensive reads throughout: this receives a value produced by a framework, and `noUncheckedIndexedAccess` plus `exactOptionalPropertyTypes` are on. A missing `session` must not throw (AC4.9 in Phase 3 depends on that), so read through optional chaining and fall back to a generated id.

**Testing:** Tests must verify each AC listed above, using hand-built context objects — no `eve` import, not even a type-only one in the test if a local structural type is clearer:
- **AC3.1:** no `parent` → `correlationId === session.id`.
- **AC3.2:** `parent: { rootSessionId: "ses_root", sessionId: "ses_mid", ... }` → `correlationId === "ses_root"`, and explicitly assert it is **not** `session.id`. Asserting only the positive passes against an implementation that ignores `parent` when the ids happen to match, so use distinct ids.
- **AC3.3:** three sub-cases — empty string, 257 characters, and a string containing a NUL (`\u0000`). Each must return a context (not throw), whose `correlationId` matches the ULID shape (26 Crockford base32 characters) and whose `metadata["eve.session"]` is the rejected value verbatim. Assert the warning fires with `ARCJET_LOG_LEVEL=warn` and does not with it unset, by stubbing `console.warn`.
- **AC3.4:** `auth.current` populated → `metadata.user === principalId`; `auth.current: null` → `"user" in metadata` is `false`. Test absence with `in`, not with `=== undefined`: an own property whose value is `undefined` would serialize as a key and is the bug this criterion guards.
- **AC3.5:** the three `eve.*` keys present/absent as specified, and `init.metadata` overriding a derived key (pass `{ metadata: { "eve.turn": "override" } }` and assert the override wins).

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
```

**Commit:** `feat(guard): derive an agent context from an Eve session`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Assert the derived metadata keys survive guard's encoder

**Verifies:** vercel-eve-namespace.AC3.6.

**Files:**
- Modify: `arcjet-guard/src/vercel-eve/v0/context.test.ts`

**Implementation:** no production change. This closes a specific hole: `eve.session`, `eve.turn` and `eve.parent-session` contain a `.`, and a key whose name the **server** rejects comes back only on `decision.warnings`, which nothing in these helpers reads. So a bad key name is invisible at runtime.

**Read `arcjet-guard/src/metadata.ts`'s header comment before writing this test.** It is explicit that key-name validity is enforced server-side and that `encodeMetadata` drops a key only for a lone surrogate or an unrepresentable value. There is no client-side key-name validation to assert against.

**Testing**, two halves with different weights:

1. **The load-bearing half.** Assert every key `eveAgentContext` **derives** matches `/^[A-Za-z0-9._-]+$/` — the character class the README's Metadata section documents the server as enforcing — with the README cited in a comment as the source. Drive it from the function's output across three shapes (root session, delegated session, `auth.current` null) rather than from a hardcoded key list, so a key added later is covered.

   Scope it to derived keys. Caller-supplied keys arriving through `init.metadata` are the caller's responsibility, and including a caller-metadata shape here either fails the test for a legitimately odd caller key or quietly narrows what the assertion covers to whichever safe key the test author happened to pick. If you want a caller-metadata case in the file for other reasons, use a conforming key and say in a comment that its keys are out of AC3.6's scope.
2. **The smoke half.** Round-trip that output through `encodeMetadata` and assert no `AJ1017` warning and no key dropped. State in a comment that this **cannot fail on a key name** and is here to catch an unrepresentable *value* (a `BigInt` or non-finite number arriving through `init.metadata`), not to validate names.

Do not write the test as "drive the encoder and assert the keys survive" alone. That version passes for any key name whatsoever — including `"eve session"` with a space, or a key of 500 characters — and would report AC3.6 satisfied while proving nothing about it.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
```

Then confirm half 1 actually constrains: temporarily change a derived key in `context.ts` to `"eve session"` (with a space), re-run, and confirm the test **fails**. Revert. A character-class assertion that has not been seen failing may be matching something other than what you think.

**Commit:** `test(guard): verify Eve's derived metadata keys pass guard's encoder`
<!-- END_TASK_4 -->

<!-- START_TASK_5 -->
### Task 5: The type-only import scan

**Verifies:** vercel-eve-namespace.AC2.1.

**Files:**
- Modify: `arcjet-guard/test/_shared/source-scan.ts` (add one exported function)
- Create: `arcjet-guard/src/vercel-eve/v0/type-only.test.ts`

**Implementation:**

`extractImportSpecifiers` in `test/_shared/source-scan.ts` deliberately does not distinguish `import` from `import type` — the agnostic-layer test forbids both, so it never needed to. This namespace needs the distinction, so add a sibling that reports each specifier along with whether the statement was type-only.

Add to `source-scan.ts`:

```ts
/**
 * Extract import/export specifiers along with whether the statement was
 * type-only.
 *
 * `import type { X } from "eve"` and `export type { X } from "eve"` are erased
 * at compile time; a plain `import { x } from "eve"` is not. The vercel-eve
 * namespace is required to use only the former, so the two must be told apart —
 * which `extractImportSpecifiers` deliberately does not do (the agnostic-layer
 * boundary forbids both forms and never needed the distinction).
 *
 * Inline type modifiers (`import { type X, y } from "eve"`) count as a VALUE
 * import: the statement still emits, because `y` is a value.
 */
export function extractTypedImportSpecifiers(
  content: string,
): Array<{ specifier: string; typeOnly: boolean }>;
```

Implement it over `stripCommentsAndTemplates(content)` — reuse that, do not re-derive it. Match `^[ \t]*(import|export)\s+type\b` for the type-only form and the existing `^[ \t]*(?:import|export)\b[^;=]*?from\s+["']…["']` pattern for the general form, then classify. Keep the same `^`-anchored, `[^;=]`-excluding discipline the existing regexes use; the exclusions are there so a string literal containing the word `from` cannot be read as an import.

**Testing:** Tests must verify:
- **AC2.1:** every file under `arcjet-guard/src/vercel-eve/` (source **and** tests, collected with `collectTsFiles`) whose imports include `eve` or a specifier starting `eve/` has `typeOnly: true` for every such statement. Report every violation with its file path, not just the first.
- The scanner itself fires: assert on inline fixture strings covering `import { defineTool } from "eve/tools"` (violation), `import type { ToolDefinition } from "eve/tools"` (fine), `import { type ToolDefinition, defineTool } from "eve/tools"` (violation — the statement still emits), `export type { Approval } from "eve/tools"` (fine), and a specifier merely *containing* `eve` such as `"eventsource"` or `"./eve-helpers.ts"` (not a match — do not use a substring test).

That last fixture matters: a naive `specifier.includes("eve")` both misses nothing and flags everything, and this repo has already been bitten by a sweep whose matching was wrong in a way that read as clean.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
```

Then verify the check actually constrains production code:

```bash
# temporarily add a value import to a namespace file and confirm the test fails
printf '\nimport { defineTool } from "eve/tools";\nvoid defineTool;\n' >> arcjet-guard/src/vercel-eve/v0/context.ts
npm run test-unit --workspace @arcjet/guard   # expect a FAILURE naming context.ts
git checkout arcjet-guard/src/vercel-eve/v0/context.ts
npm run test-unit --workspace @arcjet/guard   # expect green again
```

Record both outcomes. A guarantee-enforcing test that has not been seen failing has not been verified.

**Commit:** `test(guard): require type-only eve imports in the vercel-eve namespace`
<!-- END_TASK_5 -->
<!-- END_SUBCOMPONENT_B -->

---

## Phase 2 done when

- `retryAfterSeconds` lives in `src/agents/denial.ts`, `vercel-ai/v7` uses it, and the v7 test suite passes **unedited**.
- `src/vercel-eve/v0/denial.ts` exists with its four strings tested. Phases 3 and 4 both import it; nothing else creates it.
- Exactly two files under `src/agents/` were changed: `denial.ts` (new) and `context.ts` (one `export` added).
- The agnostic-boundary test forbids `eve` and has been observed failing against a fixture.
- `eveAgentContext` satisfies AC3.1–AC3.6, including the non-throwing fallback, the explicit character-class assertion, and the encoder round-trip as a smoke test — with the character-class half observed failing against a deliberately bad key.
- The type-only scan satisfies AC2.1 and has been observed failing against a real value import, then passing after revert.
- `eveAgentContext` carries a JSDoc `@example` that compiles, mirroring the convention in `src/vercel-ai/v7/` where each exported helper has one. Phase 6 Task 6 extracts and typechecks every `@example` in the namespace and compares the count against the export count, so a missing one fails there.
- Build, both typechecks, lint and unit tests pass.
