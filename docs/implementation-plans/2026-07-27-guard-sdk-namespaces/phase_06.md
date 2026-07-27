# Guard SDK Namespaces Implementation Plan — Phase 6: Full verification and delivery

**Goal:** Prove the branch is green across every suite, verify the export map
resolves live through the package name, and make the PR and issue text describe
what was actually built.

**Architecture:** No new code. This phase runs the verification that earlier
phases deferred (live subpath resolution, the runtime suites), then updates the
delivery artefacts and removes the planning documents.

**Scope:** Phase 6 of 6 from `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`

**Codebase verified:** 2026-07-27

---

## Acceptance Criteria Coverage

This phase implements and tests:

### guard-sdk-namespaces.AC9: Guard's own verification stays green
- **guard-sdk-namespaces.AC9.1 Success:** Build, `tsconfig.json` and `tsconfig.lint.json` typechecks, lint, and unit tests with coverage all pass.
- **guard-sdk-namespaces.AC9.2 Success:** The node, fetch, bun, deno, and cloudflare runtime suites all pass.

It also owns or completes these, which no earlier phase can prove:

- **guard-sdk-namespaces.AC2.2 Success:** `@arcjet/guard/agents` imports successfully with `ai` and `@ai-sdk/provider-utils` absent from `node_modules`. (Claimed by this phase ONLY — Phase 2 explicitly disclaims it.)
- **guard-sdk-namespaces.AC2.3 Failure:** `@arcjet/guard/vercel-ai/v7` fails to import when `ai` is absent.
- **guard-sdk-namespaces.AC3.2 Success:** Installing a project that depends on `@arcjet/guard` without any AI SDK produces no peer-dependency warning or error. (Live proof; Phase 1 only checks the declaration.)
- **guard-sdk-namespaces.AC1.3, AC1.5, AC1.6:** live resolution through the package name, including that unexported paths throw `ERR_PACKAGE_PATH_NOT_EXPORTED`.

---

## Verified environment constraints

Checked on this machine:

| Tool | Status |
|---|---|
| node | v24.18.0 — available |
| bun | 1.3.12 — available |
| miniflare | 4.20260708.1 devDependency — cloudflare suite runs under `node --test` |
| **deno** | **NOT INSTALLED** |

**`npm run test-runtime-deno` cannot run locally.** AC9.2 therefore cannot be
fully satisfied on this machine. Do not claim it passed. Either install deno and
run it, or verify it in CI and record that the deno leg was verified there.
Reporting AC9.2 as green without the deno leg would be a false completion claim.

`arcjet-guard`'s CI (`.github/workflows/guard.yml`) runs `build`, `test-unit`,
`lint`, and `typecheck`. Confirm where the runtime suites run in CI before relying
on them.

---

<!-- START_TASK_1 -->
### Task 1: Live subpath resolution through the package name

**Verifies:** `guard-sdk-namespaces.AC1.5`, `guard-sdk-namespaces.AC1.6`,
`guard-sdk-namespaces.AC1.3` (live)

**Files:** none modified — verification only.

**Implementation:**

Phase 3 asserted the export map statically because unit tests run without a
build. Now that `dist/` exists, verify real resolution through the package name,
which is what consumers actually do. The expected failure code was confirmed
during planning against a throwaway package: `ERR_PACKAGE_PATH_NOT_EXPORTED`.

**Step 1: Build, then probe every path**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
npm run build --workspace @arcjet/guard
cd arcjet-guard
node --input-type=module -e '
const expectOk = ["@arcjet/guard", "@arcjet/guard/agents", "@arcjet/guard/vercel-ai/v7"];
const expectFail = ["@arcjet/guard/vercel-ai", "@arcjet/guard/vercel-ai/v6", "@arcjet/guard/agents/context"];
let bad = 0;
for (const p of expectOk) {
  try { await import(p); console.log("OK   ", p); }
  catch (e) { console.log("FAIL ", p, e.code); bad++; }
}
for (const p of expectFail) {
  try { await import(p); console.log("UNEXPECTEDLY RESOLVED", p); bad++; }
  catch (e) {
    const ok = e.code === "ERR_PACKAGE_PATH_NOT_EXPORTED";
    console.log(ok ? "correctly blocked" : "WRONG ERROR", p, e.code);
    if (!ok) bad++;
  }
}
process.exit(bad ? 1 : 0);
'
```

Expected: the three exported paths resolve; the three unexported paths each fail
with `ERR_PACKAGE_PATH_NOT_EXPORTED`; exit code 0.

**Step 2:** If `@arcjet/guard/vercel-ai` resolves, a wildcard or an extra key
crept into the `exports` map — remove it. AC1.5 depends on that absence.
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Optional-peer clean-install check

**Verifies:** `guard-sdk-namespaces.AC2.2`, `guard-sdk-namespaces.AC2.3`,
`guard-sdk-namespaces.AC3.2` (live)

**Files:** none in the repo — uses a scratch directory.

**Implementation:**

These three ACs cannot be proven inside the workspace, where `ai` is always
present as a devDependency. Pack the real tarball and install it somewhere with
no AI SDK.

**Step 1: Pack and install into a clean scratch project**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/arcjet-guard
npm run build
TARBALL=$(npm pack --silent | tail -1)
TARBALL_ABS="$PWD/$TARBALL"
SCRATCH=$(mktemp -d)
cd "$SCRATCH"
npm init -y >/dev/null
npm pkg set type=module >/dev/null
npm install "$TARBALL_ABS" 2>&1 | tee install.log
grep -iE "peer dep|ERESOLVE|npm warn" install.log || echo "AC3.2 OK: no peer warnings"
```

