# Guard SDK Namespaces Implementation Plan — Phase 3: Vercel AI SDK v7 namespace

**Goal:** Move the two AI-SDK-coupled helpers into
`arcjet-guard/src/vercel-ai/v7/` and have that namespace proxy the shared agent
layer, so an AI SDK app needs only one import path.

**Architecture:** `guardTool` moves wholesale; `aiToolsContext` arrives as the
other half of the `context.ts` split started in Phase 2. The barrel re-exports
its own two symbols plus `export * from "../../agents/index.ts"`, which must
preserve *function identity* — the proxied `guardAction` has to be the very same
function object as the one from `@arcjet/guard/agents`, not a wrapper.

**Tech Stack:** TypeScript, Vercel AI SDK v7 (`ai@7.0.36`,
`@ai-sdk/provider-utils@5.0.12`), Node's built-in test runner.

**Scope:** Phase 3 of 6 from `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`

**Codebase verified:** 2026-07-27

---

## Acceptance Criteria Coverage

This phase implements and tests:

### guard-sdk-namespaces.AC1: Subpaths resolve as specified
- **guard-sdk-namespaces.AC1.1 Success:** `import { launchArcjet, tokenBucket } from "@arcjet/guard"` resolves, and the root export surface is unchanged from `main` (no additions, no removals).
- **guard-sdk-namespaces.AC1.2 Success:** `import { createAgentContext, securityMetadata, guardAction, captureAction, ArcjetDeniedError } from "@arcjet/guard/agents"` resolves.
- **guard-sdk-namespaces.AC1.3 Success:** `import { guardTool, aiToolsContext } from "@arcjet/guard/vercel-ai/v7"` resolves.
- **guard-sdk-namespaces.AC1.4 Success:** The v7 namespace re-exports the shared layer, and each proxied export is the *same function identity* as the one from `@arcjet/guard/agents`.
- **guard-sdk-namespaces.AC1.5 Failure:** `@arcjet/guard/vercel-ai` (unversioned) does not resolve.
- **guard-sdk-namespaces.AC1.6 Failure:** `@arcjet/guard/vercel-ai/v6` (unsupported major) does not resolve.

### guard-sdk-namespaces.AC5: The renames are complete
- **guard-sdk-namespaces.AC5.4 Success (partial):** `guardTool` and `GuardToolPolicy` are the exported names in this namespace; no `protectTool` / `ProtectToolPolicy` identifier remains under `src/vercel-ai/`. Phase 5 completes the repo-wide sweep.

### guard-sdk-namespaces.AC2: The shared layer has no AI SDK coupling
- **guard-sdk-namespaces.AC2.3 Failure:** `@arcjet/guard/vercel-ai/v7` fails to import when `ai` is absent — documenting the peer requirement rather than failing silently.

