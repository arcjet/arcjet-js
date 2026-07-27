# Guard SDK Namespaces Implementation Plan — Phase 2: Shared agent layer

**Goal:** Move the framework-agnostic helpers out of `arcjet-ai/` into
`arcjet-guard/src/agents/`, renamed, with no AI SDK anywhere in their import
graph.

**Architecture:** `@arcjet/guard/agents` becomes the public home for everything
that does not depend on an AI SDK: correlation context, the security metadata
vocabulary, `protectAction`/`captureAction`, and the internal `runGuarded`
engine. Two source files must be **split**, not moved: `context.ts` currently
holds both the agnostic `createAiContext` and the AI-SDK-coupled
`aiToolsContext`, and `context.test.ts` likewise mixes both. The coupled halves
go to Phase 3.

**Tech Stack:** TypeScript, ESM-only, Node's built-in test runner
(`node --test`) with `node:assert/strict`, tsdown for build.

**Scope:** Phase 2 of 6 from `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`

**Codebase verified:** 2026-07-27

---

## Acceptance Criteria Coverage

This phase implements and tests:

### guard-sdk-namespaces.AC2: The shared layer has no AI SDK coupling
- **guard-sdk-namespaces.AC2.1 Success:** No module reachable from `dist/agents/index.js` imports `ai` or any `@ai-sdk/*` package.

(AC2.2 is deliberately **not** claimed here — it needs a clean install without the
AI SDK, which is only possible in Phase 6 Task 2.)

### guard-sdk-namespaces.AC4: Migrated behaviour is preserved
- **guard-sdk-namespaces.AC4.8 Success:** `protectAction` returns the function's value on ALLOW; on DENY it throws `ArcjetDeniedError` carrying the decision and never runs the function.
- **guard-sdk-namespaces.AC4.9 Success:** `captureAction` emits an event with the context's correlation id and merged metadata, with no `decisionId` and no `outcome` key.
- **guard-sdk-namespaces.AC4.10 Edge:** A client lacking `experimental_capture()` causes no throw; capture no-ops with a gated warning.

### guard-sdk-namespaces.AC5: The context rename is complete
- **guard-sdk-namespaces.AC5.1 Success:** `createAgentContext` and `ArcjetAgentContext` are the exported names.
- **guard-sdk-namespaces.AC5.2 Success:** No `createAiContext` or `ArcjetAiContext` identifier remains anywhere in source, tests, docs, the skill, or the example.
- **guard-sdk-namespaces.AC5.3 Failure:** `createAgentContext` rejects a caller-supplied `correlationId` that is not a string, is empty, exceeds 256 characters, or contains non-printable characters — naming the offending problem in the error and never truncating.

**Note on AC5.2:** this phase moves the source and its own tests. The identifier
sweep cannot fully pass until Phase 3 (which moves the remaining AI-coupled
files) and Phase 5 (docs, skill, example) are done. Phase 2 verifies the
identifier is gone from `arcjet-guard/src/agents/**` and
`arcjet-guard/test/_shared/**`; Phase 5 completes the repo-wide sweep.

---

## Conventions this phase MUST follow

These were verified against `arcjet-guard` and differ from how `arcjet-ai` did
things. Applying them is not optional — the build, lint, or typecheck will fail
otherwise.

1. **Relative imports use `.ts`, not `.js`.** `arcjet-guard/src` imports siblings
   as `from "./convert.ts"`; `rewriteRelativeImportExtensions` rewrites them on
   emit. Every moved import specifier changes from `./foo.js` to `./foo.ts`.
2. **Unit tests import source, never `dist/`.** `arcjet-ai` tests imported
   `../dist/index.js`. Guard's unit tests import `./convert.ts` style paths and
   run straight off `.ts` via Node's type stripping — `npm run test-unit`
   requires no build.
3. **Test fixtures live in `arcjet-guard/test/_shared/`, NOT under `src/`.**
   `tsdown` entry is `["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts"]`, so
   any non-test file under `src/` is **published in `dist/`**. A stub client
   under `src/` would ship to users. Precedent for the correct placement:
   `src/transport-node.test.ts`, `src/transport-bun.test.ts`, and
   `src/transport-fetch.test.ts` all import
   `isolateProxyEnvironment` from `../test/_shared/proxy-env.ts`.
