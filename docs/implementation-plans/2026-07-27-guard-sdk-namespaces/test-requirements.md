# Test Requirements — Guard SDK Namespaces

**Design plan:** `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`
**Implementation plan:** `docs/implementation-plans/2026-07-27-guard-sdk-namespaces/phase_01.md` … `phase_06.md`
**Criterion namespace:** `guard-sdk-namespaces.ACn.m` (39 criteria: AC1.1–AC1.6, AC2.1–AC2.3, AC3.1–AC3.2, AC4.1–AC4.14, AC5.1–AC5.4, AC6.1–AC6.3, AC7.1–AC7.2, AC8.1–AC8.3, AC9.1–AC9.2)
**Environment verified:** 2026-07-27 — node v24.18.0, bun 1.3.12, miniflare 4.20260708.1 (devDependency), **deno NOT installed**

## How to read this document

Every one of the 39 acceptance criteria appears **exactly once** in the mapping below — either in §1 (automated) or in §2 (human/CI). §3 lists the gates that are shell commands rather than tests; §4 states the hard requirement around `guard-sdk-namespaces.AC9.2`; §5 records the false-confidence traps that make a green run untrustworthy.

Test types used:

| Type | Meaning |
|---|---|
| **unit** | `arcjet-guard/src/**/*.test.ts`, run by `npm run test-unit`, imports **source** (`./foo.ts`), needs no build |
| **integration** | Drives a real external loop (`generateText` with `MockLanguageModelV4`) or a real bundler (the Next.js example build) |
| **packaging** | Runs against a packed tarball (`npm pack`) installed into a scratch project **outside** the workspace |
| **shell-check** | An asserting shell/python command, not a test file; still a blocking gate (see §3) |

Two structural facts drive most of the classification decisions:

1. **`ai` is a devDependency of `arcjet-guard`, so it is always present inside the workspace.** Nothing run from inside the workspace can prove behaviour when `ai` is absent. `guard-sdk-namespaces.AC2.2`, `.AC2.3` and `.AC3.2` are therefore proven **only** by Phase 6 Task 2, which packs a real tarball and installs it into a scratch project with no AI SDK. Phase 2 Task 11 **explicitly disclaims** AC2.2; do not let its static import-graph assertion be mistaken for the proof.
2. **Unit tests run without a build, so Phase 3 can only assert the export map statically.** `guard-sdk-namespaces.AC1.3`, `.AC1.5` and `.AC1.6` get a static `package.json` key assertion in Phase 3 Task 7 **plus** a live `ERR_PACKAGE_PATH_NOT_EXPORTED` probe through the package name in Phase 6 Task 1. Both legs are required; neither alone is sufficient.

---

## 1. Automated coverage map

### guard-sdk-namespaces.AC1 — Subpaths resolve as specified

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC1.1` | `import { launchArcjet, tokenBucket } from "@arcjet/guard"` resolves, and the root export surface is unchanged from `main` (no additions, no removals). | unit **+** shell-check | `arcjet-guard/src/vercel-ai/v7/index.test.ts` (export-map keys + root-condition set + named exports from `../../index.ts`) **and** the `git diff main` check on the four root entry sources (§3, gate SG-2) | Phase 3 Task 7 |
| `guard-sdk-namespaces.AC1.2` | `import { createAgentContext, securityMetadata, guardAction, captureAction, ArcjetDeniedError } from "@arcjet/guard/agents"` resolves. | unit | `arcjet-guard/src/vercel-ai/v7/index.test.ts` (asserts the five documented symbols) **and** `arcjet-guard/src/agents/index.test.ts` (sorted-key surface assertion) | Phase 3 Task 7; Phase 2 Task 11 |
| `guard-sdk-namespaces.AC1.3` | `import { guardTool, aiToolsContext } from "@arcjet/guard/vercel-ai/v7"` resolves. | unit **+** packaging | `arcjet-guard/src/vercel-ai/v7/index.test.ts` (both are functions); live probe of `@arcjet/guard/vercel-ai/v7` through the package name | Phase 3 Tasks 1, 2, 7; **live:** Phase 6 Task 1 Step 1 |
| `guard-sdk-namespaces.AC1.4` | The v7 namespace re-exports the shared layer, and each proxied export is the *same function identity* as the one from `@arcjet/guard/agents`. | unit | `arcjet-guard/src/vercel-ai/v7/index.test.ts` — `assert.strictEqual` on `guardAction`, `captureAction`, `securityMetadata`, `createAgentContext`, `ArcjetDeniedError` imported from both paths, plus "namespace key set is a strict superset of the agents barrel" | Phase 3 Task 6 (`export *`), Task 7 (assertions); survives packaging per Phase 6 Task 2 Step 4 |
| `guard-sdk-namespaces.AC1.5` | `@arcjet/guard/vercel-ai` (unversioned) does not resolve. | unit (static export map) **+** packaging (live) | `arcjet-guard/src/vercel-ai/v7/index.test.ts` — reads `arcjet-guard/package.json`, asserts `"./vercel-ai"` absent and no wildcard key beginning `"./vercel-ai/"` other than the v7 literal; live `ERR_PACKAGE_PATH_NOT_EXPORTED` probe | Phase 3 Task 7; **live:** Phase 6 Task 1 Step 1 |
| `guard-sdk-namespaces.AC1.6` | `@arcjet/guard/vercel-ai/v6` (unsupported major) does not resolve. | unit (static export map) **+** packaging (live) | same file as AC1.5 — asserts `"./vercel-ai/v6"` absent; live `ERR_PACKAGE_PATH_NOT_EXPORTED` probe (the probe also covers deep-path encapsulation via `@arcjet/guard/agents/context`) | Phase 3 Task 7; **live:** Phase 6 Task 1 Step 1 |

Notes:

- AC1.1 needs **all three** of its checks. Asserting export-map keys alone does not prove the root *symbol* surface is unchanged, and asserting importable symbols alone does not catch an addition. The byte-identity `git diff main` check is the only leg that catches an accidental addition or removal.
- AC1.5/AC1.6 are satisfied by an **absence** in `exports`, not by code. Phase 1 Task 1 forbids a `"./vercel-ai"` key and forbids a `"./vercel-ai/*"` wildcard for exactly this reason. If Phase 6 Task 1 reports `UNEXPECTEDLY RESOLVED`, a key or wildcard crept in.

### guard-sdk-namespaces.AC2 — The shared layer has no AI SDK coupling

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC2.1` | No module reachable from `dist/agents/index.js` imports `ai` or any `@ai-sdk/*` package. | unit | `arcjet-guard/src/agents/index.test.ts` — walks the **transitive** source import graph from `src/agents/index.ts`, resolving and following every relative specifier (the graph legitimately leaves the directory: `capture.ts` → `../types.ts`), and asserts no file reached contains a static `import … from` / `export … from` whose specifier is `ai` or matches `@ai-sdk/*` | Phase 2 Task 11 |
| `guard-sdk-namespaces.AC2.2` | `@arcjet/guard/agents` imports successfully with `ai` and `@ai-sdk/provider-utils` absent from `node_modules`. | **packaging (out-of-workspace)** | No committed test file. Scratch project from `mktemp -d` with the packed tarball installed; imports `@arcjet/guard/agents`, asserts the five symbols exist and `createAgentContext({correlationId:"probe-1"})` round-trips | **Phase 6 Task 2 Step 2 — ONLY** |
| `guard-sdk-namespaces.AC2.3` | `@arcjet/guard/vercel-ai/v7` fails to import when `ai` is absent — documenting the peer requirement rather than failing silently. | **packaging (out-of-workspace)**, with a unit precondition | Live: same scratch project — `await import("@arcjet/guard/vercel-ai/v7")` must **throw** `ERR_MODULE_NOT_FOUND` / `MODULE_NOT_FOUND`. Static precondition in `arcjet-guard/src/vercel-ai/v7/index.test.ts`: `guard-tool.ts` and `tools-context.ts` **do** import from `ai` / `@ai-sdk/provider-utils`, so the failure is a genuine resolution error rather than a silent no-op | **Live: Phase 6 Task 2 Step 3.** Static precondition: Phase 3 Task 7 |