### guard-sdk-namespaces.AC4: Migrated behaviour is preserved
- **guard-sdk-namespaces.AC4.1 Success:** Guard ALLOW → the wrapped tool executes once and an event is captured with `outcome: "success"`.
- **guard-sdk-namespaces.AC4.2 Failure:** Guard DENY → the tool never executes and the model receives an `ArcjetDenialResult` carrying `reason` and `retryable`.
- **guard-sdk-namespaces.AC4.3 Edge:** A `RATE_LIMIT` denial carries `retryAfterSeconds`; a non-rate-limit denial omits it even when a co-occurring rule result has a reset time.
- **guard-sdk-namespaces.AC4.4 Failure:** With `onGuardError: "allow"` set explicitly (opting out of the default), either guard-unavailable signal → the tool still executes (fail open) and a warning is emitted, gated on `ARCJET_LOG_LEVEL`.
- **guard-sdk-namespaces.AC4.5 Success:** A context's `correlationId` reaches both the guard call and the capture call.
- **guard-sdk-namespaces.AC4.6 Edge:** A protected tool invoked with no context warns on the first occurrence even with logging off, and stays silent afterwards unless `ARCJET_LOG_LEVEL` is set.
- **guard-sdk-namespaces.AC4.7 Failure:** The injected `contextSchema` rejects a non-string `correlationId`, and rejects `metadata` that is not a plain object. It **accepts** any plain-object metadata regardless of value types — nested objects, arrays, numbers, booleans, `null` — matching `ArcjetMetadata` (arcjet-js#6171).
- **guard-sdk-namespaces.AC4.11 Failure:** With the default `onGuardError: "deny"`, **either** guard-unavailable signal (the guard call throwing, or a decision whose `hasFailedOpen()` is `true`) → the wrapped tool does NOT execute, the model receives an `ArcjetDenialResult` with `reason: "ERROR"` and `retryable: true`, and the outcome is captured as `denied`. (Phase 2 built the engine and the `guardAction` half; this phase covers `guardTool`.)

---

## Conventions

All Phase 2 conventions still apply — `.ts` relative imports, unit tests import
source not `dist/`, fixtures in `arcjet-guard/test/_shared/`, guard's stricter
compiler, `oxlint` must pass. Re-read the "Conventions this phase MUST follow"
section of `phase_02.md` before starting.

Import depth from this directory is one level deeper than Phase 2:
- shared layer: `../../agents/index.ts` (or specific modules like
  `../../agents/guarded.ts`)
- fixtures: `../../../test/_shared/stub-client.ts`

**Testing approach:** behaviour preservation. These tests already exist and pass;
retarget them, do not rewrite or expand them beyond the ACs listed.

---

## Source mapping

| From (`arcjet-ai/`) | To (`arcjet-guard/`) | Notes |
|---|---|---|
| `src/protect-tool.ts` | `src/vercel-ai/v7/guard-tool.ts` | renamed file; `protectTool` → `guardTool` |
| `src/context.ts` (the `aiToolsContext` half) | `src/vercel-ai/v7/tools-context.ts` | the other half of the Phase 2 split |
| — | `src/vercel-ai/v7/index.ts` | replaces the Phase 1 `export {}` placeholder |
| `test/protect-tool.test.ts` | `src/vercel-ai/v7/guard-tool.test.ts` | 22 tests |
| `test/generate-text.test.ts` | `src/vercel-ai/v7/generate-text.test.ts` | 3 tests |
| `test/warn-missing-context.test.ts` | `src/vercel-ai/v7/warn-missing-context.test.ts` | 2 tests; must stay its own file |
| `test/context.test.ts` (the `aiToolsContext` test) | `src/vercel-ai/v7/tools-context.test.ts` | 1 test split out in Phase 2 |

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: `aiToolsContext`

**Verifies:** `guard-sdk-namespaces.AC1.3` (partial)

**Files:**
- Create: `arcjet-guard/src/vercel-ai/v7/tools-context.ts`

**Implementation:**

Take the `aiToolsContext` function removed from `context.ts` in Phase 2 and give
it its own module. It keeps the AI SDK type import that made it coupled:

```ts
import type { InferToolSetContext, ToolSet } from "@ai-sdk/provider-utils";
```

It also needs the brand symbol and the context type:

```ts
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetAgentContext } from "../../agents/context.ts";
```

Preserve the behaviour exactly: iterate `Object.entries(tools)`, include an entry
only when `arcjetProtectedTool in tool`, and return the map cast through
`unknown` to `InferToolSetContext<TOOLS>`. Rename the context type to
`ArcjetAgentContext`.

Update its JSDoc `@example` to import from `@arcjet/guard/vercel-ai/v7` and to
use `createAgentContext`. Note the existing example uses `const protected = ...`
— `protected` is a reserved word in strict-mode TypeScript and this must not be
copied verbatim into a compiled example; rename it (e.g. `protectedTools`).

**Verification:**

```bash
cd arcjet-guard && npm run typecheck
```
Expected: no errors.

**Commit:** `refactor(guard): move aiToolsContext into the vercel-ai/v7 namespace`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: `aiToolsContext` test

**Verifies:** `guard-sdk-namespaces.AC1.3` (partial)

**Files:**
- Create: `arcjet-guard/src/vercel-ai/v7/tools-context.test.ts` (unit)

**Implementation:**

Move the single `"aiToolsContext: includes only branded tools"` test that Phase 2
left behind in `arcjet-ai/test/context.test.ts`. Import `aiToolsContext` from
`./tools-context.ts` and `createAgentContext` from `../../agents/context.ts`.

**Testing:**

Preserve the existing assertions: given one tool carrying
`Symbol.for("arcjet:ai:protected-tool")` and one without, the result has exactly
one key, contains the branded tool's name, the value is the same context
reference, and the unbranded tool is absent.

Note the test hardcodes the symbol via `Symbol.for(...)`. Keep that — it proves
the brand is a registered symbol reachable across module boundaries, which is the
actual contract.

**Verification:**

```bash
cd arcjet-guard && npm run test-unit
```
Expected: the tools-context test passes.

**Commit:** `test(guard): move the aiToolsContext test into vercel-ai/v7`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-5) -->
<!-- START_TASK_3 -->
### Task 3: `guardTool`

