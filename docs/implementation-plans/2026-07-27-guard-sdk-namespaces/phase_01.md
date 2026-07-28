# Guard SDK Namespaces Implementation Plan — Phase 1: Guard package scaffolding

**Goal:** Make `@arcjet/guard` able to host and resolve the two new subpaths
before any logic moves into it.

**Architecture:** Add `./agents` and the two-segment `./vercel-ai/v7` to the
`exports` map, declare the AI SDK packages as *optional* peer dependencies (plus
devDependencies so guard's own build can typecheck against them), and ship
`skills/`. The barrels start as valid empty ES modules so the package builds and
every declared subpath resolves at the end of this phase; Phases 2 and 3 fill
them.

**Tech Stack:** npm workspaces, Node ESM `exports` resolution, tsdown, TypeScript.

**Scope:** Phase 1 of 6 from `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`

**Codebase verified:** 2026-07-27

---

## Acceptance Criteria Coverage

This phase implements and tests:

### guard-sdk-namespaces.AC3: AI SDK peers are optional
- **guard-sdk-namespaces.AC3.1 Success:** `ai` and `@ai-sdk/provider-utils` appear in `peerDependencies` and are marked optional in `peerDependenciesMeta`.
- **guard-sdk-namespaces.AC3.2** (partial — declaration only): the optional-peer declaration is asserted here. The **live** proof, installing without any AI SDK, is Phase 6 Task 2 Step 1; inside this workspace both packages are devDependencies so the declaration is never exercised.

---

## Verified facts this phase relies on

Established by investigation and by direct experiment — do not re-litigate these.

1. **`arcjet-guard/package.json` currently has NO `peerDependencies` and NO
   `peerDependenciesMeta`.** Its `files` array is exactly `["dist/"]`. Its
   `exports` map has `.` (with runtime conditions bun/edge-light/workerd/deno/
   node/default), `./node`, `./bun`, `./fetch`.
2. **No package in this monorepo currently uses a two-segment subpath export.**
   These will be the first, so verify resolution rather than assuming precedent.
3. **Two-segment literal keys work, and encapsulation is strict.** Verified by
   building a throwaway package and importing from a real consumer:
   - `pkg/agents` → resolves
   - `pkg/vercel-ai/v7` → resolves
   - `pkg/vercel-ai` (parent) → `ERR_PACKAGE_PATH_NOT_EXPORTED`
   - `pkg/vercel-ai/v6` (sibling) → `ERR_PACKAGE_PATH_NOT_EXPORTED`
   - `pkg/agents/context` (deep) → `ERR_PACKAGE_PATH_NOT_EXPORTED`
   No wildcard/pattern form is needed. This is what makes AC1.5/AC1.6 testable
   in Phase 3, and it means internals stay encapsulated for free.
4. **`tsdown` needs no config change.** Entry is
   `["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts"]` with
   `unbundle: true`, which preserves nested directory structure into `dist/`.
5. **The `test-unit` glob is BROKEN for nested tests and must be fixed in this
   phase.** The script ends with an *unquoted* positional `src/**/*.test.ts`.
   Today no test is nested, so the shell finds no match, passes the pattern
   through literally, and Node's own globber expands it correctly — which is why
   it works now and why a naive probe reports success. Verified empirically:

   | State | What `sh` passes to `node` | Tests run |
   |---|---|---|
   | today (no nested tests) | the literal pattern `src/**/*.test.ts` | 350 |
   | with `src/agents/x.test.ts` present, unquoted | **only** `src/agents/x.test.ts` | **1** |
   | with the pattern **quoted** | the literal pattern | **352** |

   Without globstar, `sh` expands `src/**/*.test.ts` as `src/*/*.test.ts`, which
   matches exactly one directory deep. The moment Phase 2 adds
   `src/agents/*.test.ts`, the shell resolves the pattern to those files alone and
   **all 18 existing top-level suites are silently dropped** while the run still
   reports green. Phase 3's `src/vercel-ai/v7/*.test.ts` (two deep) would never be
   matched at all. Task 1 fixes this by quoting the pattern.
6. **Installed versions per the root lockfile:** `ai@7.0.36`,
   `@ai-sdk/provider-utils@5.0.12`, `zod@4.4.3`.

## Known caveats to record, not solve here

- **pnpm does not reliably honour `peerDependenciesMeta.*.optional`**
  (pnpm issues #5152, #8142), particularly under
  `--strict-peer-dependencies`. npm and yarn behave correctly. Note this in the
  README in Phase 5 rather than working around it.
- **Turbopack has a documented bug resolving subpath exports for transitive
  dependencies** (vercel/next.js#88540). The Phase 5 example is a Next.js app, so
  its build is the real test. Flagged there.

---

<!-- START_TASK_1 -->
### Task 1: Add the subpath exports and optional peers

**Verifies:** `guard-sdk-namespaces.AC3.1`

**Files:**
- Modify: `arcjet-guard/package.json`

**Implementation:**

Make four changes.

**1. Add two `exports` entries** after the existing `./fetch` entry. Match the
shape used by the existing single-segment subpaths (`types` + `import`, no
runtime conditions — those exist only on `.` for transport selection, and the
agent helpers take a client as a parameter so they are runtime-neutral):

```json
"./agents": {
  "types": "./dist/agents/index.d.ts",
  "import": "./dist/agents/index.js"
},
"./vercel-ai/v7": {
  "types": "./dist/vercel-ai/v7/index.d.ts",
  "import": "./dist/vercel-ai/v7/index.js"
}
```

Do **not** add a `"./vercel-ai"` key and do **not** use a wildcard such as
`"./vercel-ai/*"`. Their absence is what makes the unversioned path and
unsupported majors fail — a deliberate, tested behaviour (AC1.5, AC1.6).

**2. Add `peerDependencies`** (guard has none today, so this is a new block):

```json
"peerDependencies": {
  "@ai-sdk/provider-utils": ">=5 <6",
  "ai": ">=7 <8"
}
```

**3. Add `peerDependenciesMeta`** marking both optional, so consumers who never
touch an AI SDK see no warning or error. Place this block after `devDependencies`
and before `engines`, matching the pattern in sibling packages:

```json
"peerDependenciesMeta": {
  "@ai-sdk/provider-utils": {
    "optional": true
  },
  "ai": {
    "optional": true
  }
}
```

**4. Add both to `devDependencies`** at the lockfile-verified versions, so
guard's own build, typecheck, lint, and tests can resolve them:
`"@ai-sdk/provider-utils": "5.0.12"` and `"ai": "7.0.36"`. Match the existing
exact-pin style of guard's other devDependencies (no `^`).

**5. Add `"skills/"` to the `files` array**, which is currently `["dist/"]`. The
skill content itself arrives in Phase 5; declaring it now keeps packaging changes
in one place.

**6. Quote the `test-unit` glob — this is a correctness fix, not cosmetic.**
The script currently ends:

```
... --test-coverage-exclude=src/**/*.test.ts src/**/*.test.ts
```

Single-quote **both** patterns so the shell cannot expand them and Node's
globber receives them intact:

```
... '--test-coverage-exclude=src/**/*.test.ts' 'src/**/*.test.ts'
```

Also quote the `--test-coverage-include=src/**` argument for the same reason.
Without this, every `npm run test-unit` from Phase 2 onward runs a single
directory and reports a false green — see verified fact 5 above. Do not
substitute `src/**/**/*.test.ts`; unquoted, that is equally broken.

**Step 1: Make the edits.**

**Step 2: Verify the JSON is valid and the fields landed**

```bash
cd arcjet-guard
python3 -c "
import json
d = json.load(open('package.json'))
assert './agents' in d['exports'], 'missing ./agents'
assert './vercel-ai/v7' in d['exports'], 'missing ./vercel-ai/v7'
assert './vercel-ai' not in d['exports'], 'unversioned alias must NOT exist'
assert d['peerDependenciesMeta']['ai']['optional'] is True
assert d['peerDependenciesMeta']['@ai-sdk/provider-utils']['optional'] is True
assert 'skills/' in d['files'], 'skills/ not in files'
tu = d['scripts']['test-unit']
assert \"'src/**/*.test.ts'\" in tu, 'test-unit glob must be single-quoted'
print('ok')
"
```

Expected: `ok`

**Step 3: Commit**

```bash
git add arcjet-guard/package.json
git commit -m "build(guard): declare agents and vercel-ai/v7 subpath exports"
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Create the placeholder barrels and install

**Verifies:** `guard-sdk-namespaces.AC3.2` (partial — declaration only; the live
clean-install proof is Phase 6 Task 2 Step 1)

**Files:**
- Create: `arcjet-guard/src/agents/index.ts`
- Create: `arcjet-guard/src/vercel-ai/v7/index.ts`
- Modify: root `package-lock.json` (regenerated by install)

**Implementation:**

The `exports` map added in Task 1 points at `dist/` files that do not exist yet,
so create both barrels as valid empty ES modules. This keeps the package
buildable and every declared subpath resolvable at the end of this phase.

Each file's entire content:

```ts
export {};
```

Add a one-line comment above it naming what will live there
(`@arcjet/guard/agents` — framework-agnostic guard helpers;
`@arcjet/guard/vercel-ai/v7` — Vercel AI SDK v7 helpers). Phase 2 replaces the
first, Phase 3 the second. `export {}` is a legitimate empty module under
`isolatedModules` and `moduleDetection: "force"` — not a placeholder hack.

**Step 1: Create both files.**

**Step 2: Install and confirm no peer warnings (AC3.2)**

Run from the repo root:

This repo emits `npm warn EBADENGINE` on every install (npm 11.x against the
root package's `npm: ^12.0.0` engine). That is expected and unrelated to peers —
the grep below deliberately does not match it. Do not "fix" it here.

Run this as a **script**, not pasted into an interactive shell — the `return 1`
form is used so a paste cannot kill your shell:

```bash
run_peer_check() {
  local log status
  log=$(mktemp)
  npm install >"$log" 2>&1
  status=$?
  cat "$log"
  if [ "$status" -ne 0 ]; then
    echo "FAIL: npm install exited $status (not a peer problem, but AC3.2 covers errors too)"
    return 1
  fi
  if grep -iE "ERESOLVE|EPEERINVALID|peer dep" "$log"; then
    echo "FAIL: peer warnings detected"
    return 1
  fi
  echo "no peer warnings"
}
run_peer_check
```

Piping `npm install` into `tee` would discard npm's exit status, so a hard
failure such as `ETARGET` would still print the success line — AC3.2's text is
"no peer-dependency warning **or error**", so the status must be checked
separately from the grep.

Expected: `no peer warnings`. `ai` and `@ai-sdk/provider-utils` resolve here
because they are also devDependencies; the optional-peer declaration is what
protects *consumers*. A true clean-install check without the AI SDK present
cannot be done from inside this workspace — it is deferred to Phase 6 Task 2,
which packs a real tarball and installs it into a scratch project. That deferral
is recorded in `test-requirements.md`, which is produced by the planning workflow
and already present alongside these phase files before execution begins.

**Step 3: Build and confirm nested emit**

```bash
cd arcjet-guard
npm run build
ls dist/agents/index.js dist/agents/index.d.ts dist/vercel-ai/v7/index.js dist/vercel-ai/v7/index.d.ts
```

Expected: all four files listed. This confirms `unbundle: true` preserved the
nested structure with no tsdown config change.

**Step 4: Confirm the declared subpaths actually resolve**

```bash
cd arcjet-guard
node --input-type=module -e "
const probes = ['./dist/agents/index.js', './dist/vercel-ai/v7/index.js'];
await Promise.all(probes.map(p => import(p).then(() => console.log('OK', p))));
"
```

Expected: both `OK`. (Resolution through the package name is exercised from the
example in Phase 5 and by the runtime suites in Phase 6.)

**Step 5: Verify the whole package is still green**

```bash
cd arcjet-guard
npm run typecheck && npm run lint && npm run test-unit
```

Expected: all pass, with the existing test count unchanged.

**Step 6: Commit**

```bash
git add arcjet-guard/src/agents/index.ts arcjet-guard/src/vercel-ai/v7/index.ts package-lock.json
git commit -m "build(guard): scaffold the agents and vercel-ai/v7 barrels"
```
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Prove the glob fix — nested discovery AND no top-level loss

**Verifies:** None directly, but this gates AC9.1 for every later phase.

**Files:** none permanently — creates and deletes two throwaway files.

**Implementation:**

Task 1 quoted the glob. This task proves the fix, and it must check **three**
things, not one. A probe that only greps for the nested test's name reports
success even in the broken case — that is exactly how this bug hides.

**Run it as ONE script.** Shell variables do not survive between separate blocks,
and the check must *assert* rather than print — a probe whose failure mode is a
console message that nobody reads is how this bug survived the first review.

```bash
#!/usr/bin/env bash
set -uo pipefail
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/arcjet-guard

count() { npm run test-unit 2>&1 | grep -oE '^ℹ tests [0-9]+' | grep -oE '[0-9]+$'; }

BASELINE=$(count)
echo "baseline tests: $BASELINE"

mkdir -p src/agents src/vercel-ai/v7
cat > src/agents/glob-probe.test.ts <<'EOF'
import assert from "node:assert/strict";
import { test } from "node:test";
test("nested one deep is discovered", () => { assert.equal(1, 1); });
EOF
cat > src/vercel-ai/v7/glob-probe.test.ts <<'EOF'
import assert from "node:assert/strict";
import { test } from "node:test";
test("nested two deep is discovered", () => { assert.equal(1, 1); });
EOF

OUT=$(npm run test-unit 2>&1)
TOTAL=$(echo "$OUT" | grep -oE '^ℹ tests [0-9]+' | grep -oE '[0-9]+$')
FAIL=0
echo "$OUT" | grep -q "nested one deep is discovered" || { echo "FAIL: one-deep probe did not run"; FAIL=1; }
echo "$OUT" | grep -q "nested two deep is discovered" || { echo "FAIL: two-deep probe did not run"; FAIL=1; }
EXPECTED=$((BASELINE + 2))
[ "$TOTAL" = "$EXPECTED" ] || { echo "FAIL: total=$TOTAL expected=$EXPECTED — the glob is collapsing"; FAIL=1; }

rm -f src/agents/glob-probe.test.ts src/vercel-ai/v7/glob-probe.test.ts
RESTORED=$(count)
[ "$RESTORED" = "$BASELINE" ] || { echo "FAIL: baseline not restored ($RESTORED vs $BASELINE)"; FAIL=1; }

[ "$FAIL" -eq 0 ] && echo "PASS: nested discovery works at both depths, no top-level loss" || echo "STOP — do not start Phase 2"
exit "$FAIL"
```

Three conditions must hold, and the third is the one that matters:

1. the one-deep probe ran (this is the depth that triggers shell expansion),
2. the two-deep probe ran (an over-narrow pattern would miss it),
3. **`TOTAL == BASELINE + 2`** — proof that no existing suite was dropped.

Condition 3 is non-negotiable. In the broken state the run reports
`tests 1 / pass 1 / fail 0` and **exits 0**, so conditions 1 and 2 can both
appear to pass while every pre-existing suite silently vanished. Do not
substitute a grep for a top-level test name: `node --test` output does not
include source filenames, so such a sentinel never matches and the check
degrades to always-true.

Expected final output: `PASS: nested discovery works at both depths, no top-level
loss`, exit code 0. Anything else means Task 1's quoting did not take effect —
`grep test-unit package.json` and fix it before Phase 2.

The script leaves `src/agents/index.ts` and `src/vercel-ai/v7/index.ts` in place;
those are Task 2's deliverables. Nothing else persists, so there is **no commit**
for this task beyond Task 1's already-committed `package.json` fix.
<!-- END_TASK_3 -->

---

## Phase 1 exit checklist

- [ ] `arcjet-guard/package.json` declares `./agents` and `./vercel-ai/v7`, and
      does NOT declare `./vercel-ai` or a wildcard
- [ ] `peerDependencies` + `peerDependenciesMeta` mark `ai` and
      `@ai-sdk/provider-utils` optional
- [ ] both are in `devDependencies` at `7.0.36` / `5.0.12`
- [ ] `files` includes `skills/`
- [ ] `npm install` from the root succeeds with no **peer** warnings (the grep
      omits unrelated engine warnings and asserts-exit on actual peer issues)
- [ ] `npm run build` emits all four nested `dist/` files
- [ ] **the `test-unit` glob patterns are single-quoted in `package.json`**
- [ ] **nested discovery proven at one AND two directories deep, with the total
      test count equal to baseline + 2 (not merely "the nested test ran")**
- [ ] `npm run typecheck`, `npm run lint`, `npm run test-unit` all pass
- [ ] `arcjet-ai/` is untouched
