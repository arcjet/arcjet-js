# Test Requirements — Vercel Eve Namespace

**Design plan:** `docs/design-plans/2026-08-06-vercel-eve-namespace.md`
**Implementation plan:** `docs/implementation-plans/2026-08-06-vercel-eve-namespace/phase_01.md` … `phase_08.md`
**Criterion namespace:** `vercel-eve-namespace.ACn.m` (51 criteria: AC1.1–AC1.5, AC2.1–AC2.3, AC3.1–AC3.6, AC4.1–AC4.10, AC5.1–AC5.9, AC6.1–AC6.6, AC7.1–AC7.5, AC8.1–AC8.5, AC9.1–AC9.2)
**Environment verified:** 2026-08-06 — node v24.18.0, npm 12.0.1, bun 1.3.12, miniflare 4.20260708.1 (devDependency), **deno NOT installed**, `eve` not yet installed (latest published `0.31.0`; every Eve API claim in this plan was read from `0.30.8` and Phases 3–5 each re-verify against whatever Phase 1 pins), root `npm ci` run clean

## How to read this document

§1 maps all 51 criteria to where they are verified. §2 re-lists the four with no automated coverage at all (AC2.2, AC7.3, AC7.5, AC8.5), so they cannot be lost in a table — they appear in both sections deliberately. §3 lists the blocking gates that are shell commands rather than test files. §4 records the false-confidence traps — the places where a green run does not mean what it looks like.

Test types:

| Type | Meaning |
|---|---|
| **unit** | `arcjet-guard/src/**/*.test.ts`, run by `npm run test-unit`, imports **source** (`./foo.ts`), needs no build |
| **type-level** | An assertion whose failure mode is a typecheck error, not a test failure. Enforced by `npm run typecheck`; a `void`-referenced `const` with an explicit type annotation, never a cast |
| **static-scan** | A unit test that reads source text (`collectTsFiles` + specifier extraction) rather than executing the code under test |
| **integration** | Drives a real external toolchain — `eve build` on the example app, or `vitest` against toto |
| **packaging** | Runs against a packed tarball installed outside the workspace |
| **shell-check** | An asserting shell command; still a blocking gate (§3) |
| **human** | Manual observation; no automated substitute exists |

Four structural facts drive most of the classification:

1. **`eve` is typed against but never imported at runtime, and it is a devDependency.** Inside the workspace it always resolves, so nothing run from inside the workspace proves the namespace works without it. AC2.2's only proof is Phase 8 Task 1, which physically removes `node_modules/eve` first.
2. **Eve types are a build-time dependency even though they are not a runtime one.** Removing `eve` makes `npm run typecheck` fail, and that is correct. Any report that treats a failing typecheck-without-Eve as an AC2.2 failure has misread the criterion.
3. **The example app is the only place `eve` is a real runtime dependency.** Two assumptions the unit tests can only assert structurally are proven there and nowhere else: that `eve build` accepts a `guardTool`-wrapped `defineTool` as a tool file's default export, and that `defineHook`'s `ExactDefinition` accepts what `arcjetHooks` returns.
4. **Unit tests run without a build, so export-map criteria are asserted statically from `package.json`,** plus one live `ERR_PACKAGE_PATH_NOT_EXPORTED` probe against a packed tarball. Both legs are required.

---

## 1. Automated coverage map

