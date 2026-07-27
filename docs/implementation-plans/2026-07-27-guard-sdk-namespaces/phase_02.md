# Guard SDK Namespaces Implementation Plan — Phase 2: Shared agent layer

**Goal:** Move the framework-agnostic helpers out of `arcjet-ai/` into
`arcjet-guard/src/agents/`, renamed, with no AI SDK anywhere in their import
graph.

**Architecture:** `@arcjet/guard/agents` becomes the public home for everything
that does not depend on an AI SDK: correlation context, the security metadata
vocabulary, `guardAction`/`captureAction`, and the internal `runGuarded`
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
- **guard-sdk-namespaces.AC4.8 Success:** `guardAction` returns the function's value on ALLOW; on DENY it throws `ArcjetDeniedError` carrying the decision and never runs the function.
- **guard-sdk-namespaces.AC4.9 Success:** `captureAction` emits an event with the context's correlation id and merged metadata, with no `decisionId` and no `outcome` key.
- **guard-sdk-namespaces.AC4.10 Edge:** A client lacking `experimental_capture()` causes no throw; capture no-ops with a gated warning.
- **guard-sdk-namespaces.AC4.4 Failure:** With `onGuardError: "allow"` set explicitly (opting out of the default), either guard-unavailable signal → the tool still executes (fail open) and a warning is emitted, gated on `ARCJET_LOG_LEVEL`. Both signals are covered: the guard call throwing, and a returned decision whose `hasFailedOpen()` is `true`.
- **guard-sdk-namespaces.AC4.11 Failure:** With the default `onGuardError: "deny"`, **any** guard-unavailable signal → the wrapped tool or action does NOT execute and the outcome is captured as `unavailable` (**not** `denied` — a policy outage and a policy denial must stay distinguishable on the capture stream, which is the surface operators actually query). `guardTool` returns an `ArcjetDenialResult` with `reason: "ERROR"`, `retryable: true`, and the fixed `retryAfterSeconds` of AC4.13. `guardAction` throws `ArcjetGuardUnavailableError` — distinct from `ArcjetDeniedError` (see AC4.12 for how the signals are carried on it). `policy.onDeny` is not invoked on any signal.
- **guard-sdk-namespaces.AC4.12 Failure:** The guard-unavailable signals stay distinguishable on `ArcjetGuardUnavailableError`. When the guard call **threw**, `.cause` is that error by reference and `.decision` is `undefined`. When a decision **failed open**, `.decision` is that `DecisionAllow` (so `errorResults()` yields the error detail) and `.cause` is `undefined`. Both legs assert the populated field **and** that the other reads `undefined` — asserting only the populated one passes against an implementation that always sets both. Test with `=== undefined`, **not** `in`: `decision` is a declared optional field, so it is an own property whose value is `undefined` on the thrown path.

### guard-sdk-namespaces.AC5: The renames are complete
- **guard-sdk-namespaces.AC5.1 Success:** `createAgentContext` and `ArcjetAgentContext` are the exported names.
- **guard-sdk-namespaces.AC5.2 Success:** No `createAiContext` or `ArcjetAiContext` identifier remains anywhere in source, tests, docs, the skill, or the example.
- **guard-sdk-namespaces.AC5.4 Success:** The enforcing helpers are exported as `guardTool` and `guardAction` (with `GuardToolPolicy` / `GuardActionPolicy`); no `protectTool`, `protectAction`, `ProtectToolPolicy` or `ProtectActionPolicy` identifier remains anywhere in source, tests, docs, the skill, or the example.
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
   `noUncheckedSideEffectImports`,
   `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`,
   `noImplicitOverride`, `noFallthroughCasesInSwitch`, `erasableSyntaxOnly`,
   `isolatedModules`, `moduleDetection: "force"`. Expect real fixes, especially
   indexed access on arrays and `Object.values()` results.
5. **Lint must pass.** Guard runs `oxlint --tsconfig=tsconfig.lint.json`, which
   covers `src/**/*.ts` and `test/**/*.ts` (excluding `test/runtime/**`).
   `arcjet-ai` had no package-level lint script.
6. **`metadata` is now `ArcjetMetadata`, not `Record<string, string>`.**
   arcjet-js#6171 (merged, and in this branch's history after the rebase) widened
   metadata to any JSON-serializable value and exports
   `ArcjetMetadata = Record<string, unknown>` from `@arcjet/guard`. Import it from
   source as `../types.ts` (it is re-exported there) or `../metadata.ts`.

   Every metadata type in the moved code widens:
   - `ArcjetAgentContext.metadata?: ArcjetMetadata`
   - `createAgentContext(init?: { …; metadata?: ArcjetMetadata })`
   - `securityMetadata(): ArcjetMetadata` — the **return** only. Its input fields
     stay string-typed, because the vocabulary is a fixed set of enum-like strings
     (`destination: "internal"`, `reversibility: "reversible"`). Widening the return
     is what lets it compose by spread with richer caller metadata.
   - `GuardActionPolicy.metadata` and `CaptureActionOptions.metadata`
   - `runGuarded`'s `params.metadata: ArcjetMetadata` (`arcjet-ai/src/guarded.ts:28`)
   - `CaptureOptions.metadata` (`arcjet-ai/src/client.ts:20`) — the *internal*
     structural type, distinct from the public `CaptureActionOptions` above.
     Task 4 owns this edit. Missing it is the one omission that blocks the
     phase: once `GuardActionPolicy.metadata` widens, the merged
     `Record<string, unknown>` is not assignable to either this or `runGuarded`'s
     parameter, so Task 8, `captureAction`'s own call, and Phase 3 Task 3 all fail
     their stated `npm run typecheck` gate.

   Do **not** add value-type validation anywhere. `guard()` itself drops values it
   cannot encode with an `AJ1017` warning rather than failing, and ignores a
   non-object `metadata` entirely; being stricter than the platform would reject
   metadata the server accepts.