**Verifies:** `guard-sdk-namespaces.AC4.1`–`AC4.7` (implementation; tests follow)

**Files:**
- Create: `arcjet-guard/src/vercel-ai/v7/guard-tool.ts`

**Implementation:**

Move `arcjet-ai/src/protect-tool.ts` → `src/vercel-ai/v7/guard-tool.ts`. It keeps its AI SDK imports
(`jsonSchema` value import from `ai`; `InferToolInput`, `InferToolOutput`, `Tool`
type imports). Change everything else to source-relative:

```ts
import { runGuarded } from "../../agents/guarded.ts";
import { shouldWarn } from "../../agents/capture.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { ArcjetAgentContext } from "../../agents/context.ts";
```

`DecisionDeny` and `RuleWithInput` came from the `@arcjet/guard` package; import
them from source: `../../types.ts` (`DecisionDeny` at `src/types.ts:441`,
`RuleWithInput` at `:1668` — confirm the exported names first). Left as a package
import, these resolve against `arcjet-guard`'s own `dist/` typings, which is a
stale self-reference.

**Rewrite its JSDoc.** This file carries one `@example` block that imports from
`@arcjet/ai` and calls `createAiContext`; rewrite it for
`@arcjet/guard/vercel-ai/v7` and `createAgentContext`. Phase 5 Task 5
compile-checks it.

**New behaviour — `onGuardError`.** Add `onGuardError?: OnGuardError` to
`GuardToolPolicy`, **defaulting to `"deny"`**, and pass it through to `runGuarded`
(Phase 2 Task 7 added the parameter and the required `onUnavailable` callback).

Supply `onUnavailable` so that on **either** guard-unavailable signal — the
`guard()` call throwing, or a decision whose `hasFailedOpen()` is `true` — the model
receives the **same** `ArcjetDenialResult` shape as a real denial, distinguished by
its reason. Ignore the `Unavailable` discriminant here: unlike `guardAction`, which
surfaces the two signals separately on its error object, `guardTool` collapses them
because its consumer is a language model reading a tool result, and a second result
shape would be harder to prompt against:

```ts
{
  arcjetDenied: true,
  reason: "ERROR",
  message: "<explains the security check could not be completed; retry later>",
  retryable: true,
}
```

No `retryAfterSeconds` — there is no reset time for an outage. Keeping one result
type is deliberate: a model only ever observes tool results, and a second shape
would be harder to prompt against. `policy.onDeny`, if supplied, must **not** be
invoked for the outage path — it receives a `DecisionDeny`, and there is no
decision here. Document that explicitly in the JSDoc.

**Rename the four runtime message strings** (see phase_02 convention 8 for the
full table and rationale). In this file:

| Line | From | To |
|---|---|---|
| 88 | `"@arcjet/ai: toolsContext entry is not an ArcjetAiContext"` | `"@arcjet/guard: toolsContext entry is not an ArcjetAgentContext"` |
| 107 | `` `@arcjet/ai: tool call "${action}" has no ArcjetAiContext; ` `` | `` `@arcjet/guard: tool call "${action}" has no ArcjetAgentContext; ` `` |
| 178 | `"@arcjet/ai: protectTool() requires …"` | `"@arcjet/guard: guardTool() requires …"` |
| 182 | `"@arcjet/ai: protectTool() cannot wrap …"` | `"@arcjet/guard: guardTool() cannot wrap …"` |

**All four rows change two things each.** Lines 88 and 107: the prefix and the
embedded type name (`ArcjetAiContext` → `ArcjetAgentContext`). Lines 178 and 182:
the prefix **and the function name** — the current source says `protectTool()`, so a
literal find/replace on the "To" strings will not match anything and it is easy to
conclude those two lines are already done. Three migrated tests assert the line-107 substring; Tasks 4 and 5 update
them in lockstep. Renaming the message without updating those assertions leaves
tests that pass for the wrong reason.