### AC1 — The subpath resolves as specified

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC1.1` | The five named exports resolve from `@arcjet/guard/vercel-eve/v0`. | unit + type-level + packaging | `arcjet-guard/src/vercel-eve/v0/index.test.ts` — each of the five is `typeof === "function"`, plus a `verifyTypeExports()` function for the type-only exports; live probe against the tarball (§3, gate SG-3) | Phase 1 Task 3 (resolution), Phase 5 Task 4 (full surface); **live:** Phase 1 Task 5 |
| `AC1.2` | Each proxied agnostic export is the same function identity as `vercel-ai/v7`'s. | unit | `arcjet-guard/src/vercel-eve/v0/index.test.ts` — `assert.strictEqual` across both namespace imports for `createAgentContext`, `securityMetadata`, `guardAction`, `captureAction`, `ArcjetDeniedError`, `ArcjetGuardUnavailableError`; plus superset + key-count arithmetic | Phase 5 Task 4 |
| `AC1.3` | `./vercel-eve`, `./vercel-eve/v1` and deep paths do not resolve. | unit (static) + packaging (live) | `arcjet-guard/src/vercel-eve/v0/index.test.ts` — reads `arcjet-guard/package.json`, asserts no `./vercel-eve` key, no `./vercel-eve/v1` key, and that every key beginning `./vercel-eve/` is exactly `./vercel-eve/v0`; live `ERR_PACKAGE_PATH_NOT_EXPORTED` probe | Phase 1 Task 4; **live:** Phase 1 Task 5 |
| `AC1.4` | Root export surface unchanged; the full key set is the six expected keys; `./agents` still absent. | unit + shell-check | `arcjet-guard/src/vercel-ai/v7/index.test.ts` (`expectedRootKeys` `deepEqual` + the `.` condition set) and the Eve-side `./agents` assertion; plus the `git diff main` gate on the root entry sources (§3, gate SG-4) | Phase 1 Task 4; **gate:** Phase 8 Task 2 Step 2 |
| `AC1.5` | `eve` is an optional peer at `>=0.30 <1`, and installing without it warns nothing. | unit (static half) + **packaging (live half)** | Static: `arcjet-guard/src/vercel-eve/v0/peer.test.ts` — exact peer range, `peerDependenciesMeta.eve.optional === true`, and `eve` **not** in `dependencies`. Live: install a packed tarball into a scratch project and grep the log | Phase 1 Task 5 |

**Note on AC1.4.** Three legs, none sufficient alone: the key-set `deepEqual` catches an added subpath, the condition-set assertion catches a changed runtime condition, and the `git diff main` on `src/index.ts`/`node.ts`/`fetch.ts`/`bun.ts` is the only leg that catches an added or removed *symbol* on the root barrel.

### AC2 — The namespace never imports Eve at runtime

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC2.1` | Every `eve` import under `src/vercel-eve/` is type-only. | static-scan | `arcjet-guard/src/vercel-eve/v0/type-only.test.ts`, using the new `extractTypedImportSpecifiers` in `arcjet-guard/test/_shared/source-scan.ts`; covers source **and** test files via `collectTsFiles`, reports every violation, and includes fixture cases for the inline-modifier and substring traps | Phase 2 Task 5 |
| `AC2.2` | The namespace's unit tests pass on Node 22/24/26 with `eve` absent from `node_modules`. | **shell-check (out-of-workspace state)** | No committed test file asserts this. `mv node_modules/eve` aside, then `node --test 'arcjet-guard/src/vercel-eve/**/*.test.ts'`, repeated per Node version | **Phase 8 Task 1 — ONLY** |
| `AC2.3` | Nothing reachable from `src/agents/index.ts` imports `eve` or `ai`. | static-scan | `arcjet-guard/src/agents/index.test.ts` — the existing transitive import-graph walk, extended to forbid `eve` and `eve/*` in **both** value and type form, with a fixture proving the scanner fires | Phase 2 Task 2 |

**Note on AC2.2.** AC2.1 is a source-level claim and AC2.2 is its runtime consequence. They are not redundant: AC2.1 catches the mistake where it is made; AC2.2 catches a hole in AC2.1's scanner, or a build step that re-emits a type import. **AC2.2 may not be marked satisfied by any Phase 2 result.** One file is a known and accepted exception: `arcjet-guard/src/vercel-eve/v0/index.test.ts` imports `../../vercel-ai/v7/index.ts` for the AC1.2 identity assertion, which loads `ai` (still installed). A failure there attributable to `ai` is not an AC2.2 failure — Phase 8 Task 1 Step 1 says so explicitly and the reporter must read the error before concluding.