7. **External type imports must be retargeted to source.** `arcjet-ai` imported
   guard's types from the `@arcjet/guard` *package*. Inside `arcjet-guard` that
   becomes a self-reference resolving against the package's own possibly-stale
   `dist/` typings. Every such import changes to a relative source import.
   Verified locations in `arcjet-guard/src/types.ts`:

   | Type | Line | Import from `src/agents/` |
   |---|---|---|
   | `DecisionDeny` | 441 | `../types.ts` |
   | `Decision` | 449 | `../types.ts` |
   | `RuleWithInput` | 1668 | `../types.ts` |
   | `GuardOptions` | 1678 | `../types.ts` |

   Affected source files (pre-rename names, as they exist in `arcjet-ai/`):
   `guarded.ts` (line 1), `protect-action.ts` (line 1), `client.ts`, and
   `test/_shared/stub-client.ts`. Confirm the exported
   names at those lines before writing the import.

8. **JSDoc must be rewritten, not carried over.** Several moved files contain
   `@example` blocks that import from `@arcjet/ai` and call `createAiContext`.
   Every moved file's JSDoc must be updated in the same task that moves it —
   Phase 2 must rewrite 2 such examples (`context.ts` and `guard-action.ts`'s first two blocks) plus `metadata.ts`'s 1; Phase 3 will handle `guard-tool.ts`'s one block. Leaving them
   breaks AC5.2 and AC8.2.

   JSDoc **prose** (not just `@example` blocks) also names the old identifiers and
   must be updated in the same pass. Source-side names and lines:
   `client.ts` lines 24, 27; `metadata.ts` line 17; `context.ts` lines 37, 56;
   `index.ts` line 53; `protect-tool.ts` line 39.

   **The old verb names also appear in JSDoc prose** — 10 occurrences across four
   files this phase moves, none of them in an `@example` block (the prose in the files
   Phase 2 moves does not cover the `@example` blocks in Phase 3), so the `@example`
   sweep above misses them entirely:

   | Source file | Lines | Occurrences |
   |---|---|---|
   | `internal.ts` | 2 | 1 (`protectTool()`) |
   | `client.ts` → `capture.ts` | 29 | 2 (`protectTool()`, `protectAction()` on same line) |
   | `guarded.ts` | 7, 8, 18, 19 | 4 (`protectTool` / `protectAction`) |
   | `protect-action.ts` → `guard-action.ts` | 9, 61, 143 | 3 (`protectAction()`; all **outside** `@example`, so the example rewrite misses them — **Task 8 owns these**) |

   Rename these to `guardTool` / `guardAction` in the same task that moves each
   file (Tasks 2, 4 and 7 respectively). A verbatim copy lands `protectTool` in the
   published `arcjet-guard/src/agents/internal.ts` and `guarded.ts`.

9. **Runtime message strings must be renamed too — "preserve exactly" does NOT
   mean preserving `@arcjet/ai`.** Every user-visible message is prefixed
   `@arcjet/ai:`, and two embed the old type name *inside the string literal*.
   These are the exact occurrences, verified:

   | File (in `arcjet-ai/`, pre-rename) | Line | Occurrence (as it exists today) |
   |---|---|---|
   | `context.ts` | 80 | `` `@arcjet/ai: correlationId must be 1-256 …` `` |
   | `client.ts` → `capture.ts` | 63 | `"@arcjet/ai: this @arcjet/guard client does not support experimental_capture(); …"` |
   | `guarded.ts` | 51 | `'@arcjet/ai: guard check for "%s" errored; failing open:'` (Task 7 adds two more for `onGuardError: "deny"` — see its four-string table) |
   | `guarded.ts` | 58 | `` `@arcjet/ai: guard check for "${action}" failed open (API error).` `` (Task 7 converts this to a constant format string with `action` as a `%s` argument, since it is no longer a dead-end warning branch) |
   | `protect-tool.ts` | 88 | `"@arcjet/ai: toolsContext entry is not an ArcjetAiContext"` |
   | `protect-tool.ts` | 107 | `` `@arcjet/ai: tool call "${action}" has no ArcjetAiContext; ` `` |
   | `protect-tool.ts` | 178 | `"@arcjet/ai: protectTool() requires a tool with an execute function"` |
   | `protect-tool.ts` | 182 | `"@arcjet/ai: protectTool() cannot wrap a tool that declares its own contextSchema"` |

   Rules:
   - the prefix becomes `@arcjet/guard:` everywhere;
   - `ArcjetAiContext` inside a message becomes `ArcjetAgentContext`;
   - `capture.ts` line 63 needs rewording, not just a prefix swap — after the
     rename it would read "@arcjet/guard: this @arcjet/guard client does not
     support…". Drop the redundant second mention. **The rewrite MUST retain the
     literal substring `does not support experimental_capture`**, because
     `arcjet-ai/test/protect-tool.test.ts:505` (→
     `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts`) asserts exactly that
     substring. Use precisely: `"@arcjet/guard: this guard client does not support
     experimental_capture(); event not recorded:"` — this is a required string, not
     an example. A shorter rewrite such as "client lacks experimental_capture()"
     compiles and reads fine but silently breaks that assertion.

   Where a task says "preserve exactly", it means preserve the *control flow and
   semantics* — the constant-format-string **form** of the `console.warn` call, the
   "rejected, not truncated" phrasing, the two wrap-time throws. It does **not**
   mean the catch block is untouchable: Task 7 deliberately makes **both**
   guard-unavailable branches conditional on `onGuardError` and adds two more format
   strings. Preserve the *fail-open* behaviour as reachable via
   `onGuardError: "allow"` — it is no longer the default, so "preserve the default"
   would be the wrong reading here. It does **not** license carrying `@arcjet/ai` into the new package.
   Leaving these breaks AC5.2, whose sweep covers all source.

   **Three migrated tests assert the old string and must change in lockstep**
   (Phase 3 owns these files, but the coupling is recorded here so it is not
   missed): `test/protect-tool.test.ts:539`, `test/generate-text.test.ts:176`, and
   `test/warn-missing-context.test.ts:44` each assert
   `JSON.stringify(call).includes("no ArcjetAiContext")`. Each becomes
   `"no ArcjetAgentContext"`. A **fourth** assertion is coupled to a different
   message: `test/protect-tool.test.ts:505` asserts `does not support
   experimental_capture`, which is why the `capture.ts` rewording above is
   constrained rather than free-form. Renaming a message without updating its
   assertion turns it into a false negative — they would still pass on a `console.warn`
   that never fired the intended branch only if the substring happened to match, so
   a stale assertion here is worse than a failing one.

10. **Verification commands** (run from `arcjet-guard/`):
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
| `src/metadata.ts` | `src/agents/vocabulary.ts` | straight move |
| `src/client.ts` | `src/agents/capture.ts` | renamed file; `ArcjetAiClient` → `ArcjetAgentClient` |
| `src/guarded.ts` | `src/agents/guarded.ts` | straight move |
| `src/protect-action.ts` | `src/agents/guard-action.ts` | renamed file; `protectAction` → `guardAction` |
| `src/context.ts` | `src/agents/context.ts` | **SPLIT** — keep `createAgentContext` + `ArcjetAgentContext`; `aiToolsContext` goes to Phase 3 |
| `src/index.ts` | `src/agents/index.ts` | rewritten barrel; AI-coupled exports dropped |
| `test/_shared/log-level.ts` | `test/_shared/log-level.ts` | straight move (Task 1) |
| `test/_shared/stub-client.ts` | `test/_shared/stub-client.ts` | retarget imports at source; created in Task 4, after its `capture.ts` dependency exists |
| `test/metadata.test.ts` | `src/agents/vocabulary.test.ts` | |
| `test/protect-action.test.ts` | `src/agents/guard-action.test.ts` | |
| `test/context.test.ts` | `src/agents/context.test.ts` | **SPLIT** — the `aiToolsContext` test goes to Phase 3 |
| `test/index.test.ts` | `src/agents/index.test.ts` | assert the agents barrel surface |

Left for Phase 3 (source-side names, as they exist in `arcjet-ai/` today):
`src/protect-tool.ts`, the `aiToolsContext` half of `context.ts`,
`test/protect-tool.test.ts`, `test/generate-text.test.ts`,
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
- Create: `arcjet-guard/src/agents/vocabulary.ts`

**Implementation:**

Copy each from `arcjet-ai/src/`. These three import nothing from siblings and
nothing external, so the only code changes are those needed for guard's stricter
compiler.

**This file is renamed:** `arcjet-ai/src/metadata.ts` → `src/agents/vocabulary.ts`,
because arcjet-js#6171 added `arcjet-guard/src/metadata.ts` for the JSON-encoding
machinery and two same-named files in one package invites the wrong import. Widen
its return type to `ArcjetMetadata` (see convention 6); leave `SecurityMetadataFields`
string-typed.

**`vocabulary.ts` also needs its JSDoc rewritten** — it carries one `@example`
block that must reference `@arcjet/guard/agents` rather than `@arcjet/ai`.

**`internal.ts` needs a JSDoc verb rename** — line 2 reads "Brand stamped on tools
wrapped by `protectTool()`"; change to `guardTool()`. (The symbol *key* itself,
`Symbol.for("arcjet:ai:protected-tool")`, is deliberately unchanged — see Phase 3
Task 3.)

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
- Create: `arcjet-guard/src/agents/vocabulary.test.ts` (unit)