4. **Stricter compiler.** `arcjet-guard/tsconfig.json` is standalone and adds,
   over the `tsconfig.base.json` that `arcjet-ai` extended:
   `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`,
   `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
   `noImplicitOverride`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`,
   `isolatedModules`, `moduleDetection: "force"`. Expect real fixes, especially
   indexed access on arrays and `Object.values()` results.
5. **Lint must pass.** Guard runs `oxlint --tsconfig=tsconfig.lint.json`, which
   covers `src/**/*.ts` and `test/**/*.ts` (excluding `test/runtime/**`).
   `arcjet-ai` had no package-level lint script.
6. **External type imports must be retargeted to source.** `arcjet-ai` imported
   guard's types from the `@arcjet/guard` *package*. Inside `arcjet-guard` that
   becomes a self-reference resolving against the package's own possibly-stale
   `dist/` typings. Every such import changes to a relative source import.
   Verified locations in `arcjet-guard/src/types.ts`:

   | Type | Line | Import from `src/agents/` |
   |---|---|---|
   | `DecisionDeny` | 437 | `../types.ts` |
   | `Decision` | 445 | `../types.ts` |
   | `RuleWithInput` | 1652 | `../types.ts` |
   | `GuardOptions` | 1662 | `../types.ts` |

   Affected files in this phase: `guarded.ts` (line 1), `protect-action.ts`
   (line 1), `capture.ts`, and `test/_shared/stub-client.ts`. Confirm the exported
   names at those lines before writing the import.

7. **JSDoc must be rewritten, not carried over.** Several moved files contain
   `@example` blocks that import from `@arcjet/ai` and call `createAiContext`.
   Every moved file's JSDoc must be updated in the same task that moves it —
   `protect-action.ts` has 3 such examples and `metadata.ts` has 1. Leaving them
   breaks AC5.2 and AC8.2.

   JSDoc **prose** (not just `@example` blocks) also names the old identifiers and
   must be updated in the same pass: `client.ts` lines 5, 24, 26, 27;
   `metadata.ts` line 17; `context.ts` line 102; `index.ts` line 53;
   `protect-tool.ts` line 39.

8. **Runtime message strings must be renamed too — "preserve exactly" does NOT
   mean preserving `@arcjet/ai`.** Every user-visible message is prefixed
   `@arcjet/ai:`, and two embed the old type name *inside the string literal*.
   These are the exact occurrences, verified:

   | File (source) | Line | Occurrence |
   |---|---|---|
   | `context.ts` | 80 | `` `@arcjet/ai: correlationId must be 1-256 …` `` |
   | `client.ts` → `capture.ts` | 63 | `"@arcjet/ai: this @arcjet/guard client does not support experimental_capture(); …"` |
   | `guarded.ts` | 51 | `'@arcjet/ai: guard check for "%s" errored; failing open:'` |
   | `guarded.ts` | 58 | `` `@arcjet/ai: guard check for "${action}" failed open (API error).` `` |
   | `protect-tool.ts` | 88 | `"@arcjet/ai: toolsContext entry is not an ArcjetAiContext"` |
   | `protect-tool.ts` | 107 | `` `@arcjet/ai: tool call "${action}" has no ArcjetAiContext; ` `` |
   | `protect-tool.ts` | 178 | `"@arcjet/ai: protectTool() requires a tool with an execute function"` |
   | `protect-tool.ts` | 182 | `"@arcjet/ai: protectTool() cannot wrap a tool that declares its own contextSchema"` |

   Rules:
   - the prefix becomes `@arcjet/guard:` everywhere;
   - `ArcjetAiContext` inside a message becomes `ArcjetAgentContext`;
   - `capture.ts` line 63 needs rewording, not just a prefix swap — after the
     rename it would read "@arcjet/guard: this @arcjet/guard client does not
     support…". Drop the redundant second mention, e.g. "@arcjet/guard: this guard
     client does not support experimental_capture(); event not recorded:".

   Where a task says "preserve exactly", it means preserve the *control flow and
   semantics* — the fail-open branches, the constant-format-string form of the
   `console.warn` call, the "rejected, not truncated" phrasing, the two wrap-time
   throws. It does **not** license carrying `@arcjet/ai` into the new package.
   Leaving these breaks AC5.2, whose sweep covers all source.

   **Three migrated tests assert the old string and must change in lockstep**
   (Phase 3 owns these files, but the coupling is recorded here so it is not
   missed): `test/protect-tool.test.ts:539`, `test/generate-text.test.ts:176`, and
   `test/warn-missing-context.test.ts:44` each assert
   `JSON.stringify(call).includes("no ArcjetAiContext")`. Each becomes
   `"no ArcjetAgentContext"`. Renaming the message without updating these three
   turns them into false negatives — they would still pass on a `console.warn`
   that never fired the intended branch only if the substring happened to match, so
   a stale assertion here is worse than a failing one.

