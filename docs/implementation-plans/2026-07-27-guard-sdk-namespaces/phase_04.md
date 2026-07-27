# Guard SDK Namespaces Implementation Plan — Phase 4: Remove the `@arcjet/ai` workspace

**Goal:** Delete the `arcjet-ai/` package and unwind every release/publish change
this branch made for it, leaving no diff against `main` in the automation files.

**Architecture:** Purely subtractive. All source has already moved
(Phases 2 and 3), so nothing here relocates logic. The one thing that must
survive is the example's CI entry — the example itself stays.

**Tech Stack:** npm workspaces, release-please, GitHub Actions.

**Scope:** Phase 4 of 6 from `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`

**Codebase verified:** 2026-07-27

---

## Acceptance Criteria Coverage

This phase implements and tests:

### guard-sdk-namespaces.AC6: The separate package is gone
- **guard-sdk-namespaces.AC6.1 Success:** `arcjet-ai/` does not exist and no workspace named `@arcjet/ai` resolves.
- **guard-sdk-namespaces.AC6.2 Success:** `git diff main` is empty for `.github/.release-please-manifest.json`, `.github/release-please-config.json`, and `.github/workflows/publish.yml`.
- **guard-sdk-namespaces.AC6.3 Success:** `.github/workflows/reusable-examples.yml` still lists `nextjs-ai-agent`.

---

## Prerequisite

Phases 2 and 3 must be complete. Everything under `arcjet-ai/src/` and
`arcjet-ai/test/` must already exist in its new `arcjet-guard/` home, and
`arcjet-guard` must build and test green. **Verify before deleting** — this task
destroys the only other copy.

Run from the repo root:

```bash
git status --short
ls arcjet-guard/src/agents/ arcjet-guard/src/vercel-ai/v7/
```

Expected: both new directories are populated; the working tree is clean or
contains only intended changes.

---

## Verified target locations

The investigator confirmed these exact positions. Line numbers are pre-edit; edit
one file at a time and re-check, since removing lines shifts what follows.

| File | Location | Content to remove |
|---|---|---|
| `.github/.release-please-manifest.json` | line 6 | `"arcjet-ai": "1.9.1",` |
| `.github/release-please-config.json` | lines 39–42 | the `"arcjet-ai": { "component": "@arcjet/ai", "skip-github-release": true },` block |
| `.github/release-please-config.json` | line 276 | `"@arcjet/ai",` inside `plugins` → `linked-versions` → `components` |
| `.github/workflows/publish.yml` | line 226 | `--workspace @arcjet/ai \` in the Level 4 publish block |

**Two locations in `release-please-config.json`, not one.** The package entry and
the linked-versions component list are separate. Missing the second leaves
release-please referencing a component that no longer exists.

**Do NOT touch** `.github/workflows/reusable-examples.yml`. Its
`nextjs-ai-agent` entry (added by this branch) stays — the example survives the
package.

---

<!-- START_TASK_1 -->
### Task 1: Delete the `arcjet-ai/` directory

**Verifies:** `guard-sdk-namespaces.AC6.1`

**Files:**
- Delete: `arcjet-ai/` (entire directory, 24 tracked files)

**Implementation:**

Confirm the migration is complete, then remove the directory with git so the
deletion is staged.

**Step 1: Assert every destination exists before destroying the source**

This is the only safety gate before an irreversible delete. It must *assert*,
not merely print. Run from the repo root:

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
MISSING=0
for f in \
  arcjet-guard/src/agents/ulid.ts \
  arcjet-guard/src/agents/internal.ts \
  arcjet-guard/src/agents/vocabulary.ts \
  arcjet-guard/src/agents/capture.ts \
  arcjet-guard/src/agents/guarded.ts \
  arcjet-guard/src/agents/context.ts \
  arcjet-guard/src/agents/guard-action.ts \
  arcjet-guard/src/agents/index.ts \
  arcjet-guard/src/agents/vocabulary.test.ts \
  arcjet-guard/src/agents/capture.test.ts \
  arcjet-guard/src/agents/context.test.ts \
  arcjet-guard/src/agents/guard-action.test.ts \
  arcjet-guard/src/agents/index.test.ts \
  arcjet-guard/src/vercel-ai/v7/guard-tool.ts \
  arcjet-guard/src/vercel-ai/v7/tools-context.ts \
  arcjet-guard/src/vercel-ai/v7/index.ts \
  arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts \
  arcjet-guard/src/vercel-ai/v7/tools-context.test.ts \
  arcjet-guard/src/vercel-ai/v7/generate-text.test.ts \
  arcjet-guard/src/vercel-ai/v7/warn-missing-context.test.ts \
  arcjet-guard/src/vercel-ai/v7/index.test.ts \
  arcjet-guard/test/_shared/stub-client.ts \
  arcjet-guard/test/_shared/log-level.ts \
  ; do
  [ -f "$f" ] || { echo "MISSING: $f"; MISSING=1; }
done
[ "$MISSING" -eq 0 ] && echo "all destinations present" || { echo "ABORT — migration incomplete"; exit 1; }
```