**Implementation:**

Move `arcjet-ai/test/metadata.test.ts` (3 tests). Change its import from
`../dist/index.js` to `./vocabulary.ts`.

**Replace the stale metadata caps in the header JSDoc.** `arcjet-ai/src/metadata.ts:14-15`
reads "caps (max 20 pairs, key <=64 bytes, value <=512 bytes) so large maps may be
dropped server-side." arcjet-js#6171 replaced those limits, so this ships wrong
numbers in `dist/agents/vocabulary.d.ts` — in the very package whose README states
the current ones. Phase 5 fixes the identical claim in `SKILL.md` and the README
but scopes nothing to this file. Replace it with #6171's behaviour — 128 top-level
keys, 4 KiB serialized per value, nesting depth 10, drops reported on
`decision.warnings` — or drop the numbers and point at `arcjet-guard/README.md`'s
"Metadata" section. Do not leave a third, different set of numbers in the package.

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
`shouldWarn()` and `captureEvent()` behaviour as they are; widen `CaptureOptions.metadata`
to `ArcjetMetadata` per convention 6.

**JSDoc verb rename:** line 29 reads "passed to `protectTool()`,
`protectAction()`, and `captureAction()`" — change the first two to `guardTool()`
and `guardAction()`.

Its `Decision` / `GuardOptions` type imports came from the `@arcjet/guard`
package; change them to `../types.ts` (`Decision` at `src/types.ts:449`,
`GuardOptions` at `:1678` — confirm the exported names first).

**Then create `arcjet-guard/test/_shared/stub-client.ts`**, copied from
`arcjet-ai/test/_shared/stub-client.ts`, now that its dependency exists. Two
import changes:

```ts
import type { ArcjetAgentClient } from "../../src/agents/capture.ts";
import type { Decision, DecisionDeny, RuleWithInput } from "../../src/types.ts";
```

The first replaces `import type { ArcjetAiClient } from "../../dist/index.js";`
(renamed, and pointed at source rather than built output). The second replaces the
`@arcjet/guard` package import — `Decision` is at `src/types.ts:449`,
`DecisionDeny` at `:441`, `RuleWithInput` at `:1668`.

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
incidentally through the guard-tool suite. Add a small focused file covering
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

Widen `metadata` to `ArcjetMetadata` on both the interface and `createAgentContext`'s
`init` (convention 6). The metadata **copy** stays a shallow spread
(`{ ...init.metadata }`) — that is still correct: it gives the context its own
top-level object, and nested values are shared by reference, which matches
`guard()`'s own shallow merge semantics.