### AC3 — Correlation is session-derived

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC3.1` | No `parent` → `correlationId === session.id`. | unit | `arcjet-guard/src/vercel-eve/v0/context.test.ts` | Phase 2 Task 3 |
| `AC3.2` | `parent` present → `correlationId === parent.rootSessionId`, and **not** `session.id`. | unit | same file — uses three distinct ids (`ses_root`, `ses_mid`, `ses_child`) so the positive and negative assertions cannot both pass by coincidence | Phase 2 Task 3 |
| `AC3.3` | An unusable session id does not throw: ULID fallback, gated warning, raw value kept on `eve.session`. | unit | same file — three sub-cases (empty, 257 chars, non-printable); asserts the 26-char Crockford shape, the `console.warn` stub firing at `ARCJET_LOG_LEVEL=warn` and staying silent unset | Phase 2 Task 3 |
| `AC3.4` | `user` present from `auth.current.principalId`, absent when `auth.current` is `null`. | unit | same file — absence asserted with `in`, not `=== undefined` | Phase 2 Task 3 |
| `AC3.5` | `eve.session` / `eve.turn` always, `eve.parent-session` only when delegated; caller metadata wins. | unit | same file — override case passes `{ metadata: { "eve.turn": "override" } }` | Phase 2 Task 3 |
| `AC3.6` | Every derived key matches the server-enforced character class, **and** survives an `encodeMetadata` round trip with no `AJ1017`. | unit | same file — the character-class assertion over the **derived** keys across three shapes (root session, delegated session, `auth.current` null) is the load-bearing half; caller-supplied keys are out of scope; the encoder round trip is a smoke test for unrepresentable *values* only | Phase 2 Task 4 |

**Note on AC3.6 — the encoder cannot validate key names.** `arcjet-guard/src/metadata.ts`'s header states that key-name validity (along with the 128-key, 4 KiB and depth-10 limits) is enforced **server-side** and is per-account configurable. `encodeMetadata` drops a key only for a lone surrogate or a value `JSON.stringify` cannot represent, each with an `AJ1017` warning. So a test that only drives the encoder passes for **any** key name — including one with a space or 500 characters — and would report AC3.6 satisfied while proving nothing. The criterion's load-bearing half is the explicit `/^[A-Za-z0-9._-]+$/` assertion with the README cited as the source of the class, and Phase 2 Task 4 requires observing it fail against a deliberately bad key. See §4 trap 12.

**Note on AC3.4's `in` requirement.** `exactOptionalPropertyTypes` makes `{ user: undefined }` a type error at the assignment site but not at a dynamic write, and a key whose value is `undefined` still serializes as a key. Testing with `=== undefined` passes against exactly the bug the criterion exists to prevent.

### AC4 — `guardApproval` gates tool and connection calls

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC4.1` | ALLOW → exactly the string `"not-applicable"`. | unit + type-level | `arcjet-guard/src/vercel-eve/v0/guard-approval.test.ts` (exact value, not "any permissive status"); assignability in `assignability.test.ts` | Phase 3 Tasks 2, 3 |
| `AC4.2` | `onAllow: "user-approval"` → ALLOW resolves to `"user-approval"`. | unit | `guard-approval.test.ts` | Phase 3 Task 2 |
| `AC4.3` | DENY → `{ type: "denied", reason }` naming the reason, with the retry-after only for `RATE_LIMIT`. | unit | `guard-approval.test.ts` — three decisions: `decisionDenyRateLimit`, `decisionDenyPromptInjection`, `decisionDenyPromptInjectionWithReset` (the last must still omit the hint) | Phase 3 Task 2 |
| `AC4.4` | The guard payload carries `label`, rules, the session-derived `correlationId`, merged metadata, `eve.tool`, `eve.call`. | unit | `guard-approval.test.ts` — reads `recorded(guardCalls[0])`; merge order asserted with a key present in all three sources | Phase 3 Task 2 |
| `AC4.5` | `rules` may be a function of the `ApprovalContext`. | unit | `guard-approval.test.ts` — the callback reads `ctx.toolInput` and `ctx.session.id`; its output reaches the guard call | Phase 3 Task 2 |
| `AC4.6` | Both unavailable signals under `"deny"` → denied status + `outcome: "unavailable"`. | unit | `arcjet-guard/src/vercel-eve/v0/gate.test.ts` (engine) **and** `guard-approval.test.ts` (status); both discriminant legs asserted by reference | Phase 3 Tasks 1, 2 |
| `AC4.7` | Under `"allow"`, both signals proceed with a warning matching `/fail(ing\|ed) open/`; under `"deny"` the warning does **not** match it. | unit | `guard-approval.test.ts` — asserts both directions on the warning text, by pattern not by literal (see the note below) | Phase 3 Task 2 |
| `AC4.8` | Exactly one capture per evaluation; `outcome` ∈ {`allowed`,`denied`,`unavailable`}; never `success`/`error`; and `eve.phase: "approval"` on `guardApproval`'s captures. | unit, **split across two files** | `gate.test.ts` — `captureCalls.length === 1` (not `>=`) on all five paths, plus a negative assertion that no capture carries `success` or `error`. `guard-approval.test.ts` — the `eve.phase: "approval"` clause on all three outcomes | Phase 3 Task 1 (engine clauses); Phase 3 Task 2 (`eve.phase`) |
| `AC4.9` | Never throws, for any input. | unit | `guard-approval.test.ts` — four sub-cases: missing `session`, throwing `rules` callback, throwing `metadata` callback, rejecting `guard()`; plus `gate.test.ts`'s throwing-`capture()` case | Phase 3 Tasks 1, 2 |
| `AC4.10` | `onDeny` reshapes the status, receives the `DecisionDeny`, and is not called on either unavailable signal. | unit | `guard-approval.test.ts` — decision asserted by reference; not-called asserted with a call counter of `0` | Phase 3 Task 2 |