The `Symbol.for("arcjet:ai:protected-tool")` brand key in
`agents/internal.ts` is **deliberately unchanged.** It is a registered-symbol
contract shared across module boundaries, AC5.2 does not cover it, and it
legitimately describes AI-SDK tool protection. Do not "tidy" it — a mismatch
between the symbol written by `guardTool` and the one read by `aiToolsContext`
would silently drop context for every tool.

Forward note for whoever revisits this: the key string names a package that will no
longer exist, which is cosmetically odd but harmless. Changing it is a coordinated
two-sided edit — the value written by `guardTool` and the value read by
`aiToolsContext` must change in the same commit — and it would break any consumer
that had come to rely on the registered symbol. No AC covers it deliberately.

**BREAKING CHANGE to `contextSchema.validate()` — do not preserve it as-is.**
arcjet-js#6171 widened metadata to `ArcjetMetadata = Record<string, unknown>`. The
current `validate()` walks `Object.values(metadata)` and rejects anything that is
not a string. That check is now **wrong**: it would refuse metadata the platform
accepts, and it is stricter than `guard()` itself, which ignores a non-object
`metadata` entirely and drops individual values it cannot encode with an `AJ1017`
warning rather than failing.

Replace the metadata branch with a plain-object check only:

- accept `undefined`
- accept an object whose `correlationId` is a `string` and whose `metadata` is
  either absent or a **plain object** (reject arrays and `null`)
- reject everything else

Delete the `Object.values(...).every(v => typeof v === "string")` test. Update the
JSON Schema shape alongside it: `metadata` was
`{ type: "object", additionalProperties: { type: "string" } }` and must become
`{ type: "object" }`, so the declared schema and the custom `validate()` agree.

Widen `GuardToolPolicy.metadata` (both the object form and the function-of-input
form) to `ArcjetMetadata`.

Preserve exactly, as all of these are tested:
- the injected `contextSchema` with its `validate()` — now accepting any
  plain-object metadata and rejecting only non-objects (AC4.7)
- the module-level `warnedMissingToolsContext` flag and `warnMissingToolsContext`,
  which warns on the **first** occurrence even when logging is off and respects
  `ARCJET_LOG_LEVEL` afterwards (AC4.6)
- the two wrap-time throws: no `execute` function, and a tool that already
  declares its own `contextSchema`
- `denialResult`: `retryable` only for `RATE_LIMIT`, and `retryAfterSeconds`
  computed only when retryable, so a co-occurring non-rate-limit rule's
  `resetAtUnixSeconds` is ignored (AC4.3)
- the `arcjetProtectedTool` brand on the returned object

Under `noUncheckedIndexedAccess`, revisit the `for (const result of
decision.results)` loop and the `"resetAtUnixSeconds" in result` narrowing.

**Verification:**

```bash
cd arcjet-guard && npm run typecheck && npm run lint
```
Expected: no errors.

**Commit:** `refactor(guard): move guardTool into the vercel-ai/v7 namespace`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: `guardTool` tests

**Verifies:** `guard-sdk-namespaces.AC4.1`, `AC4.2`, `AC4.3`, `AC4.4`, `AC4.5`,
`AC4.7`, `AC4.11` (the `guardTool` half)

**Files:**
- Create: `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` (unit)

**Implementation:**

Move `arcjet-ai/test/protect-tool.test.ts` → `src/vercel-ai/v7/guard-tool.test.ts` (22 tests). Retarget imports:
subjects from `./guard-tool.ts`, `createAgentContext` from
`../../agents/context.ts`, fixtures from `../../../test/_shared/stub-client.ts`
and `../../../test/_shared/log-level.ts`. Rename `createAiContext` →
`createAgentContext`.

Its line-4 `import type { DecisionDeny } from "@arcjet/guard"` must also become
`../../types.ts` (`DecisionDeny` at `src/types.ts:441`) — same stale
self-reference problem as the source files.

**Update the message assertion at line 539.** It reads
`JSON.stringify(call).includes("no ArcjetAiContext")`; Task 3 renamed that message,
so it becomes `"no ArcjetAgentContext"`. This is not optional polish — left alone
the assertion never matches, and because it sits inside
`warnCalls.some(...)` the test fails rather than silently passing. Either way it
must change with the message.

**Testing:**

Preserve all existing assertions. They map to the ACs as follows:
- `AC4.1`: ALLOW runs `execute` once, returns the sentinel by reference, capture
  fires with `outcome: "success"` and the guard `decisionId`