Preserve the existing validation logic exactly: the `typeof` check before the
regex (non-strings must not be coerced by `RegExp.test`), the problem-naming
ternary chain (`type <t>` / `empty string` / `length <n>` / `non-printable
characters`), and the "rejected, not truncated" wording in the thrown message.
Preserve the metadata copy (`{ ...init.metadata }`) so the returned context owns
a fresh object.

Update the JSDoc: it currently shows an `@example` importing from `@arcjet/ai`
and calling `generateText` (`arcjet-ai/src/context.ts:43-53`, which also uses
`aiToolsContext` and a `protectedTools` map). Rewrite it for
`@arcjet/guard/agents` and the new function name. **Make the retained example
AI-SDK-free**: it lands in the deliberately AI-free layer, so a `generateText`
body there would either fail to compile from that layer or drag the AI SDK into
its example. Show `createAgentContext` composing with `guardAction` instead, and
leave the AI-SDK-shaped example to Phase 3's `vercel-ai/v7` files. Do not leave
`@arcjet/ai` or `createAiContext` anywhere in the prose.

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
`guardAction` (Task 9) in this phase and `guardTool` in Phase 3.

**Files:**
- Create: `arcjet-guard/src/agents/guarded.ts`

**Implementation:**

Move `arcjet-ai/src/guarded.ts`. Change sibling imports to `.ts` specifiers
(`./capture.ts` for the client type and `captureEvent`/`shouldWarn`). Rename the
client type reference to `ArcjetAgentClient`.

**JSDoc verb rename:** this file has **4** verb occurrences in its prose —
lines 7, 8 ("shared by `protectTool()` and `protectAction()`") and 18, 19
("`protectTool` returns an `ArcjetDenialResult`; `protectAction` throws"). Rename
all four to `guardTool` / `guardAction`. Lines 18-19 also describe `onDeny`'s
contract, which Task 7 extends with `onUnavailable` — update that prose to mention
both callbacks.

Its line-1 import of `Decision` / `RuleWithInput` from the `@arcjet/guard`
package becomes `../types.ts` (`Decision` at `src/types.ts:449`, `RuleWithInput`
at `:1668`). Left pointing at the package name, it would resolve against
`arcjet-guard`'s own `dist/` typings — a stale self-reference.

**New behaviour — `onGuardError`.** `runGuarded` gains an `onGuardError:
"allow" | "deny"` parameter, **defaulting to `"deny"`**. Review raised that a tool
call which sends mail or updates a ticket carries different risk from a page view,
and failing closed was impossible before because the error was swallowed
internally with no hook. davidmytton then asked for `"deny"` to be the default;
these subpaths have never shipped, so there is no installed base to change under.

**Read this before touching the code: there are two guard-unavailable signals, and
`onGuardError` must govern both.** The current file handles them in two separate
places, and only one of them is the path that matters:

| Signal | Where it lands today | Frequency |
|---|---|---|
| (a) `client.guard()` **throws** | the `catch` block — warns, sets `decision = undefined`, falls through | rare |
| (b) decision returned with `hasFailedOpen() === true` | the `if (decision.hasFailedOpen() && shouldWarn())` branch — warns, then falls through to the DENY check and on to execute | **this is the outage path** |