**Note on AC4.7's pattern.** Assert `/fail(ing|ed) open/`, never the literal `"failing open"`. `src/agents/guarded.ts` says "errored; failing open:" when the guard call threw and "failed open (API error)." when a decision reported itself failed-open — both are correct and both must be preserved, so a literal assertion fails against the second one. An executor who hits that failure and "fixes" `guarded.ts` has broken a working helper to satisfy a badly-worded test. See §4 trap 14.

**Note on AC4.1's exactness.** `"approved"` also lets a call proceed. The criterion is that the helper reports *no opinion* about human approval rather than claiming one, so the test must assert the exact string — "any permissive status" would not notice the default flipping. (It is **not** the case that `"approved"` populates `ApprovalContext.approvedTools`: that set is written only when a human answers a pending approval request, via `recordApprovedTools` in `harness/input-requests.js` filtering on `optionId === "approve"`. Phase 3's context section carries the same correction.)

### AC5 — `guardTool` and `guardInbound`

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC5.1` | Brand **and** definition-source key preserved, including the source key's `enumerable: false` descriptor. | unit | `arcjet-guard/src/vercel-eve/v0/guard-tool.test.ts` — asserts both symbols by `Symbol.for` name, the descriptor, **and** the negative control that a plain spread drops the source key | Phase 4 Task 2 |
| `AC5.2` | The input definition is not mutated. | unit | `guard-tool.test.ts` — `!==` on the object, reference-equality on the original `execute`, unchanged own keys | Phase 4 Task 2 |
| `AC5.3` | ALLOW → original `execute` runs once with the same `(input, ctx)` by reference; result unchanged; `success` / `error` captured; original error rethrown by reference. | unit | `guard-tool.test.ts` | Phase 4 Task 2 |
| `AC5.4` | DENY → `execute` not called, `ArcjetDeniedError` by default; `onDeny` override; unavailable → `ArcjetGuardUnavailableError` with both discriminant legs asserted. | unit | `guard-tool.test.ts` — `decision` tested with `=== undefined`, not `in` | Phase 4 Task 2; opt-in `"result"` half in Phase 4 Task 3 (conditional) |
| `AC5.5` | Refuses a tool with no `execute`, naming the problem. | unit | `guard-tool.test.ts` — `execute: undefined` and `execute: "nope"` | Phase 4 Task 2 |
| `AC5.6` | ALLOW → exactly `{ allowed: true }`; DENY → verdict carrying `reason`, `message` and the real `decision`. | unit | `arcjet-guard/src/vercel-eve/v0/guard-inbound.test.ts` — the allow case asserted with `deepEqual` so a stray field fails | Phase 4 Task 4 |
| `AC5.7` | Both unavailable signals → `UNAVAILABLE` under `"deny"`, `{ allowed: true }` + a gated warning matching `/fail(ing\|ed) open/` under `"allow"`. | unit | `guard-inbound.test.ts` — match the pattern, not the literal; see the AC4.7 note and §4 trap 14 | Phase 4 Task 4 |
| `AC5.8` | Never throws; one capture with `eve.phase: "inbound"` and a matching `outcome`. | unit | `guard-inbound.test.ts` — rejecting `guard()`, throwing `capture()` | Phase 4 Task 4 |
| `AC5.9` | An explicit `correlationId` is used; omitted, **no** id is generated. | unit | `guard-inbound.test.ts` — absence asserted with `in` on both the guard and capture payloads | Phase 4 Task 4 |

**Note on AC5.1's negative control.** Asserting only that the source key is present passes against a spread-based implementation on any runtime where the descriptor happens to differ. The control (`Symbol.for("eve.definition-source-key") in { ...tool }` is `false`) is what pins *why* the descriptor copy exists, and it is the assertion a future refactor would trip.

**Note on AC5.4's conditional half.** Phase 4 Task 1 investigates whether the AI SDK validates a locally-executed tool's return value against `outputSchema`. If it does, `policy.onDeny: "result"` is not implemented and Phase 4 Task 3 is skipped — the criterion is then satisfied by the throwing default alone. The reporter must state which branch was taken; "AC5.4 passed" without that is ambiguous.

### AC6 — `arcjetHooks`

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC6.1` | Returns a `HookDefinition` whose own keys are exactly `["events"]`, with only real `HookEventMap` keys. | unit + type-level + **integration** | `arcjet-guard/src/vercel-eve/v0/hooks.test.ts` (own keys, key membership, `HookDefinition` assignability). The `ExactDefinition` leg is proven **only** by the example app's real `defineHook(arcjetHooks(aj))` | Phase 5 Tasks 2, 3; **`ExactDefinition` leg:** Phase 6 Task 2 |
| `AC6.2` | `action.result` status → `outcome` mapping, with `eve.phase: "result"`. | unit | `hooks.test.ts` — four cases including an unrecognised status producing **no** `outcome` key | Phase 5 Task 2 |
| `AC6.3` | `session.started` join record, with `eve.continuation-token` / `eve.channel` when present. | unit | `hooks.test.ts` — plus the empty-`channel` case, where the record is still emitted with the session id | Phase 5 Task 2 |
| `AC6.4` | `subagent.called` carries the child session id and call id; `subagent.completed` carries call id and subagent name and **no** child session id. | unit | `hooks.test.ts` — the `subagent.completed` case asserts `"eve.child-session" in metadata` is `false`, so an implementation that invents one fails | Phase 5 Task 2 |
| `AC6.5` | Every handler is total and never throws. | unit | `hooks.test.ts` — sweep driven from `Object.entries(definition.events)` with `{}` event and `{}` context, repeated with a throwing `capture()` | Phase 5 Task 2 |
| `AC6.6` | `options.events` selects families; default is all four; `[]` yields an empty map. | unit | `hooks.test.ts` | Phase 5 Task 2 |