Notes on the AC2.2 boundary — this is the single most rationalised decision in this document:

- Phase 2 Task 11 states verbatim that **AC2.2 is not claimed there**. The transitive-graph walk is a *strong static proxy*, nothing more; it runs in a workspace where `ai` resolves fine.
- AC2.2's load-bearing proof is Phase 6 Task 2 Step 2, and it is load-bearing precisely because it executes where `ai` genuinely does not exist.
- Consequence for reporting: **AC2.2 may not be marked satisfied by any Phase 2 result.** If Phase 6 Task 2 is skipped, AC2.2 is unproven regardless of how green `test-unit` is.
- Phase 6 Task 2 Step 4 (install `ai@7.0.36` + `@ai-sdk/provider-utils@5.0.12`, then import v7 successfully and confirm `guardAction` is present) is the positive control for AC2.3 and a packaging-level re-confirmation of AC1.4. Without it, an AC2.3 "pass" is indistinguishable from a broken tarball.

### guard-sdk-namespaces.AC3 — AI SDK peers are optional

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC3.1` | `ai` and `@ai-sdk/provider-utils` appear in `peerDependencies` and are marked optional in `peerDependenciesMeta`. | shell-check | Inline `python3` assertion over `arcjet-guard/package.json`: `peerDependenciesMeta.ai.optional is True` and `peerDependenciesMeta["@ai-sdk/provider-utils"].optional is True` (§3, gate SG-1) | Phase 1 Task 1 Step 2 |
| `guard-sdk-namespaces.AC3.2` | Installing a project that depends on `@arcjet/guard` without any AI SDK produces no peer-dependency warning or error. | **packaging (out-of-workspace)** | No committed test file. `npm install "$TARBALL_ABS"` in the scratch project, then `grep -iE "peer dep|ERESOLVE|npm warn" install.log` must find nothing | **Live: Phase 6 Task 2 Step 1** |

Notes:

- Phase 1 Task 2 Step 2 (`npm install` at the repo root, grep for peer warnings) is **not** proof of AC3.2. Inside the workspace `ai` and `@ai-sdk/provider-utils` resolve because they are devDependencies, so the optional-peer declaration is never exercised. Phase 1's own text records this deferral. Treat the Phase 1 run as a smoke check only.
- AC3.1's only assertion is a shell check on a static file; it is not a regression gate that would fire on a later edit. Accepted, because AC3.2's live check is the behavioural proof and would fail if the declaration regressed.
- **pnpm caveat is out of scope for the ACs but must be documented, not tested:** pnpm does not reliably honour `peerDependenciesMeta.*.optional` (pnpm#5152, #8142), especially under `--strict-peer-dependencies`. Phase 5 Task 4 records it in the README; no test asserts pnpm behaviour.

### guard-sdk-namespaces.AC4 — Migrated behaviour is preserved

All of AC4 is behaviour **preservation** of an existing, passing suite. Do not rewrite these tests from scratch and do not add coverage beyond the criteria listed.

| ID | Criterion | Type | Test file | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC4.1` | Guard ALLOW → the wrapped tool executes once and an event is captured with `outcome: "success"`. | unit | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` (returns the sentinel by reference; capture carries the guard `decisionId`) | Phase 3 Task 4 |
| `guard-sdk-namespaces.AC4.2` | Guard DENY → the tool never executes and the model receives an `ArcjetDenialResult` carrying `reason` and `retryable`. | unit | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` (`{ arcjetDenied: true, reason, message, retryable }`; the `onDeny` hook can reshape the payload) | Phase 3 Task 4 |
| `guard-sdk-namespaces.AC4.3` | For a real `DecisionDeny`, a `RATE_LIMIT` denial carries `retryAfterSeconds` and a non-rate-limit denial omits it, even when a co-occurring rule result has a reset time. This criterion is scoped to **actual denials**: the guard-unavailable result also has a non-rate-limit `reason` yet deliberately does carry `retryAfterSeconds` per AC4.13, so an implementation written as "omit whenever `reason !== "RATE_LIMIT"`" satisfies this criterion while breaking that one. | unit | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` — three cases: rate-limit-with-reset includes it; prompt-injection-with-reset must **not** include it; rate-limit-without-reset falls back to the "later" wording | Phase 3 Task 4 |
| `guard-sdk-namespaces.AC4.4` | With `onGuardError: "allow"` set explicitly (opting out of the default), either guard-unavailable signal → the tool still executes (fail open) and a warning is emitted, gated on `ARCJET_LOG_LEVEL`. Both signals are covered: the guard call throwing, and a returned decision whose `hasFailedOpen()` is `true`. | unit | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` — both fail-open paths (guard throws; guard returns a decision whose `hasFailedOpen()` is true), each with its own warning. **Every case here must set `onGuardError: "allow"` explicitly** — these tests migrate from a suite where fail-open was the default, and left unchanged they compile while asserting the opposite of current behaviour | Phase 3 Task 4 and **Phase 2 Task 9** (the `guardAction` half, in `arcjet-guard/src/agents/guard-action.test.ts`); engine: Phase 2 Task 7 |
| `guard-sdk-namespaces.AC4.5` | A context's `correlationId` reaches both the guard call and the capture call. | unit **+** integration | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` (explicit `policy.correlationId` overrides the context's; the context's is used otherwise; metadata merges context-then-policy) **and** `arcjet-guard/src/vercel-ai/v7/generate-text.test.ts` (real `generateText` loop with `MockLanguageModelV4` from `ai/test`) | Phase 3 Tasks 4 and 5 |
| `guard-sdk-namespaces.AC4.6` | A protected tool invoked with no context warns on the first occurrence even with logging off, and stays silent afterwards unless `ARCJET_LOG_LEVEL` is set. | unit **+** integration | `arcjet-guard/src/vercel-ai/v7/warn-missing-context.test.ts` (2 tests) — **must stay its own file**: it asserts first-occurrence-versus-later behaviour of the module-level `warnedMissingToolsContext` flag, which is only deterministic because `node --test` runs each file in its own process. Second leg: the no-`toolsContext` case in `generate-text.test.ts` | Phase 3 Task 5 |
| `guard-sdk-namespaces.AC4.7` | The injected `contextSchema` rejects a non-string `correlationId`, and rejects `metadata` that is not a plain object. It **accepts** any plain-object metadata regardless of value types — nested objects, arrays, numbers, booleans, `null` — matching `ArcjetMetadata` (arcjet-js#6171). Validating value **types** here would be stricter than `guard()` itself, which drops what it cannot encode with an `AJ1017` warning rather than failing. Rejecting a non-plain-object `metadata` is a separate, deliberate choice and is **not** justified by that argument — `guard()` drops such metadata entirely and silently, with no warning at all (`arcjet-guard/src/metadata.ts`), so this criterion really is stricter on that one input. It is stricter on purpose: `contextSchema` validates data arriving through a model-driven tool call, where failing fast on a malformed shape beats silently discarding the whole map. | unit | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` — `contextSchema.validate()` accepts `undefined`, a well-formed context, and metadata with string / nested-object / array / numeric / boolean / `null` values; rejects a numeric `correlationId`, a non-object `metadata`, and `metadata` that is `null` or an array. **The pre-#6171 assertion that non-string values are rejected is inverted, not deleted** | Phase 3 Tasks 3 and 4 |
| `guard-sdk-namespaces.AC4.8` | `guardAction` returns the function's value on ALLOW; on DENY it throws `ArcjetDeniedError` carrying the decision and never runs the function. | unit | `arcjet-guard/src/agents/guard-action.test.ts` — ALLOW runs the function once and resolves with the same reference; DENY throws with `reason === "RATE_LIMIT"`, a message naming action and reason, and the function never called | Phase 2 Task 9 |
| `guard-sdk-namespaces.AC4.9` | `captureAction` emits an event with the context's correlation id and merged metadata, with no `decisionId` and no `outcome` key. | unit | `arcjet-guard/src/agents/guard-action.test.ts` — one event, metadata merged context-then-options, `decisionId` undefined, **no** `outcome` key | Phase 2 Task 9 |
| `guard-sdk-namespaces.AC4.10` | A client lacking `experimental_capture()` causes no throw; capture no-ops with a gated warning. | unit | `arcjet-guard/src/agents/capture.test.ts` (new file, ~3 tests) — missing method: no throw, warning when `ARCJET_LOG_LEVEL` permits; inverse: present method called once with the passed options and no warning; plus a throwing `experimental_capture` is swallowed | Phase 2 Task 4 |
| `guard-sdk-namespaces.AC4.11` | With the default `onGuardError: "deny"`, **any** guard-unavailable signal → the wrapped tool or action does NOT execute and the outcome is captured as `unavailable` (**not** `denied` — a policy outage and a policy denial must stay distinguishable on the capture stream, which is the surface operators actually query). `guardTool` returns an `ArcjetDenialResult` with `reason: "ERROR"`, `retryable: true`, and the fixed `retryAfterSeconds` of AC4.13. `guardAction` throws `ArcjetGuardUnavailableError` — distinct from `ArcjetDeniedError` (see AC4.12 for how the signals are carried on it). `policy.onDeny` is not invoked on any signal. | unit | `arcjet-guard/src/agents/guard-action.test.ts` (~5 net-new cases: **each signal separately** — function never called, capture `unavailable`; **not** `instanceof ArcjetDeniedError`; a real DENY still throws `ArcjetDeniedError`; `onDeny` not invoked on either signal; `onGuardError: "allow"` restores fail-open for both) and `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` (~3 cases: identical denial-result shape for both signals, with `reason: "ERROR"` and `retryable: true`, and fixed `retryAfterSeconds`; `policy.onDeny` NOT invoked on either) | Phase 2 Tasks 7-9; Phase 3 Tasks 3-4 |
| `guard-sdk-namespaces.AC4.12` | The guard-unavailable signals stay distinguishable on `ArcjetGuardUnavailableError`. When the guard call **threw**, `.cause` is that error by reference and `.decision` is `undefined`. When a decision **failed open**, `.decision` is that `DecisionAllow` (so `errorResults()` yields the error detail) and `.cause` is `undefined`. Both legs assert the populated field **and** that the other reads `undefined` — asserting only the populated one passes against an implementation that always sets both. Test with `=== undefined`, **not** `in`: `decision` is a declared optional field, so it is an own property whose value is `undefined` on the thrown path. | unit | `arcjet-guard/src/agents/guard-action.test.ts` — one case per signal asserting which field is populated *and* which is `undefined` (asserting only the populated one would pass against a shape that always sets both), plus that **neither** capture event carries a `decisionId` key — every decision the client synthesizes on a fail-open path has `id: ""` (`client.ts:216`, `convert.ts:743`), so there is no correlatable id on either signal, and the engine must gate on a **non-empty** id rather than `!== undefined` (which lets `""` through). An assertion that the failed-open event carries an `id` would assert the empty string and pass vacuously | Phase 2 Tasks 7-9 |
| `guard-sdk-namespaces.AC4.13` | The fail-closed tool result carries `retryAfterSeconds: 5`. Omitting a hint entirely invites an immediate model retry, and every retry issues another `guard()` call that also fails — amplifying load against an already-degraded Arcjet at every consequential call site at once. The value is a fixed backoff hint, **not** a prediction of when the policy becomes evaluable. 5 is a deliberate constant chosen to pace a model's retry loop — long enough that a retry is not effectively immediate, short enough that the agent does not appear hung. It is deliberately **not** derived from the client's request timeout: that is configurable per call site (`timeoutSeconds`), and this design recommends raising it at latency-sensitive sites, so a hint derived from it would have to change with it. It is asserted as an exact value, not merely as present. | unit | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` (the assertion rides inside AC4.11's ~3 cases rather than adding one: `retryAfterSeconds === 5` exactly, not merely present) | Phase 3 Task 4 |
| `guard-sdk-namespaces.AC4.14` | The warning emitted on a guard-unavailable path names the mode it actually took. On the `"deny"` default the emitted string does **not** contain `"failing open"` and does identify the signal; on `onGuardError: "allow"` it does. Both modes emit for both signals, gated on `ARCJET_LOG_LEVEL`. Today's two strings both say "failing open", so a copy-paste migration silently keeps the misleading text — this criterion is what catches that. | unit | `arcjet-guard/src/agents/guard-action.test.ts` and `.../vercel-ai/v7/guard-tool.test.ts` — the AC4.4 cases assert the `"failing open"` / `"failed open"` substring and the AC4.11 cases assert `"failing closed"` / `"was unavailable"`. **The migrated assertions test only `includes("guard check") && includes("errored")`, which both modes satisfy — they must be tightened, not carried over** | Phase 2 Task 9; Phase 3 Task 4 |

Cross-cutting requirements for the whole AC4 block:

- **Log-level handling:** every test that manipulates `ARCJET_LOG_LEVEL` must use `setLogLevel(...)` from `arcjet-guard/test/_shared/log-level.ts` with the restore call in `finally`. Do not delete the variable unconditionally — that clobbers ambient state.
- **Fixtures live outside `src/`:** `arcjet-guard/test/_shared/stub-client.ts` and `.../log-level.ts`. Anything non-test under `src/` is published in `dist/` (tsdown entry is `["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts"]`), so a stub client under `src/` would ship to users.
- **Type imports resolve to source, never the package name.** `Decision` (`src/types.ts:449`), `DecisionDeny` (`:441`), `RuleWithInput` (`:1668`), `GuardOptions` (`:1678`) come from `../types.ts` / `../../types.ts`. A `from "@arcjet/guard"` import inside `arcjet-guard` is a stale self-reference against its own possibly-outdated `dist/` typings — this applies to `guard-tool.test.ts`'s line-4 `DecisionDeny` import too.
- **Metadata is `ArcjetMetadata`, not `Record<string, string>`.** arcjet-js#6171 widened it to any JSON-serializable value. No helper may validate metadata value types: `guard()` drops what it cannot encode with an `AJ1017` warning and ignores non-object metadata, so a stricter check rejects what the platform accepts. `securityMetadata()`'s *return* widens; its input fields stay string-typed. The vocabulary helper lives at `src/agents/vocabulary.ts`, not `metadata.ts`, because #6171 added `arcjet-guard/src/metadata.ts` for the encoding machinery.
- **Type-only exports need type-level checks.** `OnGuardError` is public surface but invisible to `Object.keys` on a namespace import. Phase 2 Task 11 asserts it via `import type` + a trivial assignment so a missing export fails `npm run typecheck`.
- **`Symbol.for("arcjet:ai:protected-tool")` is deliberately unchanged.** `tools-context.test.ts` hardcodes it via `Symbol.for(...)`, which is the actual cross-module contract. AC5.2 does not cover it. A mismatch between the symbol `guardTool` writes and the one `aiToolsContext` reads silently drops context for every tool.

### guard-sdk-namespaces.AC5 — The renames are complete

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC5.1` | `createAgentContext` and `ArcjetAgentContext` are the exported names. | unit | `arcjet-guard/src/agents/index.test.ts` — compares sorted `Object.keys` of a namespace import against a literal list, so an accidental addition *or* removal fails loudly. Reinforced structurally by `arcjet-guard/src/agents/context.test.ts` importing both names and compiling | Phase 2 Tasks 5, 6, 10, 11 |
| `guard-sdk-namespaces.AC5.2` | No `createAiContext` or `ArcjetAiContext` identifier remains anywhere in source, tests, docs, the skill, or the example. | shell-check (authoritative) **+** unit (partial) | **Authoritative gate:** repo-wide `grep` sweep excluding only `node_modules`, `package-lock`, `docs/design-plans/`, `docs/implementation-plans/` (§3, gate SG-6). **Partial:** `arcjet-guard/src/agents/index.test.ts` asserts no file under `src/agents/` or `test/_shared/` contains either identifier | Partial: Phase 2 Task 11. **Authoritative: Phase 5 Task 7 Step 3** |
| `guard-sdk-namespaces.AC5.3` | `createAgentContext` rejects a caller-supplied `correlationId` that is not a string, is empty, exceeds 256 characters, or contains non-printable characters — naming the offending problem in the error and never truncating. | unit | `arcjet-guard/src/agents/context.test.ts` (10 tests after the split) — ULID shape (26 Crockford base32 chars) and uniqueness; supplied id preserved verbatim; `correlationId: undefined` generates rather than throws; rejection of 257 chars, embedded newline, non-ASCII, empty string, and a non-string value with the offending type named; JSON round-trip fidelity | Phase 2 Tasks 5 and 6 |
| `guard-sdk-namespaces.AC5.4` | The enforcing helpers are exported as `guardTool` and `guardAction` (with `GuardToolPolicy` / `GuardActionPolicy`); no `protectTool`, `protectAction`, `ProtectToolPolicy` or `ProtectActionPolicy` identifier remains anywhere in source, tests, docs, the skill, or the example. | unit **+** shell-check | Barrel surface assertions in `src/agents/index.test.ts` and `src/vercel-ai/v7/index.test.ts`; authoritative repo-wide sweep at Phase 5 Task 7 Step 3 (§3, gate SG-6, whose pattern now also matches the four old verb identifiers) | Phase 2 (guardAction), Phase 3 (guardTool), Phase 5 Task 7 (sweep) |

Notes:

- **AC5.2 has three sequential states and only the last one is a gate.** Phase 2 verifies `src/agents/**` + `test/_shared/**` only. Phase 5 Task 5 Step 2 is an explicit **dry run** whose expected output is hits in `docs/test-plans/2026-07-23-pilot-framework-helper.md` and nothing else — `clean` is *not* required there. Only Phase 5 Task 7 Step 3, run after the README port (Task 6) and the test-plan rewrite (Task 7), may require `clean`. Reporting AC5.2 satisfied from the Task 5 dry run is a false claim.
- **The rename extends to runtime message strings.** All line numbers below are **source-side**, i.e. in `arcjet-ai/` as it exists today; the files land under their new `guard-*` names. The `@arcjet/ai:` prefix becomes `@arcjet/guard:` in `context.ts` (80), `client.ts`→`capture.ts` (63), `guarded.ts` (51, 58) and `protect-tool.ts`→`guard-tool.ts` (88, 107, 178, 182); embedded `ArcjetAiContext` becomes `ArcjetAgentContext` at `protect-tool.ts` 88 and 107, and `protectTool()` becomes `guardTool()` at 178 and 182. `capture.ts` line 63 needs rewording, not a prefix swap, or it reads "@arcjet/guard: this @arcjet/guard client does not support…". See trap **T3** in §5 for the three test assertions coupled to the line-107 message.
- **`erasableSyntaxOnly` is enabled:** `ArcjetDeniedError` must not use TypeScript parameter properties; declare the `decision` field and assign it in the constructor body.

### guard-sdk-namespaces.AC6 — The separate package is gone

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC6.1` | `arcjet-ai/` does not exist and no workspace named `@arcjet/ai` resolves. | shell-check | `npm install` then `npm ls --workspaces --depth=0 2>&1 \| grep "@arcjet/ai"` must find nothing (§3, gate SG-4). Preceded by the 23-path destination assertion that gates the irreversible delete | Phase 4 Task 1 Steps 1 and 6 |
| `guard-sdk-namespaces.AC6.2` | `git diff main` is empty for `.github/.release-please-manifest.json`, `.github/release-please-config.json`, and `.github/workflows/publish.yml`. | shell-check | `git diff main -- <the three files>` produces no output; plus the one-shot `git diff main --name-only -- .github/ \| grep -v reusable-examples.yml` (§3, gate SG-3) | Phase 4 Task 2 Step 2, Task 3 Steps 2 and 4; re-confirmed Phase 6 Task 3 Step 5 |
| `guard-sdk-namespaces.AC6.3` | `.github/workflows/reusable-examples.yml` still lists `nextjs-ai-agent`. | shell-check | `grep -n "nextjs-ai-agent" .github/workflows/reusable-examples.yml` → exactly one match (§3, gate SG-5) | Phase 4 Task 3 Step 3 |

Notes:

- AC6.2 requires an **empty** diff, so the branch's incidental reordering of `linked-versions` in `release-please-config.json` (it moved `@arcjet/analyze-wasm` while inserting `@arcjet/ai`) must be reverted too, not just the insertion. There are **two** locations in that file: the package block and the `plugins → linked-versions → components` list.
- Do not rely on visual inspection for AC6.2. `git diff main` is the authoritative check.
- `.github/workflows/reusable-examples.yml` is expected to be the **only** file under `.github/` this branch still changes.
- **Known transient state at Phase 4 end, not a regression:** `examples/nextjs-ai-agent` cannot install, because its `package.json` and its own `package-lock.json` still point at `file:../../arcjet-ai`. Phase 5 Task 1 repairs it. Root install and all `arcjet-guard` verification stay green.

### guard-sdk-namespaces.AC7 — The example runs on the new paths

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC7.1` | The example imports only from `@arcjet/guard`, `@arcjet/guard/agents`, and `@arcjet/guard/vercel-ai/v7`, and its `package.json` has no `@arcjet/ai` dependency. | shell-check | `grep -rn "@arcjet/ai" examples/nextjs-ai-agent --include=*.ts --include=*.tsx --include=*.json --include=*.md \| grep -v package-lock` → `clean` (§3, gate SG-7). `--include=*.md` is load-bearing: `examples/nextjs-ai-agent/README.md:79` mentions `@arcjet/ai` and Phase 5 Task 1 owns that edit | Phase 5 Task 1 Step 3 |
| `guard-sdk-namespaces.AC7.2` | The example builds. | integration (real bundler) | No test file. `npm run build --workspace @arcjet/guard` **first**, then `npm run build` inside `examples/nextjs-ai-agent` | Phase 5 Task 2; re-run at Phase 6 Task 3 Step 4 |

Notes:

- The example is the **only** place the new export map is resolved by a real bundler, which is why AC7.2 is classified as integration rather than a shell smoke check.
- Guard must be built first: the `file:` dependency resolves through a symlink into the workspace and the export map points at `dist/`. If the example fails to resolve `@arcjet/guard/vercel-ai/v7` or `@arcjet/guard/agents`, confirm `arcjet-guard/dist/vercel-ai/v7/index.js` and `dist/agents/index.js` exist **before** investigating the bundler.
- Turbopack has a documented bug resolving subpath exports for *transitive* dependencies (vercel/next.js#88540). The example depends on `@arcjet/guard` directly — the case that should work. If the build fails on module resolution, test whether webpack succeeds where Turbopack does not and record the finding in the README (Phase 5 Task 4 item 5).
- `workflows/support-agent.ts` must import the proxied symbols from the **single** `@arcjet/guard/vercel-ai/v7` path, not split across two imports — that is how AC1.4 gets exercised in a real consumer. The `"use workflow"` / `"use step"` directives stay.

### guard-sdk-namespaces.AC8 — Documentation carries the convention

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC8.1` | The integration skill lives under `arcjet-guard/skills/`, and `skills/` is included in the package's `files`. | shell-check (packaging) | `python3 -c "import json; print('skills/' in json.load(open('package.json'))['files'])"` → `True`, **and** `npm pack --dry-run 2>&1 \| grep -c "skills/"` → non-zero (§3, gate SG-8). Target file: `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md` | `files` entry: Phase 1 Task 1 item 5. Content + check: Phase 5 Task 3 Step 2 |
| `guard-sdk-namespaces.AC8.3` | The README states the `<vendor-sdk>/v<major>` convention, the optional-peer requirement, and the no-unversioned-alias rule, and names `vercel-eve/v1` as the next target. | shell-check | `arcjet-guard/README.md` must contain the distinctive strings `@arcjet/guard/agents`, `@arcjet/guard/vercel-ai/v7`, `vercel-eve/v1`, `peerDependenciesMeta`, `ERR_PACKAGE_PATH_NOT_EXPORTED`; plus `grep -qiE "no unversioned\|does not resolve\|explicit version"` and `grep -qi "pnpm"` (§3, gate SG-9) | Phase 5 Task 4 Step 2 |

Note: the AC8.3 grep must use those **distinctive** strings. Greping for `optional` or `agents` proves nothing — both already occur in the current README and in ordinary prose.

`guard-sdk-namespaces.AC8.2` is **not** automatable in-repo → see §2.

### guard-sdk-namespaces.AC9 — Guard's own verification stays green

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `guard-sdk-namespaces.AC9.1` | Build, `tsconfig.json` and `tsconfig.lint.json` typechecks, lint, and unit tests with coverage all pass. | shell-check (suite gate) | From `arcjet-guard/`: `npm run build`; `npm run typecheck` (runs **both** `tsc --noEmit` and `tsc --project tsconfig.lint.json --noEmit`); `npm run lint` (`oxlint --tsconfig=tsconfig.lint.json`); `npm run test-unit` (unit + coverage). **Plus the mandatory count reconciliation to ≈421** — see trap **T1** in §5 | Phase 6 Task 3 Step 1 (incrementally gated in every earlier phase) |

`guard-sdk-namespaces.AC9.2` is **not** fully verifiable on this machine → see §2 and §4.

---

## 2. HUMAN / CI VERIFICATION

Two criteria cannot be automated as an in-repo regression gate.

### `guard-sdk-namespaces.AC8.2`

> **Success:** Every code example in the README, JSDoc, and skill compiles against the installed typings.

**Why it cannot be automated in-repo:** there is no committed doc-example extraction harness, and none is created by any phase. The `tsc --noEmit` run is scriptable, but the *input set* — which fenced blocks and which `@example` bodies count, and what surrounding scaffolding each needs to stand alone — is assembled by hand into a throwaway directory. A missed block produces a silent pass, so the check's validity rests on a human enumerating the complete source list. Nothing in CI would catch a later regression.

**Exact verification procedure** (Phase 5 Task 5 sweep A, re-run after Phase 5 Task 6 adds README blocks):

1. Create `/tmp/doc-example-check/` (throwaway, never committed).
2. Extract **every** TypeScript block from **all** of these sources — not a subset:

   | Source | Blocks |
   |---|---|
   | `arcjet-guard/README.md` | all TS code blocks, including the usage docs ported in Phase 5 Task 6 |
   | `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md` | all TS code blocks |
   | `arcjet-guard/src/agents/index.ts` | `@packageDocumentation` + `@example` |
   | `arcjet-guard/src/agents/context.ts` | `@example` |
   | `arcjet-guard/src/agents/vocabulary.ts` | 1 `@example` |
   | `arcjet-guard/src/agents/guard-action.ts` | **3** `@example` blocks |
   | `arcjet-guard/src/vercel-ai/v7/index.ts` | `@packageDocumentation` + `@example` |
   | `arcjet-guard/src/vercel-ai/v7/tools-context.ts` | `@example` |
   | `arcjet-guard/src/vercel-ai/v7/guard-tool.ts` | 1 `@example` |

   The five most-likely-missed blocks are in `agents/vocabulary.ts` (1), `guard-action.ts` (3) and `guard-tool.ts` (1): all were originally written against `@arcjet/ai` / `createAiContext`, and Phases 2–3 instruct rewriting them. This sweep is the only check that the rewrite happened.
3. Run `tsc --noEmit` over the extracted files using the same compiler settings and module resolution `arcjet-guard` uses.
4. Assert specifically:
   - every imported name is a real export of the path it is imported from (trust the installed `.d.ts`, never a remembered API shape);
   - the **layer** is correct — `securityMetadata` from `@arcjet/guard/agents` or the v7 namespace, never from `@arcjet/guard`; `launchArcjet` from `@arcjet/guard`, never from a subpath;
   - no `createAiContext` / `ArcjetAiContext` survivors;
   - no reserved words as identifiers — the original `aiToolsContext` example used `const protected = …`, which does not compile in strict mode (rename to e.g. `protectedTools`);
   - rule builder signatures match `arcjet-guard/src/rules.ts` as installed.
5. Fix every failing block in its source file. **A doc example that does not compile is a defect, not a documentation nit.**
6. Record which sources were extracted and the `tsc` exit status. Re-run step 3 after any later edit to README, JSDoc, or SKILL.md.

### `guard-sdk-namespaces.AC9.2`

> **Success:** The node, fetch, bun, deno, and cloudflare runtime suites all pass.

**Why it cannot be fully automated on this machine:** `deno` is **NOT INSTALLED** (verified 2026-07-27; `command -v deno` returns nothing). `npm run test-runtime-deno` is `npm run build && deno test --no-check --allow-all test/runtime/deno.test.ts` and cannot execute. See §4 for the hard requirement this imposes on reporting.

**Exact verification procedure** (Phase 6 Task 3 Steps 2–3), all from `arcjet-guard/`:

| Leg | Command | Local status here |
|---|---|---|
| node | `npm run test-runtime-node` | runnable (node v24.18.0) |
| fetch | `npm run test-runtime-fetch` | runnable |
| bun | `npm run test-runtime-bun` | runnable (bun 1.3.12) |
| cloudflare | `npm run test-runtime-cloudflare` | runnable (miniflare 4.20260708.1 devDependency, runs under `node --test`) |
| **deno** | `npm run test-runtime-deno` | **NOT runnable locally — deno absent; covered by CI, see below** |

1. Run the four runnable legs. Each begins with `npm run build` and imports from `dist/` **through the package exports**, so they double as an integration check on the export map.
2. For the deno leg, do exactly one of:
   - install deno, run `npm run test-runtime-deno` locally, and record the deno version; **or**
   - run it in CI and record the workflow run. **Verified: `.github/workflows/guard.yml` has a `runtime:` job (line 113) whose matrix includes `test-runtime-deno` twice — `deno-version: lts` and `latest` (lines 147-152) — with a `Setup Deno` step (lines 181-185).** So pushing the branch and citing the `Runtime (deno lts)` / `Runtime (deno latest)` jobs satisfies this leg; record the run URL.
3. In the completion report, state plainly which legs ran **locally** and which ran **in CI**, per-leg.

---

## 3. Shell-based gates (not tests, still blocking)

These are asserting commands rather than test files. They are gates: a failure blocks the phase. None of them is discovered by `npm run test-unit`, so each must be run explicitly at the point named.

| ID | Gate | Command / assertion | Covers | Phase · Task |
|---|---|---|---|---|
| **SG-1** | `package.json` shape assertion | `python3` over `arcjet-guard/package.json`: `./agents` present, `./vercel-ai/v7` present, **`./vercel-ai` absent**, `peerDependenciesMeta.ai.optional is True`, `peerDependenciesMeta["@ai-sdk/provider-utils"].optional is True`, `'skills/' in files`, `"'src/**/*.test.ts'"` present in `scripts["test-unit"]`, and key order `devDependencies < peerDependencies < peerDependenciesMeta < engines`. Prints `ok`, then **chained with `&&`** (not a separate line, or the assertion's exit status is masked) `../node_modules/.bin/oxfmt --check package.json` → clean `on 1 files`. The `oxfmt` leg must run from `arcjet-guard/`, where the nested `.oxfmtrc.json` overrides the root config's `arcjet-guard/**` ignore; from the repo root it exits 2 and passes vacuously | AC3.1, AC8.1, AC1.5/AC1.6 precondition, trap T1 | Phase 1 Task 1 Step 2 |
| **SG-2** | Root entry source files byte-identical to `main` | `git diff main -- arcjet-guard/src/index.ts arcjet-guard/src/node.ts arcjet-guard/src/fetch.ts arcjet-guard/src/bun.ts` → **no output**. Every pathspec must be repo-root-relative or it silently matches nothing | AC1.1 (the only leg that catches an addition or removal) | Phase 3 Task 7 |
| **SG-3** | Release automation unwound to zero diff | `git diff main -- .github/.release-please-manifest.json .github/release-please-config.json .github/workflows/publish.yml` → **no output**; then `git diff main --name-only -- .github/ \| grep -v reusable-examples.yml` → no output. Supporting: `json.load` both JSON files (`valid`); `grep -c "workspace @arcjet" publish.yml` matches `git show main:.github/workflows/publish.yml \| grep -c "workspace @arcjet"` (both 31). The former "empty continuation lines" check was removed — it was vacuous, and a dangling continuation would appear as a diff anyway | AC6.2 | Phase 4 Task 2 Step 2, Task 3 Steps 2, 4, 5; re-confirmed Phase 6 Task 3 Step 5 |
| **SG-4** | Workspace gone | `npm install` succeeds, then `npm ls --workspaces --depth=0 2>&1 \| grep "@arcjet/ai"` finds nothing. **Pre-delete safety gate:** the 23-path `[ -f "$f" ] \|\| MISSING=1` loop over every Phase 2/3 destination must print `all destinations present` and exit 0 before `git rm -r arcjet-ai` | AC6.1 | Phase 4 Task 1 Steps 1, 6 |
| **SG-5** | Example CI entry survives | `grep -n "nextjs-ai-agent" .github/workflows/reusable-examples.yml` → exactly one match | AC6.3 | Phase 4 Task 3 Step 3 |
| **SG-6** | Repo-wide identifier sweep | `grep -rn "createAiContext\|ArcjetAiContext\|@arcjet/ai\|protectTool\|protectAction\|ProtectToolPolicy\|ProtectActionPolicy" --include=*.ts --include=*.tsx --include=*.md --include=*.json . \| grep -v -e node_modules -e package-lock -e 'docs/design-plans/' -e 'docs/implementation-plans/' \|\| echo "clean"`. `clean` required **only** at Phase 5 Task 7 Step 3 | AC5.2 **and** AC5.4 (authoritative for both) | Phase 5 Task 7 Step 3 (dry run at Task 5 Step 2) |
| **SG-7** | Example is free of `@arcjet/ai` | `grep -rn "@arcjet/ai" examples/nextjs-ai-agent --include=*.ts --include=*.tsx --include=*.json --include=*.md \| grep -v package-lock \|\| echo "clean"`. Also `grep -c "arcjet-ai" examples/nextjs-ai-agent/package-lock.json` → 0, after `npm install` **inside the example directory** (it carries its own lockfile; a root install will not remove the dependency) | AC7.1 | Phase 5 Task 1 Steps 2, 3 |
| **SG-8** | `npm pack --dry-run` skills check | `python3 -c "import json; print('skills/' in json.load(open('package.json'))['files'])"` → `True`; `npm pack --dry-run 2>&1 \| grep -c "skills/"` → non-zero | AC8.1 | Phase 5 Task 3 Step 2 |
| **SG-9** | README convention content | distinctive-string greps for `@arcjet/guard/agents`, `@arcjet/guard/vercel-ai/v7`, `vercel-eve/v1`, `peerDependenciesMeta`, `ERR_PACKAGE_PATH_NOT_EXPORTED`; plus the no-alias rule and the pnpm caveat. Also the Task 6 port check: `guardTool`, `guardAction`, `captureAction`, `securityMetadata`, `onDeny` all present | AC8.3, AC8.2 input | Phase 5 Task 4 Step 2, Task 6 Step 2 |
| **SG-10** | **Phase 1 glob-integrity script** | Single bash script (Phase 1 Task 3): record `BASELINE`; create `src/agents/glob-probe.test.ts` and `src/vercel-ai/v7/glob-probe.test.ts`; run `test-unit`; assert **all three** of — one-deep probe ran, two-deep probe ran, and `TOTAL == BASELINE + 2`; delete both probes; assert the count returns to `BASELINE`. Must `exit "$FAIL"`, not merely print | Gates AC9.1 for **every** later phase; guards trap T1 | Phase 1 Task 3 |
| **SG-11** | Live subpath resolution through the package name | After `npm run build --workspace @arcjet/guard`: `@arcjet/guard`, `@arcjet/guard/agents`, `@arcjet/guard/vercel-ai/v7` all import; `@arcjet/guard/vercel-ai`, `@arcjet/guard/vercel-ai/v6`, `@arcjet/guard/agents/context` each throw `ERR_PACKAGE_PATH_NOT_EXPORTED`; `process.exit(bad ? 1 : 0)` | AC1.3, AC1.5, AC1.6 (live legs) | Phase 6 Task 1 Step 1 |
| **SG-12** | Clean-install packaging probe | `npm pack` → install the tarball into `mktemp -d` with `type=module`; no peer warnings; `/agents` imports and works; `/vercel-ai/v7` throws `ERR_MODULE_NOT_FOUND`; both work after installing `ai@7.0.36` + `@ai-sdk/provider-utils@5.0.12`; scratch dir and `*.tgz` removed, nothing stray staged | AC2.2, AC2.3, AC3.2 (live legs) | Phase 6 Task 2 Steps 1–5 |

**SG-10 is the highest-leverage gate in the plan.** Every unit-test result from Phase 2 onward is worthless if it has not passed. Its third condition (`TOTAL == BASELINE + 2`) is non-negotiable: in the broken state the run reports `tests 1 / pass 1 / fail 0` and **exits 0**, so conditions 1 and 2 can both appear to pass while every pre-existing suite silently vanished. Do not substitute a grep for a top-level test name — `node --test` output does not include source filenames, so such a sentinel never matches and the check degrades to always-true.

---

## 4. `guard-sdk-namespaces.AC9.2` — hard requirement

**AC9.2 requires five runtime suites: node, fetch, bun, deno, cloudflare.**

**`deno` is not installed on this machine (verified: `command -v deno` returns nothing).** Therefore:

1. **AC9.2 MUST NOT be reported as locally passing.** Not "passing", not "passing with a caveat", not "passing (deno skipped)". Four of five legs green is AC9.2 **unproven**.
2. The deno leg must be verified either (a) after installing deno and running `npm run test-runtime-deno`, or (b) in CI, with the specific workflow run recorded.
3. Any completion report touching AC9.2 must state, per leg, whether it ran **locally** or **in CI**. A bare "runtime suites pass" is a false completion claim.
4. CI genuinely covers deno — verified in `guard.yml` (`runtime:` job, line 113; deno legs at lines 147-152; `Setup Deno` at 181-185), so citing those jobs *is* evidence. Cite the specific run; an assumed green is still not evidence.
5. The Phase 6 exit checklist item is: *"deno leg confirmed locally **or** in CI, and which one is stated explicitly."* Leave it unchecked until that statement exists.

---

## 5. Known false-confidence traps

Each of these produces a green result that means nothing. They are ordered by blast radius.

### T1 — The `test-unit` glob silently collapses the suite to one directory

`arcjet-guard`'s `test-unit` script currently ends with an **unquoted** positional `src/**/*.test.ts`. Today no test is nested, so `sh` finds no match, passes the pattern through literally, and Node's own globber expands it correctly — which is why it works now and why a naive probe reports success. Verified empirically:

| State | What `sh` passes to `node` | Tests run |
|---|---|---|
| today (no nested tests) | the literal pattern `src/**/*.test.ts` | 350 |
| with `src/agents/x.test.ts` present, unquoted | **only** `src/agents/x.test.ts` | **1** |
| with the pattern **quoted** | the literal pattern | **352** |

Without globstar, `sh` expands `src/**/*.test.ts` as `src/*/*.test.ts` — exactly one directory deep. The moment Phase 2 adds `src/agents/*.test.ts`, the shell resolves the pattern to those files alone, **all 18 existing top-level suites are silently dropped, and the run still exits 0 reporting green.** Phase 3's `src/vercel-ai/v7/*.test.ts` (two deep) would never be matched at all.

**Requirements:**

- The patterns must stay **single-quoted** in `arcjet-guard/package.json` — `'--test-coverage-include=src/**'`, `'--test-coverage-exclude=src/**/*.test.ts'`, and `'src/**/*.test.ts'`. `src/**/**/*.test.ts` is not a substitute; unquoted, it is equally broken.
- **Every green `test-unit` result must reconcile its total count**, not just its pass/fail:

  | Component | Tests |
  |---|---|
  | guard baseline (`main`) | 350 |
  | migrated from `arcjet-ai/test/` | 51 |
  | newly written (`agents/capture` ~3, `agents/index` ~3, `vercel-ai/v7/index` ~6, AC4.11/AC4.12 `onGuardError` cases ~8 net-new) | ~20 |
  | **expected total** | **≈421** |

  The 51 migrated: `agents/context` 10, `vercel-ai/v7/tools-context` 1, `agents/vocabulary` 3, `agents/guard-action` 10, `vercel-ai/v7/guard-tool` 22, `vercel-ai/v7/warn-missing-context` 2, `vercel-ai/v7/generate-text` 3. (`arcjet-ai` had 52; only `index.test.ts`'s single test is *replaced* rather than moved.)
- **A total anywhere near 1–20 means the glob is collapsing, not that tests were removed.** Before believing any green result, run `grep "test-unit" package.json` and confirm the single quotes. This applies at Phase 2, 3, 4, 5 and 6 — the quoting can be reverted by any later `package.json` edit. Post-migration, an unquoted glob will collapse to `src/agents/*.test.ts` alone (approximately 34 tests), which is itself a signature of collapse — much smaller than ≈421 but not 1–20. State explicitly in your reconciliation that any total materially below the expected ≈421, and ≈34 in particular, means the glob collapsed.
- Verify with `npm run test-unit 2>&1 | grep -E "^ℹ (tests|pass|fail)"`.

### T2 — `grep` prints paths without a leading `./`, so `^./dir/` exclusions are no-ops

In this environment `grep -rn … .` emits paths as `docs/design-plans/foo.md`, **not** `./docs/design-plans/foo.md`. Any exclusion anchored as `grep -v '^./docs/design-plans/'` therefore matches nothing, every exclusion silently becomes a no-op, and the sweep either drowns in expected hits or — worse — an operator reading a wall of output concludes "those are all the planning docs" and misses a real one.

**Requirement:** exclusions in gates SG-6, SG-7 and Phase 4 Task 1 Step 3 must be written **unanchored** — `-e 'docs/design-plans/'`, `-e 'docs/implementation-plans/'`, `-e node_modules`, `-e package-lock`, `-e 'arcjet-ai/'`. Never `-e '^./…'`. When reviewing any such command in this plan, check the anchoring before trusting a `clean` result.

### T3 — Three migrated tests assert the literal substring `"no ArcjetAgentContext"`

After the move, `src/vercel-ai/v7/guard-tool.ts` emits `` `@arcjet/guard: tool call "${action}" has no ArcjetAgentContext; …` `` — renamed from the `@arcjet/ai:` / `ArcjetAiContext` form at `arcjet-ai/src/protect-tool.ts:107`. Three migrated tests assert that message by substring:

| Test file | Original line | Assertion |
|---|---|---|
| `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` | was `test/protect-tool.test.ts:539` | `JSON.stringify(call).includes("no ArcjetAgentContext")` |
| `arcjet-guard/src/vercel-ai/v7/generate-text.test.ts` | was `test/generate-text.test.ts:176` | same substring |
| `arcjet-guard/src/vercel-ai/v7/warn-missing-context.test.ts` | was `test/warn-missing-context.test.ts:44` | same substring |

These three are the complete set coupled to *that* message. **A fourth assertion is
coupled to a different one:** `test/protect-tool.test.ts:505` asserts `does not
support experimental_capture`, which comes from `capture.ts:63` — the one message
the plan tells you to **reword** rather than merely re-prefix. Phase 2 convention 8
therefore fixes the required replacement string verbatim and forbids a free-form
rewrite. Treat "rename a message" and "update its assertion" as a single atomic
change in every case. The message string and all three assertions **must change together** — Phase 3 Task 3 renames the message, Task 4 updates the first assertion, Task 5 updates the other two. Renaming the message without updating an assertion leaves a test that fails for a confusing reason; updating an assertion without renaming the message leaves a test that passes for the wrong reason. Any future edit to that message must update all three in the same commit.

---

## 6. Coverage totals

| AC group | Criteria | Automated (§1) | Human / CI (§2) |
|---|---|---|---|
| AC1 — subpath resolution | 6 | 6 | 0 |
| AC2 — no AI SDK coupling | 3 | 3 (2 packaging-only) | 0 |
| AC3 — optional peers | 2 | 2 (1 packaging-only) | 0 |
| AC4 — behaviour preserved | 13 | 13 | 0 |
| AC5 — renames complete | 4 | 4 | 0 |
| AC6 — package removed | 3 | 3 | 0 |
| AC7 — example migrated | 2 | 2 | 0 |
| AC8 — documentation | 3 | 2 | 1 (AC8.2) |
| AC9 — verification green | 2 | 1 | 1 (AC9.2) |
| **Total** | **38** | **36** | **2** |

Of the automated criteria: **24** have a unit leg (2 of those with an additional integration leg), **3** are packaging-only (AC2.2, AC2.3, AC3.2 — Phase 6 Task 2), **1** is integration-only (AC7.2), and the remaining **8** are shell-check gates per §3. AC2.3's static unit precondition is counted under packaging-only, not twice — 24+3+1+8 reconciles to the automated total.