Expected: `all destinations present`. If anything is missing, **do not delete** —
go back and finish Phase 2 or 3. This list is the union of the phase_02 and
phase_03 mapping tables; if those tables change, change this list to match.

**Step 2: Confirm guard is green on its own**

```bash
cd arcjet-guard && npm run build && npm run typecheck && npm run lint && npm run test-unit
```

Expected: all pass. Deleting the source while `arcjet-guard` is red would leave
no working copy of the code.

**Step 3: Confirm no remaining internal references**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
grep -rn "@arcjet/ai" --include=*.ts --include=*.tsx --include=*.json . 2>/dev/null \
  | grep -v -e node_modules -e package-lock -e 'docs/design-plans/' \
             -e 'docs/implementation-plans/' -e 'arcjet-ai/'
```

Note the exclusions use `-e 'docs/design-plans/'` rather than `-e '^./docs/...'`:
`grep` in this environment prints paths **without** a leading `./`, so an anchored
`^./` pattern silently matches nothing and every exclusion becomes a no-op.

Expected: only `examples/nextjs-ai-agent/` hits, which Phase 5 handles. Any hit
under `arcjet-guard/` means the migration is not finished — stop and fix it.

**Step 4: Copy out anything still needed elsewhere**

Phase 5 needs two files from this directory. Copy them **now**, before deleting:

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
SALVAGE_DIR=$(mktemp -d)
cp arcjet-ai/skills/integrate-arcjet-ai/SKILL.md "$SALVAGE_DIR"/
cp arcjet-ai/README.md "$SALVAGE_DIR"/
ls -la "$SALVAGE_DIR"/
```

Both are inputs to Phase 5 (the skill relocation and the README port). Set the
`SALVAGE_DIR` variable for Phase 5 to use. They are also recoverable afterwards
with `git show <pre-deletion-sha>:arcjet-ai/README.md`, but copying is simpler.

**Step 5: Delete**

```bash
git rm -r arcjet-ai
```

**Step 6: Verify the workspace is gone**

```bash
npm install
npm ls --workspaces --depth=0 2>&1 | grep "@arcjet/ai" && echo "STILL PRESENT — FAIL" || echo "gone"
```

Expected: `gone`, and `npm install` succeeds. The install also rewrites the root
`package-lock.json` to drop the workspace entry.

**Step 7: Commit**