Expected: install succeeds with no peer warnings — `ai` is optional, so its
absence is silent.

**Step 2: Confirm the agnostic layer works without the AI SDK (AC2.2)**

```bash
cd "$SCRATCH"
node --input-type=module -e '
const m = await import("@arcjet/guard/agents");
const need = ["createAgentContext","securityMetadata","protectAction","captureAction","ArcjetDeniedError"];
const missing = need.filter(n => typeof m[n] === "undefined");
if (missing.length) { console.log("FAIL missing:", missing); process.exit(1); }
const ctx = m.createAgentContext({ correlationId: "probe-1" });
console.log("AC2.2 OK:", ctx.correlationId === "probe-1");
'
```

Expected: `AC2.2 OK: true`. This is the load-bearing proof that the shared layer
has no AI SDK coupling — it runs where `ai` genuinely does not exist.

**Step 3: Confirm the v7 subpath fails loudly, not silently (AC2.3)**

```bash
cd "$SCRATCH"
node --input-type=module -e '
try { await import("@arcjet/guard/vercel-ai/v7"); console.log("FAIL: resolved without ai installed"); process.exit(1); }
catch (e) { console.log("AC2.3 OK:", e.code); }
'
```

Expected: `AC2.3 OK: ERR_MODULE_NOT_FOUND` (or `MODULE_NOT_FOUND`). A clear
module-resolution error is the intended behaviour — the subpath's contract is
"you have the AI SDK installed."

**Step 4: Confirm it works once the peer is added**

```bash
cd "$SCRATCH"
npm install ai@7.0.36 @ai-sdk/provider-utils@5.0.12 >/dev/null 2>&1
node --input-type=module -e '
const m = await import("@arcjet/guard/vercel-ai/v7");
console.log("v7 OK:", typeof m.protectTool === "function", typeof m.aiToolsContext === "function");
console.log("proxy OK:", typeof m.protectAction === "function");
'
```

Expected: both lines `true`. This also confirms the proxy re-export survives
packaging.

**Step 5: Clean up**

```bash
rm -rf "$SCRATCH"
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/arcjet-guard && rm -f *.tgz
```

Confirm no stray `.tgz` is left staged for commit.
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Full guard verification

**Verifies:** `guard-sdk-namespaces.AC9.1`, `guard-sdk-namespaces.AC9.2`

**Files:** none modified — verification only.

**Implementation:**

**Step 1: The standard suite (AC9.1)**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/arcjet-guard
npm run build
npm run typecheck   # runs BOTH tsc --noEmit and tsconfig.lint.json
npm run lint
npm run test-unit   # unit tests + coverage
```

Expected: all four clean.

**Reconcile the test count — this is the check that catches a silently skipped
test directory.** `arcjet-ai` had 52 tests across 7 files: context 11,
generate-text 3, index 1, metadata 3, protect-action 10, protect-tool 22,
warn-missing-context 2. Of those, **51 migrate** — only `index.test.ts`'s single
test is replaced rather than moved:

| Destination | Tests |
|---|---|
| `src/agents/context.test.ts` | 10 (11 minus the `aiToolsContext` one) |
| `src/vercel-ai/v7/tools-context.test.ts` | 1 (the split-out one) |
| `src/agents/metadata.test.ts` | 3 |
| `src/agents/protect-action.test.ts` | 10 |
| `src/vercel-ai/v7/protect-tool.test.ts` | 22 |
| `src/vercel-ai/v7/warn-missing-context.test.ts` | 2 |
| `src/vercel-ai/v7/generate-text.test.ts` | 3 |
| **migrated subtotal** | **51** |

Plus newly written tests: `src/agents/capture.test.ts` (~3),
`src/agents/index.test.ts` (~3), `src/vercel-ai/v7/index.test.ts` (~6).

So the expected total is roughly **guard's 321 baseline + 51 + ~12 ≈ 384**. Verify
with:

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/arcjet-guard
npm run test-unit 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

If the number is anywhere near 1–20, the `test-unit` glob is expanding in the
shell and only one directory ran — Phase 1 Task 1's quoting fix is missing or was
reverted. Check `grep "test-unit" package.json` for the single quotes before
believing any green result.

**Step 2: The runtime suites (AC9.2)**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/arcjet-guard
npm run test-runtime-node
npm run test-runtime-fetch
npm run test-runtime-bun
npm run test-runtime-cloudflare
```

