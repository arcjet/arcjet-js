# Vercel Eve Namespace Implementation Plan — Phase 8: Full verification and delivery

**Goal:** The branch is green across the whole matrix, the type-only guarantee is verified the only way it can be, and the PR describes what shipped.

**Architecture:** Nothing new is built here. The one substantive task is AC2.2 — running the namespace's unit tests with `eve` absent from `node_modules`, on Node 22, 24 and 26 — which is the only direct evidence that the type-only import rule holds. Everything else is the standard verification sweep and the delivery paperwork the previous two features followed.

**Tech Stack:** `node --test`, tsdown, oxlint, deno, bun, miniflare.

**Scope:** Phase 8 of 8 from `docs/design-plans/2026-08-06-vercel-eve-namespace.md`.

**Codebase verified:** 2026-08-06

---

## Acceptance Criteria Coverage

This phase implements and tests:

### vercel-eve-namespace.AC2: The namespace never imports Eve at runtime
- **vercel-eve-namespace.AC2.2 Success:** The unit-test suite for the namespace passes on Node 22, 24 and 26, with `eve` absent from `node_modules`. This is what AC2.1 buys and is the reason it is a criterion rather than a preference — Eve declares `engines.node: ">=24"`.

### vercel-eve-namespace.AC9: Guard's own verification stays green
- **vercel-eve-namespace.AC9.1 Success:** Build, both typechecks (`tsconfig.json` and `tsconfig.lint.json`), lint, `format:check`, and unit tests with coverage all pass.
- **vercel-eve-namespace.AC9.2 Success:** The node, fetch, bun, deno and cloudflare runtime suites all pass, on every Node version in the existing matrix.

---

<!-- START_TASK_1 -->
### Task 1: Verify the type-only guarantee with Eve absent

**Verifies:** vercel-eve-namespace.AC2.2.

**Files:** None (verification only).

**Why this is the real test:** Phase 2's static scan asserts that every `eve` import is written `import type`. That is a source-level claim. This task is the runtime one: if the scan has a hole, or a build step re-emits a type import as a value import, the namespace's tests will fail to load without Eve installed. The two checks are not redundant — the scan catches the mistake at the point it is made, this catches the consequence.

**Step 1: Remove Eve and run the namespace tests**

```bash
# from the repo root
mv node_modules/eve /tmp/eve-stash
npx --no-install node --test 'arcjet-guard/src/vercel-eve/**/*.test.ts'
```

Expected: every test passes. `arcjet-guard/src/vercel-eve/v0/index.test.ts` is the one exception to watch — it imports `../../vercel-ai/v7/index.ts` for the proxy-identity assertion, which pulls in `ai` (still installed) but not `eve`. If it fails, read why before concluding anything: a failure caused by `ai` is not an AC2.2 failure.

**Step 2: Confirm the typecheck fails without Eve, and that this is expected**

```bash
npm run typecheck --workspace @arcjet/guard
```

Expected: **fails**, with unresolved `eve` module errors. That is correct and is worth recording explicitly: types are a build-time dependency, which is exactly why `eve` is a devDependency as well as an optional peer. AC2.2 is about the *runtime* graph. Do not "fix" this.

**Step 3: Restore and repeat on the other Node versions**

```bash
mv /tmp/eve-stash node_modules/eve
```

Repeat Step 1 under Node 24 and Node 26. Use whatever version manager the machine has; the CI matrix is `node: [22, 24, 26]` in `.github/workflows/guard.yml`.

**Step 4: Decide whether to automate it**

Automating this in CI means a job that deletes a devDependency before running a subset of tests — cheap, but it encodes a slightly odd install state. Recommendation: add it as a step in the existing guard workflow rather than a new job, gated to the Node 22 matrix leg (the one where Eve cannot be installed anyway), so the guarantee is enforced rather than remembered. If you decide against it, say so and record the manual result in the PR — an unenforced guarantee will regress, and the ADR already notes that a boundary test protecting a future guarantee is the easiest kind to dismiss.

**Verification:** record, for each Node version, that the namespace tests passed with `eve` absent.

**Commit (if automating):** `ci(guard): verify the vercel-eve namespace loads without eve installed`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Full guard verification

**Verifies:** vercel-eve-namespace.AC9.1, AC9.2.

**Files:** None (verification only).

**Step 1: The standard sweep**

```bash
npm run build --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard    # runs both tsconfig.json and tsconfig.lint.json
npm run lint --workspace @arcjet/guard
npm run format:check --workspace @arcjet/guard
npm run test-unit --workspace @arcjet/guard
```