(b) is the normal signal when Arcjet is unreachable: `arcjet-guard/src/client.ts`
converts a transport failure into a synthesized ALLOW carrying a
`TRANSPORT_ERROR` rule-error result, and `convert.ts` derives `hasFailedOpen: () =>
conclusion === "ALLOW" && errored.length > 0`. The existing comment in the `catch`
block says exactly this ("the guard client itself converts transport failures into
ALLOW decisions with hasFailedOpen() === true, so reaching here means something
unexpected broke") — keep that comment, it is still true and now explains why (a)
alone would be the wrong trigger. Wiring fail-closed to (a) only would ship a
default that never fires during the incident it exists for.

The control flow requires precise typing. Since `decision` is typed `Decision | undefined` (`guarded.ts:41`), a test like `decision.hasFailedOpen() === true` does NOT narrow `Decision` to `DecisionAllow` — TypeScript cannot narrow on a method return. Instead, narrow explicitly with:

```ts
if (decision.conclusion === "ALLOW" && decision.hasFailedOpen()) {
  // decision is narrowed to DecisionAllow here
}
```

This is not a cast. Because `hasFailedOpen()` is `conclusion === "ALLOW" && errored.length > 0`, a DENY decision can **never** report it — the failed-open and DENY branches are mutually exclusive, and the engine's existing branch order is safe to keep.

Restructure so **neither** signal silently continues:

- `"allow"`: behave exactly as today for both signals — warn (gated) and fall
  through to execute. This is now the explicit opt-out and is what AC4.4 covers.
- `"deny"` (default): do **not** execute. Capture the outcome as
  `"unavailable"` — **not** `"denied"`, which is reserved for a real DENY
  decision so the two stay distinguishable on the capture stream — then return
  `onUnavailable(...)` so each adapter decides its own surface.

  Signature — the exact parallel of the existing `onDeny`, with a discriminated
  argument so the adapter can tell the signals apart:

  ```ts
  type Unavailable =
    | { kind: "threw"; error: unknown }
    | { kind: "failed-open"; decision: DecisionAllow };

  onUnavailable: (unavailable: Unavailable) => T;
  ```

  `DecisionAllow` is a **new** import for this file — today it imports only
  `Decision`, `DecisionDeny` and `RuleWithInput`. It is exported from
  `arcjet-guard/src/types.ts`, so add it to the same retargeted `../types.ts`
  import rather than reaching for the package name.

  Its return value **becomes `runGuarded`'s return value**, exactly as `onDeny`'s
  does. `guardTool` returns an `ArcjetDenialResult`; `guardAction` throws (so its
  callback's return type is `never`, which is assignable to `T`). `runGuarded` must
  stay ignorant of both adapter types.

  Make `onUnavailable` a **required** parameter, unconditionally. With `"deny"` as
  the default, every adapter needs one anyway, so the discriminated-union parameter
  typing the earlier draft called for is no longer worth its complexity. Do not
  make it optional-and-silently-ignored: that reintroduces the original defect,
  where enabling fail-closed appears to work but proceeds anyway.

  `decisionId` differs by signal, and this is a real behavioural difference worth
  getting right: on (a) it was never assigned and the existing
  `...(decisionId !== undefined && { decisionId })` spread drops it naturally; on
  (b) a decision **does** exist, so assign `decisionId = decision.id` before
  capturing so the `unavailable` capture event correlates to the fail-open
  decision when — and only when — the decision carries a non-empty id.

Warn in both modes, but **with different text** — the existing constant format
string says "failing open", which would be actively misleading on the path that is
now the default. Four constant format strings, all keeping `action` as a `%s`
argument rather than interpolating it (the Semgrep constraint):

| Mode | Signal | String |
|---|---|---|
| `"allow"` | threw | `'@arcjet/guard: guard check for "%s" errored; failing open:'` |
| `"allow"` | failed open | `'@arcjet/guard: guard check for "%s" failed open (API error).'` |
| `"deny"` | threw | `'@arcjet/guard: guard check for "%s" errored; failing closed:'` |
| `"deny"` | failed open | `'@arcjet/guard: guard check for "%s" was unavailable; failing closed.'` |

Per-row status: Row 1 = today's string, prefix changed only; Row 2 = today's string with prefix changed **and** `${action}` converted from template interpolation to a `%s` argument per convention 9; rows 3–4 are new. The migrated tests assert only `includes("guard check") && includes("errored")` (`protect-action.test.ts:232`, `protect-tool.test.ts:232`) or `includes("failed open")` — all of which still match the prefix-renamed `"allow"` strings, so they do **not** distinguish the two modes and nothing updates them "in lockstep". AC4.14 closes this: Task 9 and Phase 3 Task 4 must tighten the migrated assertions to include `"failing open"` / `"failed open"`, and the new deny-mode cases must assert `"failing closed"` / `"was unavailable"`. **Preserve exactly** these strings in the catch block and both fail-open paths — do not re-interpolate action into the format string.

Here is the restructured `runGuarded` body. **This shape was validated against
both gates**, which matters because an earlier draft passed `typecheck` and failed
`lint`:

- applied to the real `arcjet-ai/src/guarded.ts` and typechecked → **exactly two
  errors**, both `Property 'onUnavailable' is missing` at `protect-action.ts:118`
  and `protect-tool.ts:208` — the two adapters Task 8 and Phase 3 Task 3 update
  next. There is no third error; the `metadata` mismatch of convention 6 appears
  only once `GuardActionPolicy.metadata` widens, which is Task 8's edit, not this
  one.
- transplanted into `arcjet-guard/src/agents/` and run under guard's own configs →
  `npm run typecheck` exit 0 **and** `oxlint --tsconfig=tsconfig.lint.json` exit 0.

Copy the structure, not just the branches:

```ts
const failClosed = onGuardError === "deny";

let decisionId: string | undefined;
if (rules !== undefined && rules.length > 0) {
  let decision: Decision | undefined;
  try {
    decision = await client.guard({ label: action, rules, ...correlation, metadata });
  } catch (error) {
    // Signal (a): the guard call itself threw. Rare — the client converts
    // transport failures into decisions rather than throwing.
    if (failClosed) {
      warnUnavailable(action, "threw", true, error);
      captureEvent(client, {
        action,
        ...correlation,
        metadata: { ...metadata, outcome: "unavailable" },
      });
      return onUnavailable({ kind: "threw", error });
    }
    warnUnavailable(action, "threw", false, error);
    decision = undefined; // fall through to execute, exactly as today
  }
  if (decision !== undefined) {
    // Suppress an empty id. Every decision the client synthesizes on a
    // fail-open path carries `id: ""` (client.ts:216, convert.ts:743), and ""
    // is not a correlatable id — spreading it would put junk on the event.
    if (decision.id !== "") {
      decisionId = decision.id;
    }
    // Signal (b). The `conclusion === "ALLOW"` conjunct must stay INSIDE the
    // `if` for the narrowing to reach `onUnavailable`: TypeScript cannot narrow
    // on a method return, and hoisting the test into a `const failedOpen` makes
    // the `onUnavailable` call fail with "Type 'Decision' is not assignable to
    // type 'DecisionAllow'" (measured). Never reach for a cast here.
    //
    // The mode check is folded into the same condition, and the warnings are
    // extracted into `warnUnavailable` below, to stay within oxlint's
    // `max-depth` of 4 — the nested form trips
    // `eslint(max-depth): Blocks are nested too deeply (5)`.
    if (decision.conclusion === "ALLOW" && decision.hasFailedOpen() && failClosed) {
      warnUnavailable(action, "failed-open", true);
      captureEvent(client, {
        action,
        ...correlation,
        ...(decisionId !== undefined && { decisionId }),
        metadata: { ...metadata, outcome: "unavailable" },
      });
      return onUnavailable({ kind: "failed-open", decision });
    }
    if (decision.conclusion === "ALLOW" && decision.hasFailedOpen()) {
      warnUnavailable(action, "failed-open", false);
      // fall through to execute
    }
    if (decision.conclusion === "DENY") {
      captureEvent(client, {
        action,
        ...correlation,
        ...(decisionId !== undefined && { decisionId }),
        metadata: { ...metadata, outcome: "denied" },
      });
      return onDeny(decision);
    }
  }
}

// Shared tail — UNCHANGED from today. Both `"allow"` paths must reach it.
let result: T;
try {
  result = await execute();
} catch (error) {
  captureEvent(client, {
    action,
    ...correlation,
    ...(decisionId !== undefined && { decisionId }),
    metadata: { ...metadata, outcome: "error" },
  });
  throw error;
}
captureEvent(client, {
  action,
  ...correlation,
  ...(decisionId !== undefined && { decisionId }),
  metadata: { ...metadata, outcome: "success" },
});
return result;
```

…plus the extracted warning helper, which is what keeps the branches inside
`max-depth`. All four format strings are constant, with `action` passed as a `%s`
argument (the Semgrep constraint):

```ts
function warnUnavailable(
  action: string,
  signal: "threw" | "failed-open",
  failClosed: boolean,
  error?: unknown,
): void {
  if (!shouldWarn()) {
    return;
  }
  if (signal === "threw") {
    if (failClosed) {
      console.warn('@arcjet/guard: guard check for "%s" errored; failing closed:', action, error);
    } else {
      console.warn('@arcjet/guard: guard check for "%s" errored; failing open:', action, error);
    }
    return;
  }
  if (failClosed) {
    console.warn('@arcjet/guard: guard check for "%s" was unavailable; failing closed.', action);
  } else {
    console.warn('@arcjet/guard: guard check for "%s" failed open (API error).', action);
  }
}
```

Six things in that skeleton are easy to get wrong and each breaks a migrated test
or the typecheck:

1. **The `"allow"` branches fall through — they must NOT return.** An earlier draft
   of this skeleton had `return await fn()` in both, which skips the shared tail
   and emits no capture event at all. **Two** migrated tests catch that:
   `protect-action.test.ts:197` and `:233` assert `captureCalls.length === 1` on a
   fail-open path. `protect-tool.test.ts`'s two fail-open tests assert only
   `executeCalls` and the warning — they do **not** destructure `captureCalls`, so
   they would sail past an early return. Phase 3 Task 4 must add a
   `captureCalls.length === 1` assertion to both.
2. **`outcome` lives *inside* `metadata`**, as `metadata: { ...metadata, outcome }`
   — it is not a top-level field. `CaptureOptions` has no `outcome` property
   (`arcjet-ai/src/client.ts:10-21`), so a top-level one fails the typecheck, and
   eight migrated assertions read `metadata.outcome`.
3. **`decisionId` is a conditional spread**, never `decisionId: decision.id` —
   `exactOptionalPropertyTypes` rejects assigning a possibly-undefined value.
4. **The parameter is `execute`, not `fn`.** `fn` is `guardAction`'s own
   parameter name; `runGuarded` destructures `execute` (`guarded.ts:30`).
5. **`shouldWarn()` takes no arguments** (`client.ts:43`), and the existing code
   uses a statement `if`, not `&&`.
6. **Nesting must stay within `max-depth: 4`.** `oxlint` runs `eslint/max-depth`
   at error via the `pedantic` category in `.oxlintrc.json`. The obvious
   structure — `if (rules)` → `if (decision)` → `if (failedOpen)` →
   `if (mode)` → `if (shouldWarn())` — is depth 5 and fails `npm run lint` while
   typechecking cleanly. That is why the mode check is folded into the
   failed-open condition and the warnings live in a helper.

Preserve exactly:
- the `correlation` spread trick that omits `correlationId` when undefined
  (required by `exactOptionalPropertyTypes`)
- the skip-guard-when-`rules`-is-empty-or-absent branch
- the constant `console.warn` format string with `action` passed as a `%s`
  argument, in the catch block — this was a Semgrep finding; do not
  re-interpolate the action into the format string
- capture-on-deny with `outcome: "denied"` before returning `onDeny(decision)`

**Not** on the preserve list, despite looking like it belongs there: the
`decision.hasFailedOpen()` branch. Today it warns and falls through; it is now one
of the two `onGuardError` branches. Its *warning* is preserved (with the wording
from the table above), but its control flow deliberately changes.

Under `noUncheckedIndexedAccess`, re-check any array indexing introduced here.

**Verification:**

Run from `arcjet-guard/`: `npm run typecheck && npm run lint`
Expected: no errors.

**Commit:** `refactor(guard): move the runGuarded engine into src/agents`
<!-- END_TASK_7 -->

<!-- START_TASK_8 -->
### Task 8: `guardAction` and `captureAction`

**Verifies:** `guard-sdk-namespaces.AC4.8`, `guard-sdk-namespaces.AC4.9`

**Files:**
- Create: `arcjet-guard/src/agents/guard-action.ts`

**Implementation:**

Move `arcjet-ai/src/protect-action.ts` → `src/agents/guard-action.ts`. Change sibling imports to `.ts`
specifiers. Rename the context type to `ArcjetAgentContext` and the client type
to `ArcjetAgentClient`.

Its line-1 import of `DecisionDeny`, `RuleWithInput` from the `@arcjet/guard` package
becomes `../types.ts` (`DecisionDeny` at `src/types.ts:441`, `RuleWithInput` at `:1668`); add `DecisionAllow` from the same import (`src/types.ts:430`).

**Rewrite its JSDoc.** This file has three `@example` blocks (`:13`, `:93`,
`:151`); the **first two** import from `@arcjet/ai` and call `createAiContext` and
must be rewritten for `@arcjet/guard/agents` and `createAgentContext`. The third
(`:151`, `captureAction`) contains neither an import nor `createAiContext` — leave
its body alone; it needs only Phase 5 Task 5's compile-check. This matches
convention 8's "first two blocks"; an earlier draft said "all three", which would
have had the implementer inject an import into a block that deliberately has none.
Phase 5 Task 5 compile-checks them, so a mistake here fails later rather than
silently shipping.

**New behaviour.** Declare and export the named type the design contract
references — it is public surface, used by both policies:

```ts
export type OnGuardError = "allow" | "deny";
```

Add `onGuardError?: OnGuardError` to `GuardActionPolicy`, **defaulting to
`"deny"`**, and export a new error class:

```ts
export class ArcjetGuardUnavailableError extends Error {
  readonly action: string;
  readonly decision?: DecisionAllow;

  constructor(
    action: string,
    init: { cause: unknown } | { decision: DecisionAllow },
  ) {
    super(
      `policy for "${action}" could not be evaluated`,
      "cause" in init ? { cause: init.cause } : {},
    );
    this.name = "ArcjetGuardUnavailableError";
    this.action = action;
    if ("decision" in init) {
      this.decision = init.decision;
    }
  }
}
```

The message should name the action and make clear the policy could not be evaluated (not that a rule denied the call).
Wire it as `runGuarded`'s `onUnavailable` — which, with `"deny"` as the default, is
now the common path rather than an opt-in one.

Note alongside it: `cause` must NOT be declared as a field (it is inherited from `Error` and passed through the options bag); `decision` IS declared, so on the thrown path it reads `undefined` but is still an own property — tests must use `=== undefined`, **never** `in`.

**Populate exactly one of `cause` / `decision`, per the `Unavailable` discriminant
Task 7 defines** (AC4.12). On `kind: "threw"` set `cause` to the error by
reference and leave `decision` absent; on `kind: "failed-open"` set `decision` to
the `DecisionAllow` and leave `cause` absent. That is how an operator tells an SDK
bug from an Arcjet outage: `decision.errorResults()` yields the `TRANSPORT_ERROR`
result on the outage path, and there is no `Error` object to attach on it. Do not
synthesize a fake `cause` to make the shape uniform — the absence is the signal.

It is deliberately **not** `ArcjetDeniedError`: "a rule denied you" and "the policy
could not be evaluated" are operationally different, and only the second usually
warrants an alert. davidmytton confirmed this split on the PR. This also keeps
`ArcjetDeniedError.decision` non-optional, which it could not be if one class
covered both cases — note that `ArcjetGuardUnavailableError.decision` being
optional is fine precisely because it is a separate class. Under
`erasableSyntaxOnly` neither class may use parameter properties — declare fields
and assign in the constructor body.

Preserve exactly:
- `ArcjetDeniedError` extending `Error`, with `name = "ArcjetDeniedError"`, a
  `decision` property, and a message naming both the action and the denial reason
- `guardAction` delegating to `runGuarded` with an `onDeny` that throws
- the success/error capture outcomes (`outcome: "success"` / `"error"`), with the
  original error rethrown unchanged
- `captureAction` NOT adding an `outcome` key and NOT setting `decisionId`

Note `erasableSyntaxOnly` is enabled: the error class must not use TypeScript
parameter properties (`constructor(public decision: ...)`). Declare the field and
assign it in the constructor body.

**Also correct the JSDoc prose that documents the old default.** It ships in
`dist/agents/*.d.ts` and is what an IDE shows, and AC5.2's sweep matches
`@arcjet/ai` and the old verbs — not the words "fail open" — so nothing else
catches it:
- `arcjet-ai/src/protect-action.ts:82-83` — "Guard API errors fail open: `fn`
  still runs…" is now false by default. Rewrite for the `"deny"` default and the
  `"allow"` opt-out.
- `:90` names only `ArcjetDeniedError`; add `ArcjetGuardUnavailableError`.
- `GuardActionPolicy`'s doc block (`:61`) has no prose for `onGuardError` at all.

**Testing:** covered by Task 9.

**Verification:**

Run from `arcjet-guard/`: `npm run typecheck && npm run lint`
Expected: no errors.

**Commit:** `refactor(guard): move guardAction and captureAction into src/agents`
<!-- END_TASK_8 -->

<!-- START_TASK_9 -->
### Task 9: `guardAction` / `captureAction` tests

**Verifies:** `guard-sdk-namespaces.AC4.4` (the `guardAction` half),
`guard-sdk-namespaces.AC4.8`, `guard-sdk-namespaces.AC4.9`,
`guard-sdk-namespaces.AC4.11` (the `guardAction` half)

**Files:**
- Create: `arcjet-guard/src/agents/guard-action.test.ts` (unit)

**Implementation:**

Move `arcjet-ai/test/protect-action.test.ts` → `src/agents/guard-action.test.ts` (10 tests). Changes:
- import the subjects from `./guard-action.ts` and `./context.ts` instead of
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
  `hasFailedOpen()`), each asserting the warning and that capture still fires.
  **These two migrated cases must now set `onGuardError: "allow"` explicitly** —
  they assert fail-open behaviour, which is no longer the default. Migrating them
  unchanged is the single most likely way to break this phase: they would still
  compile and would now be asserting against the opposite default.

Keep using `setLogLevel(...)` with restore in `finally` — do not go back to
deleting `ARCJET_LOG_LEVEL` unconditionally, which clobbers ambient state.

**New cases for `guard-sdk-namespaces.AC4.11` and `AC4.12`** (the `guardAction`
half). Cover **both** guard-unavailable signals — a suite that only exercises the
throw path leaves the actual outage path untested:
- guard **throws**, `onGuardError` omitted (so the `"deny"` default applies) → the
  function is **never called**, `ArcjetGuardUnavailableError` is thrown, its `cause`
  is the original error by reference, its `decision` is `undefined`, its `action`
  names the action, and one capture fires with `outcome: "unavailable"` (not
  `"denied"`) carrying **no** `decisionId`, since no decision exists.
- guard returns a decision whose **`hasFailedOpen()` is `true`**, `onGuardError`
  omitted → same block-and-capture behaviour, but `decision` is that decision by
  reference and `cause` is `undefined`. Do **not** assert that the capture event
  carries a `decisionId`: every decision the client synthesizes on a fail-open
  path has `id: ""` (`client.ts:216`, `convert.ts:743`), so the engine's non-empty
  check suppresses it and no correlatable id exists on this path. An earlier draft
  asserted one, which passed only because `test/_shared/stub-client.ts:77` returns
  `id: "gdec_allow_fo"` — a fixture value that cannot occur in production. If that
  builder is reused here, change it to `id: ""` so the fixture matches reality.
  Assert instead that the capture event carries **no** `decisionId` on either
  signal.
- the thrown error is **not** an `instanceof ArcjetDeniedError` — assert this
  explicitly, since the whole point of the separate class is that callers can tell
  a policy denial from a policy outage.
- both signals with `onGuardError: "allow"` → fail-open behaviour, function runs.
  **These are the two migrated cases listed under "preserve" above, not new ones** —
  they are AC4.4's cases and are already inside the 10 migrated guard-action tests.
  Do not count them twice when reconciling; the net-new figure for this file is ~5.
- a real DENY decision with `onGuardError: "deny"` set still throws
  `ArcjetDeniedError`, not the unavailable error — the option must only affect the
  unavailable paths.
- `policy.onDeny` is **not** invoked on either unavailable signal (it takes a
  `DecisionDeny`, and neither signal produces one).

**Verification:**

Run from `arcjet-guard/`: `npm run test-unit`
Expected: ~15 guard-action tests pass (10 migrated + ~5 net-new AC4.11/AC4.12 cases).

**Commit:** `test(guard): move guardAction tests into src/agents`
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
export { securityMetadata } from "./vocabulary.ts";
export type { SecurityMetadataFields } from "./vocabulary.ts";
export {
  ArcjetDeniedError,
  ArcjetGuardUnavailableError,
  captureAction,
  guardAction,
} from "./guard-action.ts";
export type {
  CaptureActionOptions,
  GuardActionPolicy,
  OnGuardError,
} from "./guard-action.ts";
export type { ArcjetAgentClient, CaptureOptions } from "./capture.ts";
```

Do **not** export `runGuarded`, `ulid`, `shouldWarn`, `captureEvent`, or
`arcjetProtectedTool` — they are internal. Do **not** re-export `ArcjetMetadata`
either: it is already public from the package root (`@arcjet/guard`), and
re-exporting it from `/agents` would give the same type two import paths. Phase 3's namespace imports the
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
`guard-sdk-namespaces.AC5.2` (partial — `src/agents/**` and `test/_shared/**` only),
`guard-sdk-namespaces.AC5.4` (partial — asserts `guardAction` / `GuardActionPolicy`
are the exported names and no `protectAction` identifier remains under
`src/agents/`)

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
- `guard-sdk-namespaces.AC5.4` (partial): assert no file under `src/agents/` or
  `test/_shared/` contains **any** of `protectTool`, `protectAction`,
  `ProtectToolPolicy`, `ProtectActionPolicy`. Check all four, not just the
  `guardAction` ones — `protectTool` legitimately appears in this layer's JSDoc
  prose (`internal.ts`, `guarded.ts`, `capture.ts`), so a narrower assertion would
  let it survive Phase 2 *and* Phase 3 and only fail during Phase 5.
- **Type-only exports:** `Object.keys` on a namespace import never contains
  type-only exports, so add a type-level check that fails `npm run typecheck` if
  `OnGuardError` is missing from the barrel — e.g. a top-level
  `import type { OnGuardError } from "./index.ts";` plus a trivial
  `const _check: OnGuardError = "allow";`. Without this, a type named in the public
  contract could silently not exist.

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
guard-action ~15, capture ~3, barrel ~3.

Run from `arcjet-guard/`: `npm run typecheck && npm run lint && npm run build`
Expected: all clean.

**Commit:** `test(guard): verify the agents barrel surface and AI-SDK decoupling`
<!-- END_TASK_11 -->
<!-- END_SUBCOMPONENT_E -->

---

## Phase 2 exit checklist

- [ ] `arcjet-guard/src/agents/` contains: `ulid.ts`, `internal.ts`,
      `vocabulary.ts`, `capture.ts`, `guarded.ts`, `context.ts`,
      `guard-action.ts`, `index.ts` plus their `.test.ts` files
- [ ] `arcjet-guard/test/_shared/` contains `stub-client.ts` and `log-level.ts`
- [ ] Nothing in the transitive import graph from `src/agents/index.ts` imports
      `ai` or `@ai-sdk/*`
- [ ] No `createAiContext` / `ArcjetAiContext` under `src/agents/` or
      `test/_shared/`
- [ ] No remaining `from "@arcjet/guard"` imports in moved files — all retargeted
      to `../types.ts`
- [ ] JSDoc `@example` blocks rewritten in `vocabulary.ts` (1), `context.ts`, and
      `guard-action.ts` (3) — no `@arcjet/ai` or `createAiContext` left
- [ ] No JSDoc under `src/agents/` states that guard API errors fail open, and
      `vocabulary.ts`'s header carries #6171's metadata limits rather than the
      pre-#6171 "max 20 pairs" claim
- [ ] `onGuardError` implemented in `runGuarded` + `guardAction`, **defaulting to
      `"deny"`**, and governing **both** guard-unavailable signals (the `guard()`
      call throwing, and a decision whose `hasFailedOpen()` is `true`) — not the
      throw alone
- [ ] `onUnavailable` is a required `runGuarded` parameter taking the `Unavailable`
      discriminant; `ArcjetGuardUnavailableError` populates exactly one of
      `cause` / `decision`, and **neither** unavailable path captures a `decisionId` while the decision's `id` is empty
- [ ] Migrated fail-open tests set `onGuardError: "allow"` explicitly rather than
      relying on a default that has changed
- [ ] The `OnGuardError` type and `ArcjetGuardUnavailableError` are both exported
      from the agents barrel (the type checked at type level, not via
      `Object.keys`)
- [ ] every metadata type widened to `ArcjetMetadata`; no value-type validation
      added anywhere
- [ ] `src/agents/vocabulary.ts` exists (NOT `metadata.ts` — that name is taken by
      guard's own encoding module; Task 2's file creation confirms it and uses the correct name)
- [ ] JSDoc verb renames done in `internal.ts` (1), `capture.ts` (2) and
      `guarded.ts` (4), `protect-action.ts` (3) — 10 occurrences total across four files
- [ ] AC4.11 tests pass, including that the unavailable error is NOT an
      `instanceof ArcjetDeniedError`
- [ ] `npm run test-unit` passes with the migrated tests included, **and the total
      test count is the pre-phase baseline plus the migrated/new tests** (a count
      near zero means Phase 1's glob fix is missing)
- [ ] `npm run typecheck` passes (both tsconfigs)
- [ ] `npm run lint` passes
- [ ] `npm run build` emits `dist/agents/index.js` and `.d.ts`
- [ ] `arcjet-ai/` still exists and is untouched (Phase 3 reads from it)