```bash
git add -A
git commit -m "refactor!: remove the @arcjet/ai workspace

Its source now ships from @arcjet/guard as subpath exports."
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Unwind the release-please configuration

**Verifies:** `guard-sdk-namespaces.AC6.2` (partial — the two release-please files)

**Files:**
- Modify: `.github/.release-please-manifest.json` (remove the `arcjet-ai` line)
- Modify: `.github/release-please-config.json` (remove the package block AND the
  linked-versions component)

**Implementation:**

Remove all three entries listed in the table above. Take care with JSON commas —
the manifest entry sits mid-object and the linked-versions entry sits mid-array.

While editing `release-please-config.json`, note that this branch also reordered
the linked-versions list (it moved `@arcjet/analyze-wasm` to restore alphabetical
order alongside inserting `@arcjet/ai`). AC6.2 requires an **empty** diff against
`main`, so that reordering must be reverted too, not just the insertion. Restore
main's pre-existing order: `"root", "@arcjet/analyze-wasm", "@arcjet/analyze",
"@arcjet/astro"`.

**Step 1: Make the edits.**

**Step 2: Verify both files are byte-identical to `main`**

```bash
git diff main -- .github/.release-please-manifest.json .github/release-please-config.json
```

Expected: **no output.** Any output means the unwind is incomplete. This is the
authoritative check for these two files — do not rely on visual inspection.

**Step 3: Verify the JSON is still valid**

```bash
python3 -c "import json; json.load(open('.github/.release-please-manifest.json')); json.load(open('.github/release-please-config.json')); print('valid')"
```

Expected: `valid`

**Step 4: Commit**

```bash
git add .github/.release-please-manifest.json .github/release-please-config.json
git commit -m "chore: drop @arcjet/ai from release-please configuration"
```
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Unwind the publish workflow, keep the example entry

**Verifies:** `guard-sdk-namespaces.AC6.2` (completes it), `guard-sdk-namespaces.AC6.3`

**Files:**
- Modify: `.github/workflows/publish.yml` (remove the `--workspace @arcjet/ai \` line)
- Verify unchanged: `.github/workflows/reusable-examples.yml`

**Implementation:**

Remove the single `--workspace @arcjet/ai \` line from the Level 4 publish block.
Keep the surrounding line continuations intact — a dangling or missing backslash
breaks the shell command.

**Step 1: Make the edit.**

**Step 2: Verify the publish workflow matches `main`**

```bash
git diff main -- .github/workflows/publish.yml
```

Expected: no output.

**Step 3: Verify the example entry survived (AC6.3)**

```bash
grep -n "nextjs-ai-agent" .github/workflows/reusable-examples.yml
```

Expected: one match. If it is missing, restore it — the example is still shipped
and must stay in CI.

**Step 4: Confirm the full automation unwind in one check (AC6.2)**

```bash
git diff main --name-only -- .github/ | grep -v reusable-examples.yml
```

Expected: no output — `reusable-examples.yml` should be the *only* file under
`.github/` that this branch still changes.

**Step 5: Confirm the workspace count matches `main`**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
echo -n "branch: "; grep -c "workspace @arcjet" .github/workflows/publish.yml
echo -n "main:   "; git show main:.github/workflows/publish.yml | grep -c "workspace @arcjet"
```

Expected: both print the same number (31). Step 2's `git diff main` is the
authoritative proof that this file matches `main` byte-for-byte; this count is a
quick human-readable confirmation. No separate line-continuation check is needed —
an empty or dangling continuation would show up as a diff.

**Step 6: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "chore: drop @arcjet/ai from the publish workflow"
```
<!-- END_TASK_3 -->

---

## Phase 4 exit checklist

- [ ] `arcjet-ai/` does not exist
- [ ] `npm install` succeeds and `npm ls --workspaces` shows no `@arcjet/ai`
- [ ] `git diff main -- .github/.release-please-manifest.json` is empty
- [ ] `git diff main -- .github/release-please-config.json` is empty
- [ ] `git diff main -- .github/workflows/publish.yml` is empty
- [ ] `.github/workflows/reusable-examples.yml` still lists `nextjs-ai-agent`
- [ ] Root `package-lock.json` no longer contains an `arcjet-ai` workspace entry
- [ ] `arcjet-guard` still builds and tests green after the deletion
- [ ] `SKILL.md` and `arcjet-ai/README.md` were copied out before deletion (Phase 5
      inputs)

**Known transient state at Phase 4 end:** `examples/nextjs-ai-agent` cannot
install, because its `package.json` and its own `package-lock.json` still point at
`file:../../arcjet-ai`. Phase 5 Task 1 repairs this. It does not break anything
else — the root is `workspaces: ["*"]`, `examples/` has no `package.json` of its
own, and the example carries a separate lockfile — so the root install and all
`arcjet-guard` verification stay green. Do not treat the example's install failure
as a Phase 4 regression.