**Note on AC6.4's asymmetry.** It is not an oversight. `SubagentCompletedStreamEvent.data` is `{ callId, output, subagentName }` in `eve/dist/src/protocol/message.d.ts` — no `childSessionId`. The two events join to each other by `callId`, and the child's own decisions already correlate to the root session per AC3.2, so nothing is lost. Phase 5 Task 1 Step 1 re-checks this against whatever version Phase 1 pins; if a later Eve adds the field, that is a criterion change to surface rather than absorb.

**Note on AC6.5's sweep.** Driving it from the returned map rather than a hand-listed set is the requirement, not a stylistic preference: a handler added later is covered automatically, and a hand-listed set is how a new handler ships untested.

### AC7 — Example, skill and documentation

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC7.1` | The example builds in CI on Node 24 and exercises all four helpers. | **integration** | `examples/eve-agent` — `npm run build` (`eve build`) + `npm run typecheck`, run by the `eve-agent` leg of `.github/workflows/reusable-examples.yml` with `node-version: 24` | Phase 6 Tasks 1, 2, 5 |
| `AC7.2` | Every code example in README, JSDoc, skill and example compiles. | shell-check | Each block extracted into a scratch file inside `examples/eve-agent` and typechecked (§3, gate SG-5). Ownership by source: the skill's blocks in Task 4; the README's **and the namespace's JSDoc `@example` blocks** in Task 6, which enumerates them with `grep -rn "@example"` and compares the count against the export count (≥1 per exported helper plus the barrel — six or more) rather than reporting a bare number; `examples/eve-agent/README.md` snippets also in Task 6; the example app's `agent/` sources by its own `npm run typecheck` in Tasks 1–2. Each helper's `@example` is *authored* alongside it, and each of Phases 2–5 carries a done-when line requiring one | Phase 6 Tasks 1, 2, 4, 6 (authoring: Phases 2–5) |
| `AC7.3` | README documents the path, the peer, the Node 24 floor, and why `v0`. | human (review) | `arcjet-guard/README.md` §"SDK namespaces" — five specific edits enumerated in Phase 6 Task 6 | Phase 6 Task 6 |
| `AC7.4` | The ADR names `v0` at its three path references, records which Eve predictions held, adds a note that the superseded design plan's sandbox guard-surface claim did not hold; no `vercel-ai` string and no unrelated text changes. | human (review) + shell-check | `../arcjet/docs/adrs/2026-07-28-guard-sdk-subpath-namespaces.md`; the three diff-scoping greps in Phase 6 Task 7 are the mechanical half, including the one asserting zero `vercel-ai` lines touched | Phase 6 Task 7 |
| `AC7.5` | A fresh coding-agent session integrates unaided from the skill alone. | **human** | One recorded transcript. Failure signals to look for specifically: an invented import path, reaching for a hook to block something, or calling `createAgentContext` inside an Eve callback | Phase 6 Task 4 |

**Note on AC7.4's sweep.** A blanket `v1` → `v0` substitution corrupts the ADR: it also names `vercel-ai/v7`, a future `/v8`, and `vercel-ai/v6` as an unsupported sibling. Phase 6 Task 7 requires per-reference edits plus a diff grep confirming no `vercel-ai` version string moved.

**Note on the sandbox clause.** It is an **addition**, not a correction. `grep -n sandbox` over the ADR returns zero hits: the claim that Eve "adds guard surfaces the AI SDK lacks (sandbox command execution, …)" is in the superseded `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`, deleted when that feature shipped and recoverable at `bd1d154e6^`. An earlier draft of this plan told the executor to correct text that is not there. The note goes into the ADR because the ADR is the document that survives.

### AC8 — Dogfood

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC8.1` | Slack channel screens with `guardInbound`; the hand-rolled block is gone; decline copy preserved. | **integration** (vitest, in `../arcjet`) + human (review) | `apps/toto/agent/__tests__/slack.test.ts` — the retargeted 12 tests plus 2 new ones; copy preservation is a review item, since a test asserting the string against itself proves nothing about whether it changed | Phase 7 Tasks 2, 3, 6 |
| `AC8.2` | The internal API connection carries a `guardApproval` gate. | **integration** (vitest) | `apps/toto/agent/__tests__/arcjet-internal.test.ts` | Phase 7 Task 4 |
| `AC8.3` | `apps/toto/agent/hooks/arcjet.ts` mounts `arcjetHooks`. | **integration** (`eve build`) | Confirmed from the `eve build` output listing the discovered hook — Eve's capabilities are path-derived, so a misplaced file is silently inert rather than an error | Phase 7 Task 5 |
| `AC8.4` | toto's suite passes, with no pre-existing behaviour dropped. | **integration** (vitest) | `npx vitest run agent/__tests__/slack.test.ts` in `apps/toto` — expected **14** tests in that file (12 retargeted + 2 new). Scope it to the file: a whole-suite run also collects `arcjet-internal.test.ts` and its total cannot tell you whether a Slack behaviour was dropped. Then run the whole suite for regressions | Phase 7 Task 6 |
| `AC8.5` | One conversation produces the inbound decision, per-call gate decisions and per-call outcomes under one correlation id. | **human** | Arcjet Console or MCP `list-guards` / `get-guard`, with the decision ids recorded in the PR description. Includes the decline path (no session starts) and a forced gate denial | Phase 7 Task 7 |