Expected: all pass. Note the coverage output — `test-unit` runs with `--experimental-test-coverage` over `src/**` excluding tests. Compare the namespace's coverage against `src/vercel-ai/v7/`'s; a materially lower number means a path nobody tested, and the never-throws criteria (AC4.9, AC5.8, AC6.5) are the ones most likely to have gaps hiding behind a passing suite.

**Step 2: The runtime suites**

```bash
npm run test-runtime-node --workspace @arcjet/guard
npm run test-runtime-fetch --workspace @arcjet/guard
npm run test-runtime-bun --workspace @arcjet/guard
npm run test-runtime-deno --workspace @arcjet/guard
npm run test-runtime-cloudflare --workspace @arcjet/guard
```

**Repeat the node and fetch suites under Node 22, 24 and 26.** AC9.2 says "on every Node version in the existing matrix", and `.github/workflows/guard.yml`'s runtime job runs `node` and `fetch` across `22`, `24` and `26` — eleven legs in total: those six, plus `cloudflare` once, `bun` at `1.3.0` and `latest`, and `deno` at `lts` and `latest`. Only the node and fetch legs carry a Node-version axis; bun's and deno's second legs are runtime-version axes and are CI's business, not something to reproduce locally. A single local pass satisfies the command but not the criterion — mirror what Task 1 Step 3 does for AC2.2 rather than leaving the version axis to CI by accident.

If a version is not installed locally, say so explicitly and record that the leg ran only in CI, with a link to the workflow run. That is an acceptable outcome; silently reporting AC9.2 satisfied from one local run is not.

`deno` was **not installed** on the machine this plan was written on (verified 2026-08-06). Either install it or record the same way.

Expected: all pass. These exercise the root export's runtime-conditional entry points, which this work did not touch — so a failure here is either pre-existing or an accidental root-export change, and the second is worth checking for specifically:

```bash
git diff main -- arcjet-guard/src/index.ts arcjet-guard/src/node.ts arcjet-guard/src/fetch.ts arcjet-guard/src/bun.ts
```

Expected: empty. The root surface was not part of this trade.

**Step 3: The example**

```bash
cd examples/eve-agent && npm ci && npm run build && npm run typecheck
```

**Step 4: Confirm the agnostic layer did not grow a public path**

```bash
grep -n '"./agents"' arcjet-guard/package.json || echo "correctly absent"
```

Expected: absent. The agnostic layer stays internal; this design produced the *evidence* for promoting it to the root export, not the promotion.

**Verification:** every command above exits 0, plus the two `git diff`/`grep` negatives.
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Sweep for stale references

**Verifies:** None — but it catches the class of defect the repo has been bitten by before.

**Files:** As found.

**Implementation:**

Two sweeps, both written so their exclusions cannot silently match nothing. `grep` in this environment prints paths **without** a leading `./`, so an exclusion anchored `^\./dir/` matches nothing and a sweep built that way can never report clean.

**Sweep 1: `vercel-eve/v1` must not appear anywhere**

```bash
grep -rn "vercel-eve/v1" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist
grep -rn "vercel-eve/v1" ../arcjet --exclude-dir=node_modules --exclude-dir=.git
```

Expected: the only hits are the deliberate negative assertions in the export-map tests and the design/ADR text explaining why the segment is `v0`. Read each hit; do not assume.

**Sweep 2: no value import of `eve` in the namespace**

```bash
grep -rn "from \"eve" arcjet-guard/src/vercel-eve/ | grep -v "import type" | grep -v "export type"
```

Expected: no output. This duplicates Phase 2's automated scan by hand, which is the point — if the automated scan has a hole, the two disagree.

**Sweep 3: the README's own claims**

```bash
grep -n "Currently available" -A 20 arcjet-guard/README.md
grep -n "second vendor" arcjet-guard/README.md
```

The second pattern stops at `vendor` deliberately: the phrase "Once a second vendor namespace exists" is **hard-wrapped** across README lines 721-722, so a line-oriented `grep` for `"second vendor namespace"` matches nothing and would report clean whether or not the paragraph was updated. This is trap 10's shape in a different guise — a sweep whose pattern cannot match is worse than no sweep.

Confirm the "once a second vendor namespace exists" paragraph was actually updated in Phase 6 Task 6 and does not still describe the namespace as hypothetical.

**Verification:** each sweep's output reviewed hit by hit, with the expected-hit count stated rather than "clean".
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Delivery

**Verifies:** None (delivery).