9. **Verification commands** (run from `arcjet-guard/`):
   - `npm run test-unit` — unit tests + coverage, no build needed
   - `npm run typecheck` — runs BOTH `tsc --noEmit` and
     `tsc --project tsconfig.lint.json --noEmit`
   - `npm run lint`
   - `npm run build`

   **Prerequisite:** Phase 1 Task 1 must have quoted the `test-unit` glob
   patterns. If it did not, `npm run test-unit` will run only `src/agents/*.test.ts`
   from this phase onward and report a false green. Confirm with
   `grep "test-unit" package.json` before trusting any test result in this phase.

**Testing approach:** This phase migrates an existing, passing suite. Do not
rewrite the tests from scratch and do not add new coverage beyond the ACs listed
above. The goal is behaviour preservation: the same assertions, retargeted at the
new module paths, still passing. `arcjet-guard` has no enforced coverage
threshold and no CLAUDE.md/AGENTS.md; testing conventions are documented in the
testing section of `arcjet-guard/CONTRIBUTING.md` (a 104-line file — see the
`### Test` heading at line 62; "Unit tests" is prose at line 64 and "Shared test
cases" a bold bullet at line 97).

---

## Source mapping

| From (`arcjet-ai/`) | To (`arcjet-guard/`) | Notes |
|---|---|---|
| `src/ulid.ts` | `src/agents/ulid.ts` | straight move |
| `src/internal.ts` | `src/agents/internal.ts` | straight move (`arcjetProtectedTool` symbol) |
| `src/metadata.ts` | `src/agents/metadata.ts` | straight move |
| `src/client.ts` | `src/agents/capture.ts` | renamed file; `ArcjetAiClient` → `ArcjetAgentClient` |
| `src/guarded.ts` | `src/agents/guarded.ts` | straight move |
| `src/protect-action.ts` | `src/agents/protect-action.ts` | straight move |
| `src/context.ts` | `src/agents/context.ts` | **SPLIT** — keep `createAgentContext` + `ArcjetAgentContext`; `aiToolsContext` goes to Phase 3 |
| `src/index.ts` | `src/agents/index.ts` | rewritten barrel; AI-coupled exports dropped |
| `test/_shared/log-level.ts` | `test/_shared/log-level.ts` | straight move (Task 1) |
| `test/_shared/stub-client.ts` | `test/_shared/stub-client.ts` | retarget imports at source; created in Task 4, after its `capture.ts` dependency exists |
| `test/metadata.test.ts` | `src/agents/metadata.test.ts` | |
| `test/protect-action.test.ts` | `src/agents/protect-action.test.ts` | |
| `test/context.test.ts` | `src/agents/context.test.ts` | **SPLIT** — the `aiToolsContext` test goes to Phase 3 |
| `test/index.test.ts` | `src/agents/index.test.ts` | assert the agents barrel surface |

Left for Phase 3: `src/protect-tool.ts`, the `aiToolsContext` half of
`context.ts`, `test/protect-tool.test.ts`, `test/generate-text.test.ts`,
`test/warn-missing-context.test.ts`.

**Do not delete `arcjet-ai/` in this phase.** Phase 3 still reads from it;
Phase 4 removes it.

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: Create the log-level test fixture

**Verifies:** None (test infrastructure)

**Files:**
- Create: `arcjet-guard/test/_shared/log-level.ts`

**Implementation:**

Copy `arcjet-ai/test/_shared/log-level.ts` verbatim — no logic changes. It
exports `setLogLevel(value: string | undefined): () => void`, which records the
previous `ARCJET_LOG_LEVEL` and returns a restore function.

It has no dependencies on anything being migrated, so it can land first.
`stub-client.ts` is deliberately **not** created here: it needs
`src/agents/capture.ts`, so it is created in Task 4 alongside it. Creating it now
would commit a state that does not typecheck.

**Step 1: Create the file.**

**Step 2: Verify it typechecks**

Run from `arcjet-guard/`: `npm run typecheck`

Expected: no errors. `test/**/*.ts` is covered by `tsconfig.lint.json`, so
mistakes surface immediately.

**Step 3: Commit**

```bash
git add arcjet-guard/test/_shared/log-level.ts
git commit -m "test(guard): add the log-level test fixture"
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Move the leaf modules (ulid, internal, metadata)

**Verifies:** None directly — these are dependency-free leaves. `metadata`
behaviour is covered by Task 3's tests.

**Files:**
- Create: `arcjet-guard/src/agents/ulid.ts`
- Create: `arcjet-guard/src/agents/internal.ts`
- Create: `arcjet-guard/src/agents/metadata.ts`

**Implementation:**

Copy each from `arcjet-ai/src/`. These three import nothing from siblings and
nothing external, so the only code changes are those needed for guard's stricter
compiler.

**`metadata.ts` also needs its JSDoc rewritten** — it carries one `@example`
block that must reference `@arcjet/guard/agents` rather than `@arcjet/ai`.

Watch specifically for:

- `metadata.ts` builds its output by looping a wire-key table. Under
  `noUncheckedIndexedAccess`, indexing that table yields `T | undefined` — add
  the necessary guard or non-null handling rather than casting away the type.
- `ulid.ts` does bitwise/array work on a Crockford base32 alphabet; indexed
  reads into the alphabet string/array will also now be `| undefined`.

**Step 1: Create the three files.**

**Step 2: Typecheck**

Run from `arcjet-guard/`: `npm run typecheck`
Expected: no errors.

**Step 3: Lint**

Run from `arcjet-guard/`: `npm run lint`
Expected: no errors.

**Step 4: Commit**

```bash
git add arcjet-guard/src/agents/
git commit -m "refactor(guard): move ulid, internal, and metadata into src/agents"
```
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: Metadata tests

**Verifies:** None new — behaviour preservation for `securityMetadata`. (No AC
covers `securityMetadata` directly; its correctness is a precondition for
AC4.9's merged-metadata assertion.)

**Files:**
- Create: `arcjet-guard/src/agents/metadata.test.ts` (unit)

**Implementation:**

Move `arcjet-ai/test/metadata.test.ts` (3 tests). Change its import from
`../dist/index.js` to `./metadata.ts`.

**Testing:**

Preserve the existing assertions exactly — they cover the field-to-wire-key
mapping and that unknown/absent fields are omitted. Do not add cases.

**Verification:**

Run from `arcjet-guard/`: `npm run test-unit`
Expected: the 3 metadata tests pass; total count rises by 3.

**Commit:** `test(guard): move metadata tests into src/agents`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Capture layer (`capture.ts`) and the stub-client fixture

**Verifies:** `guard-sdk-namespaces.AC4.10`

**Files:**
- Create: `arcjet-guard/src/agents/capture.ts`
- Create: `arcjet-guard/test/_shared/stub-client.ts`
- Create: `arcjet-guard/src/agents/capture.test.ts` (unit)

**Implementation:**

Move `arcjet-ai/src/client.ts` to `src/agents/capture.ts`. The filename changes
because `arcjet-guard/src/client.ts` already exists and exports
`GuardClientOptions` and `createGuardClient()` — verified, no symbol collision,
but two files named `client.ts` in one package would be confusing.

Rename the exported interface `ArcjetAiClient` → `ArcjetAgentClient`. Keep
`CaptureOptions`, `shouldWarn()`, and `captureEvent()` as they are.

Its `Decision` / `GuardOptions` type imports came from the `@arcjet/guard`
package; change them to `../types.ts` (`Decision` at `src/types.ts:445`,
`GuardOptions` at `:1662` — confirm the exported names first).

**Then create `arcjet-guard/test/_shared/stub-client.ts`**, copied from
`arcjet-ai/test/_shared/stub-client.ts`, now that its dependency exists. Two
import changes:

```ts
import type { ArcjetAgentClient } from "../../src/agents/capture.ts";
import type { Decision, DecisionDeny, RuleWithInput } from "../../src/types.ts";
```

The first replaces `import type { ArcjetAiClient } from "../../dist/index.js";`
(renamed, and pointed at source rather than built output). The second replaces the
`@arcjet/guard` package import — `Decision` is at `src/types.ts:445`,
`DecisionDeny` at `:437`, `RuleWithInput` at `:1652`.

Keep the existing factory shape: `stubClient(decision)` returning
`{ client, guardCalls, captureCalls }`, plus the decision builders
(`decisionAllow`, `decisionDenyRateLimit`, `decisionFailOpenAllow`,
`decisionDenyPromptInjection`, `decisionDenyPromptInjectionWithReset`) and
`fakeRule`.

Keep the structural-typing approach and the runtime feature detection.
`experimental_capture()` does **not** exist in `arcjet-guard` on this branch
(verified — it lives only on `origin/quinn/experimental-capture`), so the
optional-method interface plus `typeof client.experimental_capture === "function"`
detection is still required. Add a comment recording that this collapses into
guard's real client type once capture lands, so a future reader knows it is
deliberate and temporary.

**Testing:**

`arcjet-ai` had no dedicated test file for this module; its behaviour was covered
incidentally through the protect-tool suite. Add a small focused file covering
AC4.10:

- `guard-sdk-namespaces.AC4.10`: calling `captureEvent` with a client object that
  has no `experimental_capture` method does not throw, and emits a warning when
  `ARCJET_LOG_LEVEL` permits it (use `setLogLevel` from
  `../../test/_shared/log-level.ts` and restore it in `finally`). Also assert the
  inverse: with a client that *does* have the method, it is called once with the
  passed options and no warning is emitted.

Also assert `captureEvent` swallows a throwing `experimental_capture` — capture
must never take the caller down.

**Verification:**

Run from `arcjet-guard/`: `npm run test-unit`
Expected: new capture tests pass.

Run from `arcjet-guard/`: `npm run typecheck && npm run lint`
Expected: no errors, including for the newly added `stub-client.ts`.

**Commit:** `refactor(guard): move capture layer into src/agents as capture.ts`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_B -->

<!-- START_SUBCOMPONENT_C (tasks 5-6) -->
<!-- START_TASK_5 -->
### Task 5: Context module, split and renamed

**Verifies:** `guard-sdk-namespaces.AC5.1`, `guard-sdk-namespaces.AC5.3`

**Files:**
- Create: `arcjet-guard/src/agents/context.ts`

**Implementation:**

Take `arcjet-ai/src/context.ts` and keep **only** the agnostic half:

- `ArcjetAgentContext` interface (renamed from `ArcjetAiContext`)
- `createAgentContext()` (renamed from `createAiContext`)
- the `CORRELATION_ID_RE` constant

**Drop** `aiToolsContext` and the
`import type { InferToolSetContext, ToolSet } from "@ai-sdk/provider-utils";`
line. That import is the only runtime AI-SDK dependency in this file, and
removing it is what makes AC2.1 achievable. `aiToolsContext` is recreated in
Phase 3 at `src/vercel-ai/v7/tools-context.ts`.

Preserve the existing validation logic exactly: the `typeof` check before the
regex (non-strings must not be coerced by `RegExp.test`), the problem-naming
ternary chain (`type <t>` / `empty string` / `length <n>` / `non-printable
characters`), and the "rejected, not truncated" wording in the thrown message.
Preserve the metadata copy (`{ ...init.metadata }`) so the returned context owns
a fresh object.

Update the JSDoc: it currently shows `@example` blocks importing from
`@arcjet/ai` and calling `generateText`. Rewrite them for
`@arcjet/guard/agents` and the new function name. Do not leave `@arcjet/ai` or
`createAiContext` anywhere in the prose.

**Testing:** covered by Task 6.

**Verification:**

Run from `arcjet-guard/`: `npm run typecheck`
Expected: no errors.

**Commit:** `refactor(guard)!: rename createAiContext to createAgentContext`
<!-- END_TASK_5 -->

<!-- START_TASK_6 -->
### Task 6: Context tests

**Verifies:** `guard-sdk-namespaces.AC5.1`, `guard-sdk-namespaces.AC5.3`

**Files:**
- Create: `arcjet-guard/src/agents/context.test.ts` (unit)

**Implementation:**

Move `arcjet-ai/test/context.test.ts` (11 tests). Change the import from
`../dist/index.js` to `./context.ts`. Rename every `createAiContext` call to
`createAgentContext` and every `ArcjetAiContext` type reference to
`ArcjetAgentContext`.

**Leave behind** the final test, `"aiToolsContext: includes only branded tools"`
— it belongs to Phase 3. That drops this file to 10 tests.

**Testing:**

Preserve the existing assertions, which already cover AC5.3 comprehensively:
- generated ULID shape (26 Crockford base32 chars) and that consecutive ones differ
- a supplied id is preserved verbatim
- `correlationId: undefined` generates rather than throws
- rejection of: 257 chars, embedded newline, non-ASCII, empty string, and a
  non-string value with the offending type named
- JSON round-trip fidelity

AC5.1 is verified structurally by the file importing `createAgentContext` and
`ArcjetAgentContext` and compiling.

**Verification:**

Run from `arcjet-guard/`: `npm run test-unit`
Expected: 10 context tests pass.

**Commit:** `test(guard): move context tests into src/agents`
<!-- END_TASK_6 -->
<!-- END_SUBCOMPONENT_C -->

<!-- START_SUBCOMPONENT_D (tasks 7-9) -->
<!-- START_TASK_7 -->
### Task 7: The `runGuarded` engine

**Verifies:** None directly — it is internal. Its behaviour is verified through
`protectAction` (Task 9) in this phase and `protectTool` in Phase 3.

**Files:**
- Create: `arcjet-guard/src/agents/guarded.ts`

**Implementation:**

Move `arcjet-ai/src/guarded.ts`. Change sibling imports to `.ts` specifiers
(`./capture.ts` for the client type and `captureEvent`/`shouldWarn`). Rename the
client type reference to `ArcjetAgentClient`.

Its line-1 import of `Decision` / `RuleWithInput` from the `@arcjet/guard`
package becomes `../types.ts` (`Decision` at `src/types.ts:445`, `RuleWithInput`
at `:1652`). Left pointing at the package name, it would resolve against
`arcjet-guard`'s own `dist/` typings — a stale self-reference.

Preserve exactly:
- the `correlation` spread trick that omits `correlationId` when undefined
  (required by `exactOptionalPropertyTypes`)
- the skip-guard-when-`rules`-is-empty-or-absent branch
- the constant `console.warn` format string with `action` passed as a `%s`
  argument, in the catch block — this was a Semgrep finding; do not
  re-interpolate the action into the format string
- the separate fail-open warning when `decision.hasFailedOpen()`
- capture-on-deny with `outcome: "denied"` before returning `onDeny(decision)`

Under `noUncheckedIndexedAccess`, re-check any array indexing introduced here.

**Verification:**

Run from `arcjet-guard/`: `npm run typecheck && npm run lint`
Expected: no errors.

**Commit:** `refactor(guard): move the runGuarded engine into src/agents`
<!-- END_TASK_7 -->

<!-- START_TASK_8 -->
### Task 8: `protectAction` and `captureAction`

**Verifies:** `guard-sdk-namespaces.AC4.8`, `guard-sdk-namespaces.AC4.9`

**Files:**
- Create: `arcjet-guard/src/agents/protect-action.ts`

**Implementation:**

Move `arcjet-ai/src/protect-action.ts`. Change sibling imports to `.ts`
specifiers. Rename the context type to `ArcjetAgentContext` and the client type
to `ArcjetAgentClient`.

Its line-1 import of `Decision` / `DecisionDeny` from the `@arcjet/guard` package
becomes `../types.ts` (`DecisionDeny` at `src/types.ts:437`, `Decision` at `:445`).

**Rewrite its JSDoc.** This file has **three** `@example` blocks, and they import
from `@arcjet/ai` and call `createAiContext`. All three must be rewritten for
`@arcjet/guard/agents` and `createAgentContext`. Phase 5 Task 5 compile-checks
them, so a mistake here fails later rather than silently shipping.

Preserve exactly:
- `ArcjetDeniedError` extending `Error`, with `name = "ArcjetDeniedError"`, a
  `decision` property, and a message naming both the action and the denial reason
- `protectAction` delegating to `runGuarded` with an `onDeny` that throws
- the success/error capture outcomes (`outcome: "success"` / `"error"`), with the
  original error rethrown unchanged
- `captureAction` NOT adding an `outcome` key and NOT setting `decisionId`

Note `erasableSyntaxOnly` is enabled: the error class must not use TypeScript
parameter properties (`constructor(public decision: ...)`). Declare the field and
assign it in the constructor body.

**Testing:** covered by Task 9.

**Verification:**

Run from `arcjet-guard/`: `npm run typecheck && npm run lint`
Expected: no errors.

**Commit:** `refactor(guard): move protectAction and captureAction into src/agents`
<!-- END_TASK_8 -->

<!-- START_TASK_9 -->
### Task 9: `protectAction` / `captureAction` tests

**Verifies:** `guard-sdk-namespaces.AC4.8`, `guard-sdk-namespaces.AC4.9`

**Files:**
- Create: `arcjet-guard/src/agents/protect-action.test.ts` (unit)

**Implementation:**

Move `arcjet-ai/test/protect-action.test.ts` (10 tests). Changes:
- import the subjects from `./protect-action.ts` and `./context.ts` instead of
  `../dist/index.js`
- import fixtures from `../../test/_shared/stub-client.ts` and
  `../../test/_shared/log-level.ts` (two levels up from `src/agents/`)
- rename `createAiContext` → `createAgentContext`

**Testing:**

Preserve the existing assertions:
- `guard-sdk-namespaces.AC4.8`: ALLOW runs the function once and resolves with
  its exact return value (same reference); DENY throws `ArcjetDeniedError` with
  `reason === "RATE_LIMIT"`, a message naming the action and reason, and the
  function never called
- `guard-sdk-namespaces.AC4.9`: `captureAction` emits one event with the
  context's `correlationId`, metadata merged context-then-options, `decisionId`
  undefined, and no `outcome` key
- capture outcomes on the success and error paths, and that the original error
  propagates by reference
- both fail-open cases (guard throws; guard returns a decision with
  `hasFailedOpen()`), each asserting the warning and that capture still fires

Keep using `setLogLevel(...)` with restore in `finally` — do not go back to
deleting `ARCJET_LOG_LEVEL` unconditionally, which clobbers ambient state.

**Verification:**

Run from `arcjet-guard/`: `npm run test-unit`
Expected: 10 protect-action tests pass.

**Commit:** `test(guard): move protectAction tests into src/agents`
<!-- END_TASK_9 -->
<!-- END_SUBCOMPONENT_D -->

<!-- START_SUBCOMPONENT_E (tasks 10-11) -->
<!-- START_TASK_10 -->
### Task 10: The `@arcjet/guard/agents` barrel

**Verifies:** `guard-sdk-namespaces.AC5.1`

**Files:**
- Create: `arcjet-guard/src/agents/index.ts`

**Implementation:**

Write a fresh barrel — do not copy `arcjet-ai/src/index.ts`, whose surface and
`@packageDocumentation` prose describe a package that will not exist.

Export:

```ts
export { createAgentContext } from "./context.ts";
export type { ArcjetAgentContext } from "./context.ts";
export { securityMetadata } from "./metadata.ts";
export type { SecurityMetadataFields } from "./metadata.ts";
export { ArcjetDeniedError, captureAction, protectAction } from "./protect-action.ts";
export type { CaptureActionOptions, ProtectActionPolicy } from "./protect-action.ts";
export type { ArcjetAgentClient, CaptureOptions } from "./capture.ts";
```

Do **not** export `runGuarded`, `ulid`, `shouldWarn`, `captureEvent`, or
`arcjetProtectedTool` — they are internal. Phase 3's namespace imports the
internals it needs by relative path, not through this barrel.

Write a `@packageDocumentation` block describing the layer: framework-agnostic
guard helpers usable with no AI SDK installed, and a pointer to
`@arcjet/guard/vercel-ai/v7` for AI-SDK-specific wrappers. Every `@example` must
compile against installed typings.

**Verification:**

Run from `arcjet-guard/`: `npm run build`
Expected: emits `dist/agents/index.js` and `dist/agents/index.d.ts`, preserving
the nested directory (confirmed: `unbundle: true` keeps structure).

**Commit:** `feat(guard): add the @arcjet/guard/agents barrel`
<!-- END_TASK_10 -->

<!-- START_TASK_11 -->
### Task 11: Barrel surface test and the no-AI-coupling check

**Verifies:** `guard-sdk-namespaces.AC2.1`, `guard-sdk-namespaces.AC5.1`,
`guard-sdk-namespaces.AC5.2` (partial — `src/agents/**` and `test/_shared/**` only)

**Files:**
- Create: `arcjet-guard/src/agents/index.test.ts` (unit)

**Implementation:**

Replace `arcjet-ai/test/index.test.ts` with a test of the agents barrel.

**Testing:**

- `guard-sdk-namespaces.AC5.1`: assert the barrel exports exactly the expected
  named set (compare sorted `Object.keys` of a namespace import against a
  literal list) so an accidental export addition or removal fails loudly. Task 10
  produces the barrel; this asserts its surface.
- `guard-sdk-namespaces.AC2.1`: assert no AI SDK coupling by walking the source
  import graph **transitively** from `src/agents/index.ts`. Resolve every relative
  specifier and follow it, rather than only listing `src/agents/*.ts` — the graph
  legitimately leaves the directory (`capture.ts` imports `../types.ts`), and a
  future edit that reaches further out must not escape the check. For each file
  reached, assert it contains no static import from `ai` or `@ai-sdk/*`.

  Match on real import/export statements only — parse for
  `import ... from "<spec>"` / `export ... from "<spec>"` and test the specifier,
  so the check cannot false-positive on the substring `ai` appearing in JSDoc
  prose or in identifiers like `aiToolsContext`. Assert against source rather than
  `dist/` so the test runs without a build, consistent with guard's convention.

- `guard-sdk-namespaces.AC5.2` (partial): assert no file under `src/agents/` or
  `test/_shared/` contains the identifiers `createAiContext` or `ArcjetAiContext`.

**AC2.2 is NOT claimed by this task.** Importing cleanly with `ai` absent cannot
be proven from inside this workspace, where `ai` is a devDependency and always
present. The transitive graph assertion above is a strong static proxy, but the
load-bearing proof is Phase 6 Task 2, which packs a real tarball and imports
`@arcjet/guard/agents` in a scratch project with no AI SDK installed. AC2.2 is
therefore claimed by Phase 6 only, and `test-requirements.md` records it as
requiring that clean-install probe.

**Verification:**

Run from `arcjet-guard/`: `npm run test-unit`
Expected: all new tests pass. Cumulative for this phase: metadata 3, context 10,
protect-action 10, capture ~3, barrel ~3.

Run from `arcjet-guard/`: `npm run typecheck && npm run lint && npm run build`
Expected: all clean.

**Commit:** `test(guard): verify the agents barrel surface and AI-SDK decoupling`
<!-- END_TASK_11 -->
<!-- END_SUBCOMPONENT_E -->

---

## Phase 2 exit checklist

- [ ] `arcjet-guard/src/agents/` contains: `ulid.ts`, `internal.ts`,
      `metadata.ts`, `capture.ts`, `guarded.ts`, `context.ts`,
      `protect-action.ts`, `index.ts` plus their `.test.ts` files
- [ ] `arcjet-guard/test/_shared/` contains `stub-client.ts` and `log-level.ts`
- [ ] Nothing in the transitive import graph from `src/agents/index.ts` imports
      `ai` or `@ai-sdk/*`
- [ ] No `createAiContext` / `ArcjetAiContext` under `src/agents/` or
      `test/_shared/`
- [ ] No remaining `from "@arcjet/guard"` imports in moved files — all retargeted
      to `../types.ts`
- [ ] JSDoc `@example` blocks rewritten in `metadata.ts` (1), `context.ts`, and
      `protect-action.ts` (3) — no `@arcjet/ai` or `createAiContext` left
- [ ] `npm run test-unit` passes with the migrated tests included, **and the total
      test count is the pre-phase baseline plus the migrated/new tests** (a count
      near zero means Phase 1's glob fix is missing)
- [ ] `npm run typecheck` passes (both tsconfigs)
- [ ] `npm run lint` passes
- [ ] `npm run build` emits `dist/agents/index.js` and `.d.ts`
- [ ] `arcjet-ai/` still exists and is untouched (Phase 3 reads from it)