**Note on AC8.5.** There is no automated substitute. It requires a real Slack conversation, a real Arcjet site, and reading the Console. Its three legs are separately falsifiable and all three must be recorded: the two-hop join, the decline path producing **no** session, and a gate denial producing two events distinguishable by `eve.phase`.

### AC9 — Guard's own verification

| ID | Criterion | Type | Test file / location | Produced by |
|---|---|---|---|---|
| `AC9.1` | Build, both typechecks, lint, `format:check`, unit tests with coverage. | shell-check | §3, gate SG-1 | Phase 8 Task 2 Step 1 |
| `AC9.2` | node, fetch, bun, deno and cloudflare runtime suites, on every matrix Node version. | shell-check | §3, gate SG-2 | Phase 8 Task 2 Step 2 |

---

## 2. Criteria with no automated coverage

Four criteria are proven only by observation. Each is listed with why automation is not available and what "recorded" means.

| ID | Why not automated | What must be recorded |
|---|---|---|
| `AC2.2` | Requires `node_modules/eve` to be absent, which cannot hold inside a workspace that devDepends on it. Automatable as a CI **step** (Phase 8 Task 1 Step 4 recommends it); until that lands it is manual. | Per Node version (22, 24, 26): the namespace test run passed with `eve` moved aside. Plus the expected typecheck failure, noted as expected. |
| `AC7.3` | "Documents X" is a judgement about prose. | A reviewer confirming all four subjects are covered: path, peer, Node 24 floor, `v0` reasoning. |
| `AC7.5` | Requires a fresh agent session and human judgement about whether its questions were merely clarifying. | The transcript, plus any skill edits its failures prompted. |
| `AC8.5` | Requires a live agent, a live Arcjet site, and Console inspection. | The correlation ids and decision ids for: the inbound decision, the join record, each gate decision, each result event; plus the decline path and the forced gate denial. |