**Files:**
- Delete: `docs/design-plans/2026-08-06-vercel-eve-namespace.md`
- Delete: `docs/implementation-plans/2026-08-06-vercel-eve-namespace/`

**Implementation:**

**Step 1: PR description**

Write it around what a reviewer needs to decide, not around a file list:

- the new path and why the segment is `v0` (this is the decision most likely to be questioned — lead with it);
- the four helpers and, for each, the Eve surface it attaches to;
- the type-only rule, Eve's Node 24 floor, and the AC2.2 result;
- the deviations from the ADR: `v0` rather than `v1`, and **two** shared-layer changes — the `retryAfterSeconds` extraction and exporting `correlationIdProblem` from `src/agents/context.ts`;
- the new ADR note that Eve offers no sandbox-command-execution guard surface, correcting a claim made by the superseded `2026-07-27-guard-sdk-namespaces` design plan (the claim was never in the ADR itself);
- the toto Sequence evidence: the recorded correlation ids from Phase 7 Task 7;
- what is deliberately out of scope: root-export promotion of the agnostic layer, an Eve extension package, `defineDynamic` tool coverage.

**Step 2: Linear**

Update the tracking issue to describe the delivered surface. If it was written expecting `vercel-eve/v1`, retitle it.

**Step 3: Remove the planning documents**

The previous two features removed their design and implementation plans as the final commit (`chore: remove pilot framework helper planning documents`, `chore: remove guard SDK namespaces planning documents`). Follow that.

Before deleting, check whether anything durable in these documents belongs somewhere that survives. Two candidates:

1. **The Eve surface investigation** — that hooks are observe-only, that `approval` covers connections, that `defineTool` stamps one enumerable and one non-enumerable symbol, that `defineDynamic` execute functions are compiler-hoisted, that `subagent.completed` carries no child session id, and that `eve/sandbox` exposes no per-command enforcement point. That is the kind of finding that gets re-derived expensively. It belongs in an ADR in `../arcjet/docs/adrs/` or in the skill, not in a deleted plan.

   Include *why* the descriptor-preserving copy in `guardTool` is safe, because the mechanism is not obvious from the code. Verified in `eve/dist/src/public/tool-result-narrowing.js` and `eve/dist/src/runtime/resolve-tool.js`:

   - The definition-source key is `Symbol.for("eve.definition-source-key")`; the registry it indexes is on `globalThis` under `Symbol.for("eve.definition-source-registry")`.
   - `toolResultFrom` matches by the key's **string value**, not by object identity — so copying the property carries the identity across, and a spread (which drops the non-enumerable property) silently stops matching.
   - At resolve time Eve **re-stamps** the loaded export with `tool-source:${sourceId}` and registers that alongside the `tool:${description}` fallback, warning on a fallback collision. The re-stamp is why the copied property must stay `configurable: true` — `Object.getOwnPropertyDescriptors` preserves that, but a hand-rolled `Object.defineProperty` with the default `configurable: false` would make Eve's re-stamp throw.
2. **The `v0` reasoning** — already going into the ADR in Phase 6 Task 7, so covered.

Do the extraction before the deletion, not after.

**Step 4: Record the pre-deletion SHA**

`docs/implementation-plans/2026-07-27-guard-sdk-namespaces/.pre-deletion-sha` exists because the previous feature wanted its plan findable after removal. Follow the same convention if that is still the practice — check whether the file survived into `main` (it did not; the whole directory was removed), which suggests the SHA belongs in the PR description instead. Put it there.

**Commit:** `chore: remove the vercel-eve namespace planning documents`
<!-- END_TASK_4 -->

---

## Phase 8 done when

- The namespace's unit tests pass with `eve` absent from `node_modules`, on Node 22, 24 and 26, with the result recorded — and either enforced in CI or its absence explicitly stated.
- The typecheck-fails-without-Eve observation is recorded as expected behaviour, not treated as a defect.
- Build, both typechecks, lint, format check, and unit tests with coverage pass; namespace coverage is comparable to `vercel-ai/v7`'s.
- All five runtime suites pass, with the node and fetch suites run under Node 22, 24 and 26 (or any version that ran only in CI named explicitly, with its workflow run linked), and `git diff main` is empty for the root entry points.
- The example builds.
- `./agents` is still absent from the export map.
- All three stale-reference sweeps reviewed hit by hit.
- The durable Eve findings are extracted somewhere that survives before the plans are deleted.
- PR and Linear describe the delivered surface, including both deviations from the ADR and the toto evidence.