- `AC4.2`: DENY does not run `execute` and returns
  `{ arcjetDenied: true, reason, message, retryable }`; the `onDeny` hook can
  reshape that payload
- `AC4.3`: rate-limit denial includes `retryAfterSeconds`; the
  prompt-injection-with-reset case must NOT include it; the
  rate-limit-without-reset case falls back to the "later" wording
- `AC4.4`: guard throwing and guard returning `hasFailedOpen()` both still run
  `execute`, each with its own warning
- `AC4.5`: an explicit `policy.correlationId` overrides the context's; the
  context's is used otherwise; metadata merges context-then-policy
- `AC4.7` (**assertions inverted from the pre-#6171 suite**): `validate()` accepts
  `undefined`, a well-formed context, string metadata, **and now also** nested-object,
  array-valued, numeric, boolean and `null` metadata *values*; it rejects a numeric
  `correlationId`, a non-object `metadata` (string, number), and `metadata` that is
  `null` or an array. The existing test asserting non-string metadata values are
  *rejected* must be **rewritten to assert they are accepted** — leaving it will
  fail, and "fixing" it by restoring the old validation reintroduces the defect.
- `AC4.11` (new cases): with `onGuardError` omitted (so the `"deny"` default
  applies), **each** guard-unavailable signal — guard throws, and guard returns a
  decision whose `hasFailedOpen()` is `true` — must independently show that
  `execute` is never called, the returned result is
  `{ arcjetDenied: true, reason: "ERROR", retryable: true }` with no
  `retryAfterSeconds`, and capture fires once with `outcome: "denied"`. Assert both
  signals produce the *same* result shape (that collapsing is deliberate here).
  Also assert that a supplied `policy.onDeny` is **not** called on either path, and
  that `onGuardError: "allow"` restores fail-open execution for both.
  **Any migrated test that asserts fail-open execution must now set
  `onGuardError: "allow"` explicitly** — it would otherwise silently assert against
  the opposite default.
- plus: capture-only mode (absent/empty `rules` skips the guard), the
  missing-`experimental_capture` warning, both wrap-time throws, and
  rules/metadata supplied as functions of the input

Keep `setLogLevel(...)` with restore in `finally` throughout.

**Verification:**

```bash
cd arcjet-guard && npm run test-unit
```
Expected: ~24 guard-tool tests pass (22 migrated + ~2 new AC4.11 cases).

**Commit:** `test(guard): move guardTool tests into vercel-ai/v7`
<!-- END_TASK_4 -->

<!-- START_TASK_5 -->
### Task 5: Warn-once and `generateText` integration tests

**Verifies:** `guard-sdk-namespaces.AC4.6`, `AC4.5`

**Files:**
- Create: `arcjet-guard/src/vercel-ai/v7/warn-missing-context.test.ts` (unit)
- Create: `arcjet-guard/src/vercel-ai/v7/generate-text.test.ts` (integration)

**Implementation:**

Move both files with the same import retargeting as Task 4.

`warn-missing-context.test.ts` **must remain a separate file.** It asserts
first-occurrence-versus-later behaviour of the module-level
`warnedMissingToolsContext` flag, which is only deterministic because
`node --test` runs each file in its own process. Merging it into
`guard-tool.test.ts` would make the ordering depend on unrelated tests. The
existing file carries a comment saying exactly this — preserve it.

`generate-text.test.ts` drives the real `generateText` loop with
`MockLanguageModelV4` from `ai/test`. It needs no fixture changes beyond import
paths.

**Testing:**

**Update the message assertions in both files** to match Task 3's rename:
`generate-text.test.ts:176` and `warn-missing-context.test.ts:44` each assert
`JSON.stringify(...).includes("no ArcjetAiContext")` and become
`"no ArcjetAgentContext"`. Together with `guard-tool.test.ts:539` (Task 4) these
are the complete set of three assertions coupled to that message.

- `AC4.6` (warn-missing-context, 2 tests): with `ARCJET_LOG_LEVEL` unset, the
  first uncorrelated protected-tool call warns; a later one in the same process
  stays silent. Use `setLogLevel(undefined)` and restore.
- `AC4.5` / `AC4.6` (generate-text, 3 tests): with `toolsContext` supplied, the
  guard call receives the context's `correlationId`; without it, the guard call's
  `correlationId` is `undefined`, the tool still executes, and the missing-context
  warning fires; a DENY decision lets `generateText` complete with the denial
  result delivered to the model in the first step.

**Verification:**

```bash
cd arcjet-guard && npm run test-unit
```
Expected: 2 + 3 tests pass.

**Commit:** `test(guard): move warn-once and generateText tests into vercel-ai/v7`
<!-- END_TASK_5 -->
<!-- END_SUBCOMPONENT_B -->

<!-- START_SUBCOMPONENT_C (tasks 6-7) -->
<!-- START_TASK_6 -->
### Task 6: The namespace barrel with proxy re-exports

**Verifies:** `guard-sdk-namespaces.AC1.3`, `guard-sdk-namespaces.AC1.4`

**Files:**
- Modify: `arcjet-guard/src/vercel-ai/v7/index.ts` (replaces the Phase 1 `export {}`)

**Implementation:**

```ts
export { guardTool } from "./guard-tool.ts";
export type { ArcjetDenialResult, GuardToolPolicy } from "./guard-tool.ts";
export { aiToolsContext } from "./tools-context.ts";
export * from "../../agents/index.ts";
```

The `export *` is what makes this namespace self-sufficient. Use `export *`
rather than re-listing each symbol so the shared layer's surface cannot drift out
of sync, and so identity is preserved — a re-export binds the same function
object, whereas hand-wrapping would create new ones and break AC1.4.

Write a `@packageDocumentation` block stating: this is the Vercel AI SDK v7
namespace; it requires the `ai` and `@ai-sdk/provider-utils` optional peers; it
re-exports everything from `@arcjet/guard/agents` so one import path suffices;
and there is deliberately no unversioned `@arcjet/guard/vercel-ai` alias. Every
`@example` must compile against installed typings.

**Verification:**

```bash
cd arcjet-guard && npm run build && npm run typecheck
ls dist/vercel-ai/v7/index.js dist/vercel-ai/v7/index.d.ts
```
Expected: builds clean, both files present.

**Commit:** `feat(guard): add the @arcjet/guard/vercel-ai/v7 barrel`
<!-- END_TASK_6 -->

<!-- START_TASK_7 -->
### Task 7: Namespace surface, proxy identity, and export-map tests

**Verifies:** `guard-sdk-namespaces.AC1.1`, `AC1.2`, `AC1.3`, `AC1.4`, `AC1.5`,
`AC1.6`, `AC2.3`, `AC5.4` (partial — `guardTool` / `GuardToolPolicy` exported, no
`protectTool` identifier under `src/vercel-ai/`)

**Files:**
- Create: `arcjet-guard/src/vercel-ai/v7/index.test.ts` (unit)

**Implementation and testing:**

- `AC1.3`: assert the namespace exports `guardTool` and `aiToolsContext` as
  functions.
- `AC1.4`: import the namespace and `../../agents/index.ts` and assert
  `assert.strictEqual` between each shared export from both paths —
  `guardAction`, `captureAction`, `securityMetadata`, `createAgentContext`,
  `ArcjetDeniedError`. Same object identity, not merely same behaviour. Also
  assert the namespace's key set is a strict superset of the agents barrel's.
- `AC1.5` / `AC1.6`: assert against the **export map**, statically. Read
  `arcjet-guard/package.json` and assert `"./vercel-ai/v7"` and `"./agents"` are
  present, and that `"./vercel-ai"`, `"./vercel-ai/v6"`, and any wildcard key
  beginning `"./vercel-ai/"` other than the v7 literal are absent. This runs
  without a build, matching guard's unit-test convention.
- `AC1.2`: assert the agents barrel exports the five documented symbols.
- `AC5.4` (partial): assert this namespace exports `guardTool` (and that
  `GuardToolPolicy` type-checks), and that no file under `src/vercel-ai/` contains
  `protectTool` or `ProtectToolPolicy`.
- `AC1.1` needs **three** checks, because asserting export-map keys alone does not
  prove the root *symbol* surface is unchanged:
  1. assert the root export map has exactly the keys `.`, `./node`, `./bun`,
     `./fetch`, `./agents`, `./vercel-ai/v7`, and that the `.` entry's
     runtime-condition set (`bun`, `edge-light`, `workerd`, `deno`, `node`,
     `default`) is unchanged;
  2. assert the root barrel's named exports by name — at minimum `launchArcjet`
     and the rule builders `tokenBucket`, `fixedWindow`, `slidingWindow` are
     importable from `../../index.ts` and are functions;
  3. assert the root entry source files are **byte-identical to `main`**, which is
     the only check that catches an accidental addition or removal:

     ```bash
     cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
     git diff main -- arcjet-guard/src/index.ts arcjet-guard/src/node.ts \
                      arcjet-guard/src/fetch.ts arcjet-guard/src/bun.ts
     ```

     Expected: no output. Run this as a step in the task; it is a shell check, not
     a unit test. If it produces output, the root surface changed and AC1.1 fails —
     the design requires the root be untouched.

**Deferred to Phase 6 Task 1:** the *live* resolution checks. Verified during
planning against a throwaway package that `pkg/vercel-ai`, `pkg/vercel-ai/v6`, and
`pkg/agents/context` each throw `ERR_PACKAGE_PATH_NOT_EXPORTED`, but reproducing
that against `@arcjet/guard` itself needs a build plus resolution through the
package name, which belongs with the runtime suites. `test-requirements.md` —
produced by the planning workflow and already present alongside these phase files —
records this deferral.

**`AC2.3`** (v7 import fails when `ai` is absent) likewise cannot be proven in a
workspace where `ai` is a devDependency. Assert the *static* precondition here —
that `guard-tool.ts` and `tools-context.ts` do import from `ai` /
`@ai-sdk/provider-utils`, so the failure would be a genuine module-resolution
error (`ERR_MODULE_NOT_FOUND`) rather than a silent no-op. The live proof is
Phase 6 Task 2 Step 3, against a packed tarball in a project with no AI SDK.

**Verification:**

```bash
cd arcjet-guard && npm run test-unit && npm run typecheck && npm run lint && npm run build
```
Expected: all pass. Cumulative new tests for this phase: 1 + 22 + 2 + 3 + ~6.

**Commit:** `test(guard): verify the vercel-ai/v7 surface, proxy identity, and export map`
<!-- END_TASK_7 -->
<!-- END_SUBCOMPONENT_C -->

---

## Phase 3 exit checklist

- [ ] `src/vercel-ai/v7/` contains `guard-tool.ts`, `tools-context.ts`,
      `index.ts` and their `.test.ts` files
- [ ] `index.ts` uses `export *` from the agents barrel (identity preserved)
- [ ] `package.json` still has no `./vercel-ai` key and no wildcard
- [ ] no remaining `from "@arcjet/guard"` imports in moved files or their tests —
      all retargeted to `../../types.ts`
- [ ] `guard-tool.ts`'s JSDoc `@example` rewritten; no `@arcjet/ai` or
      `createAiContext` left
- [ ] `contextSchema.validate()` no longer checks metadata value types; the JSON
      Schema's `additionalProperties: { type: "string" }` removed to match
- [ ] `GuardToolPolicy.metadata` widened to `ArcjetMetadata`
- [ ] `onGuardError` threaded into `guardTool`, **defaulting to `"deny"`**; **both**
      guard-unavailable signals return `reason: "ERROR"` / `retryable: true` with no
      `retryAfterSeconds`; `onDeny` not invoked on either path
- [ ] the 4 runtime message strings in `guard-tool.ts` renamed to
      `@arcjet/guard:` / `ArcjetAgentContext`
- [ ] all 3 coupled test assertions updated to `"no ArcjetAgentContext"`
      (`guard-tool.test.ts`, `generate-text.test.ts`, `warn-missing-context.test.ts`)
- [ ] `Symbol.for("arcjet:ai:protected-tool")` left unchanged (deliberate)
- [ ] all four root entry files are byte-identical to `main` (AC1.1) — every
      pathspec must be repo-root-relative or it silently matches nothing:
      `git diff main -- arcjet-guard/src/index.ts arcjet-guard/src/node.ts
      arcjet-guard/src/fetch.ts arcjet-guard/src/bun.ts` is empty
- [ ] all migrated tests pass; `npm run test-unit` green **with a total count
      consistent with baseline + all migrated tests**
- [ ] `npm run typecheck`, `npm run lint`, `npm run build` all green
- [ ] `dist/vercel-ai/v7/index.js` and `.d.ts` emitted
- [ ] every test from `arcjet-ai/test/` now has a home under `arcjet-guard`
      (nothing left to migrate) — Phase 4 can safely delete `arcjet-ai/`