`AC7.4` and `AC8.1` are partly review items (prose correctness, copy preservation) and partly mechanical, and are listed in §1 with both legs named.

---

## 3. Blocking shell gates

| Gate | Command | Assertion | Phase |
|---|---|---|---|
| **SG-1** | `npm run build && npm run typecheck && npm run lint && npm run format:check && npm run test-unit`, all `--workspace @arcjet/guard` | all exit 0; namespace coverage comparable to `src/vercel-ai/v7/`'s | 8.2 |
| **SG-2** | the five `test-runtime-*` scripts (`test-runtime-node`, `-fetch`, `-bun`, `-deno`, `-cloudflare`), each `--workspace @arcjet/guard`, with node and fetch repeated under Node 22, 24 and 26 | all exit 0, with the node and fetch legs run on **every Node version in `guard.yml`'s runtime matrix (22, 24, 26)** — a single local pass runs the command but does not satisfy AC9.2's "every Node version" clause. The bun (`1.3.0`, `latest`) and deno (`lts`, `latest`) legs each carry a *runtime*-version axis rather than a Node one; those are CI's business and need one local run each. **`deno` is not installed on the machine verified 2026-08-06** — either install it or record that this leg ran only in CI, with the workflow run linked | 8.2 |
| **SG-3** | `npm pack` + `import()` probe of six specifiers | `@arcjet/guard` and `@arcjet/guard/vercel-eve/v0` resolve **with `eve` absent**; `./vercel-eve`, `./vercel-eve/v1`, a deep path, and `./agents` each throw `ERR_PACKAGE_PATH_NOT_EXPORTED` | 1.5 |
| **SG-4** | `git diff main -- arcjet-guard/src/index.ts arcjet-guard/src/node.ts arcjet-guard/src/fetch.ts arcjet-guard/src/bun.ts` | empty | 8.2 |
| **SG-5** | Extract every doc/skill/JSDoc code block into a scratch file in `examples/eve-agent` and `tsc` it | every block compiles against the installed typings, and the JSDoc `@example` count is enumerated and **compared against the export count** — ≥1 per exported helper plus the barrel, so six or more. No automated assertion exists for that comparison; making it is the reporter's obligation, and "found 1, checked 1" is a failed gate, not a passed one | 6.4, 6.6 (JSDoc leg: 6.6) |
| **SG-6** | `npm query` for lifecycle scripts, before and after adding `eve` | no new scripted dependency (the repo sets `strict-allow-scripts=true`) | 1.2 |
| **SG-7** | Stale-reference sweeps for `vercel-eve/v1` and for non-type `eve` imports | every hit reviewed individually; the expected-hit count stated, never "clean" | 8.3 |