Expected: all four pass. These import from `dist/` through the package exports, so
they are also an integration check on the export map.

**Step 3: The deno leg**

`deno` is not installed on this machine. Either:

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/arcjet-guard
npm run test-runtime-deno
```

or verify it in CI and record which run confirmed it. **Do not report AC9.2 as
fully passing until the deno leg is confirmed somewhere.** State plainly which
legs ran locally and which ran in CI.

**Step 4: Example build**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/examples/nextjs-ai-agent
npm run build
```

Expected: succeeds.

**Step 5: Confirm the automation unwind still holds**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
git diff main --name-only -- .github/ | grep -v reusable-examples.yml || echo "AC6.2 OK"
```

Expected: `AC6.2 OK`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Update PR #6164 and Linear ENG-987

**Verifies:** None (delivery)

**Files:** none in the repo.

**Implementation:**

Both currently describe shipping a new `@arcjet/ai` package, which is no longer
what happens.

**Step 1: Rewrite the PR title and body**

Title should describe subpath exports rather than a new package, e.g.
`feat(guard): add provider-namespaced AI SDK helpers as @arcjet/guard subpaths`.

The body needs: the three-layer structure with an import example for each; the
`<vendor-sdk>/v<major>` convention and why versions are explicit with no alias;
that `ai`/`@ai-sdk/provider-utils` are optional peers so existing guard users are
unaffected; that the root export surface is unchanged; that no separate package
is published; and that `vercel-eve/v1` is the next planned namespace. Note the
`createAiContext` → `createAgentContext` rename.

```bash
gh pr edit 6164 --title "<new title>" --body-file <path>
```

**Step 2: Add a comment explaining the restructure**

Earlier review rounds reviewed an `@arcjet/ai` package that no longer exists. Post
a comment explaining the change of approach so the existing review history reads
coherently, and noting which earlier findings are now moot versus carried forward.

**Step 3: Update Linear ENG-987**

Retitle away from "Ship @arcjet/ai pilot framework helper" and rewrite the
description for the subpath structure. ENG-988 (review-bot v7 upgrade) and
ENG-989 (adopt helpers once published) stay accurate, but ENG-989's wording
should be checked — it refers to a published `@arcjet/ai`, which should become the
published `@arcjet/guard` release that includes the subpaths.
<!-- END_TASK_4 -->

<!-- START_TASK_5 -->
### Task 5: Remove the planning documents

**Verifies:** None (branch hygiene)

**Files:**
- Delete: `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`
- Delete: `docs/implementation-plans/2026-07-27-guard-sdk-namespaces/` (all phase
  files and `test-requirements.md`)

**Implementation:**

Run this **last**, after every other task in every phase is complete and
verified. The planning documents are working artefacts, not deliverables, and the
project convention is to remove them as the branch's final commit.

**`docs/test-plans/2026-07-23-pilot-framework-helper.md` is KEPT, not deleted.**
That is a settled decision: Phase 5 Task 7 rewrites it for the subpath structure
and it ships. Do not delete it here.

`test-requirements.md` inside the implementation-plan directory is deleted along
with the phase files — it is part of the planning bundle, produced by the planning
workflow rather than by an execution task.

**Step 1: Confirm everything else is done**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
git log --oneline main..HEAD | head -30
```

Every phase should be represented. Do not proceed otherwise.

**Step 2: Delete and commit**

```bash
git rm -r docs/design-plans/2026-07-27-guard-sdk-namespaces.md docs/implementation-plans/2026-07-27-guard-sdk-namespaces
git commit -m "chore: remove guard SDK namespaces planning documents"
```

**Step 3: Final push**

```bash
git push origin rei/feat/framework-helper
```

**Step 4: Confirm CI is green** before considering the phase complete.
<!-- END_TASK_5 -->

---

## Phase 6 exit checklist

- [ ] All three exported subpaths resolve live through the package name
- [ ] `@arcjet/guard/vercel-ai`, `/vercel-ai/v6`, `/agents/context` each throw
      `ERR_PACKAGE_PATH_NOT_EXPORTED`
- [ ] Clean-install probe: `/agents` works with no AI SDK; `/vercel-ai/v7` fails
      with a module-resolution error; both work once the peers are installed
- [ ] No peer warnings on a clean install
- [ ] `build`, both typechecks, `lint` green
- [ ] `test-unit` green **and the total count reconciles to ≈384** (baseline 321 +
      51 migrated + ~12 new) — a low count means the glob fix is missing
- [ ] `test-unit` glob patterns still single-quoted in `package.json`
- [ ] node, fetch, bun, cloudflare runtime suites green
- [ ] deno leg confirmed locally **or** in CI, and which one is stated explicitly
- [ ] Example builds
- [ ] `git diff main -- .github/` touches only `reusable-examples.yml`
- [ ] No stray `.tgz` committed
- [ ] PR #6164 title/body rewritten; explanatory comment posted
- [ ] Linear ENG-987 retitled; ENG-989 wording checked
- [ ] Planning documents removed as the final commit
- [ ] CI green after push