---

## 4. False-confidence traps

Recorded because each one produces a green run that does not mean what it looks like.

1. **A passing `test-unit` says nothing about AC2.2.** `eve` resolves inside the workspace. Only Phase 8 Task 1 exercises its absence.
2. **A failing typecheck without `eve` is correct.** Types are a build-time dependency. Do not "fix" it, and do not report it as an AC2.2 failure.
3. **`arcjet-guard/src/vercel-eve/v0/index.test.ts` loads `ai`** (through the v7 import for AC1.2). It is the one namespace test file that is not part of the Eve-absent story, and Phase 5 Task 4 requires a comment saying so — otherwise a future tidy-up "fixes" the type-only scan to include it and the AC1.2 assertion disappears.
4. **AC5.1 without its spread negative control** passes against the implementation the criterion exists to forbid.
5. **AC4.1 asserting "any permissive status"** passes against `"approved"`, which claims a human approval the helper has no basis for. Assert the exact string. (`"approved"` does **not** populate `ApprovalContext.approvedTools` — that set is written only when a human answers a pending approval request. The distinction is semantic, not behavioural, and the criterion is about not overclaiming.)
6. **AC4.8 asserting `captureCalls.length >= 1`** passes against a double capture, which is exactly what the gate/result split makes easy to introduce. Assert `=== 1`.
7. **AC6.5 driven from a hand-listed handler set** silently excludes any handler added later.
8. **AC3.4/AC5.9 tested with `=== undefined`** pass against a key that exists with an `undefined` value — which serializes as a key and is the bug. Use `in`.

   **The opposite rule holds for AC5.4's `ArcjetGuardUnavailableError.decision`, and the two are easy to confuse.** There, use `=== undefined`, never `in`: `decision` is a *declared* optional class field, so it is an own property on **both** paths and `in` is true even when the guard threw. The distinction is metadata-key presence (`in`) versus declared-field value (`=== undefined`) — see `phase_04.md`'s AC5.4 testing note for the full reasoning, which the `guardAction` tests already pin.
9. **`eve build` succeeding in the example is load-bearing for Phase 4.** It is the only test of whether Eve's compiler accepts a wrapped `defineTool` as a tool file's default export. If Phase 6 Task 2 is skipped or its build failure worked around, `guardTool` is unproven regardless of its unit coverage.
10. **A `grep` exclusion anchored `^\./`** matches nothing in this environment, because `grep` prints paths without a leading `./`. A sweep built that way can never report clean, and SG-7's requirement to state the expected-hit count is what catches it.
11. **toto's test count is the guarantee-preservation check, and it must be scoped to one file.** `agent/__tests__/slack.test.ts` has 12 tests today and must have 14 after. A green whole-suite run tells you nothing about that, because it also collects `arcjet-internal.test.ts` — and a green run at 12 in the right file means two behaviours were dropped, which is exactly how green looks.

12. **AC3.6 asserted only through the encoder is vacuous.** `encodeMetadata` performs no key-name validation — the server does. A test that drives the encoder and checks the keys survived passes for any key name at all. The character-class assertion is the real check, and Phase 2 Task 4 requires seeing it fail against a key with a space in it before trusting it.

13. **AC4.8's `eve.phase` clause cannot be asserted in `gate.test.ts`.** `runGate` is shared by `guardApproval` (`"approval"`) and `guardInbound` (`"inbound"`) and writes neither. Asserting it at the engine either fails or forces the engine to know its caller; it belongs in each helper's own test.

14. **A literal `"failing open"` assertion for AC4.7/AC5.7 is unsatisfiable.** `guarded.ts`'s failed-open-under-`"allow"` string is "failed open (API error)." — *failed*, not *failing*. Match `/fail(ing|ed) open/`. The trap is that the obvious resolution when the test fails is to edit `guarded.ts`, which is the one thing the plan forbids.
