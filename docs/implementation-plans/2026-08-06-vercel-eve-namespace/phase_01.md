# Vercel Eve Namespace Implementation Plan — Phase 1: Namespace scaffolding and peer wiring

**Goal:** `@arcjet/guard/vercel-eve/v0` resolves, builds, and typechecks before any logic exists.

**Architecture:** A new `src/vercel-eve/v0/` directory alongside the existing `src/vercel-ai/v7/`, reached by a two-segment literal `exports` key. `eve` becomes an optional peer dependency typed against but never imported at runtime. `tsdown` already globs `src/**/*.ts` with `unbundle: true`, so no build-config change is needed — this phase proves that rather than assuming it.

**Tech Stack:** TypeScript 7, tsdown 0.22, oxlint, `node --test`, npm workspaces.

**Scope:** Phase 1 of 8 from `docs/design-plans/2026-08-06-vercel-eve-namespace.md`.

**Codebase verified:** 2026-08-06

---

## Acceptance Criteria Coverage

This phase implements and tests:

### vercel-eve-namespace.AC1: The subpath resolves as specified
- **vercel-eve-namespace.AC1.1 Success:** `import { guardApproval, guardInbound, guardTool, arcjetHooks, eveAgentContext } from "@arcjet/guard/vercel-eve/v0"` resolves. *(Resolution only in this phase; the named exports arrive in Phases 3–5.)*
- **vercel-eve-namespace.AC1.3 Failure:** `@arcjet/guard/vercel-eve` (unversioned), `@arcjet/guard/vercel-eve/v1` (a major that does not exist yet), and deep paths such as `@arcjet/guard/vercel-eve/v0/guard-approval` do not resolve.
- **vercel-eve-namespace.AC1.4 Success:** The root export surface is unchanged: the export map keys are exactly `.`, `./bun`, `./fetch`, `./node`, `./vercel-ai/v7`, `./vercel-eve/v0`, and the `.` entry's runtime conditions are unchanged. `./agents` is still absent.
- **vercel-eve-namespace.AC1.5 Success:** `eve` appears in `peerDependencies` as `>=0.30 <1` and is marked optional in `peerDependenciesMeta`; installing a project that depends on `@arcjet/guard` without Eve produces no peer warning or error.

---

## Context an engineer needs before starting

- `@arcjet/guard` lives at `arcjet-guard/` in this npm-workspaces monorepo. Run every command from the repo root unless a task says otherwise.
- The existing namespace is at `arcjet-guard/src/vercel-ai/v7/`. Read `arcjet-guard/src/vercel-ai/v7/index.ts` first — the new barrel mirrors its shape, including the proxy re-export of `../../agents/index.ts`.
- `arcjet-guard/src/agents/` is **internal**: it has no `exports` entry and must never get one. Every agnostic symbol reaches users re-exported from a vendor namespace.
- Guard's source imports siblings with a `.ts` extension (`./context.ts`), not `.js`. `rewriteRelativeImportExtensions` fixes them on emit.
- Tests are co-located as `src/**/*.test.ts` and import **source**, never `dist/`.
- `arcjet-guard/src/vercel-ai/v7/index.test.ts` contains an **exact** `deepEqual` over the export-map key set, and it breaks in this phase. That is by design: it is the test that would otherwise let an accidental export slip in. The namespace key-count assertion in the same file (`v7Keys.length === agentKeys.length + 2`, line ~65) does **not** break — it counts v7's own two extra exports and a sibling namespace does not affect it.

---

<!-- START_TASK_1 -->
### Task 1: Add the export map entry and the optional peer

**Verifies:** None (infrastructure).

**Files:**
- Modify: `arcjet-guard/package.json`

**Step 1: Add the subpath export**

In `arcjet-guard/package.json`, add a `./vercel-eve/v0` entry to `exports`, immediately after `./vercel-ai/v7`:

```json
    "./vercel-ai/v7": {
      "types": "./dist/vercel-ai/v7/index.d.ts",
      "import": "./dist/vercel-ai/v7/index.js"
    },
    "./vercel-eve/v0": {
      "types": "./dist/vercel-eve/v0/index.d.ts",
      "import": "./dist/vercel-eve/v0/index.js"
    }
```

Do **not** add `./vercel-eve`, `./vercel-eve/v1`, or a wildcard `./vercel-eve/*`. Their absence is asserted behaviour (AC1.3), not an omission.

**Step 2: Add `eve` as an optional peer and a devDependency**

In the same file, add `eve` to `peerDependencies`, `peerDependenciesMeta` and `devDependencies`:

```json
  "devDependencies": {
    "@ai-sdk/provider-utils": "5.0.12",
    "@types/node": "22.20.1",
    "ai": "7.0.36",
    "eve": "<exact version from `npm view eve version` — see below>",
    "miniflare": "4.20260708.1",
    ...
  },
  "peerDependencies": {
    "@ai-sdk/provider-utils": ">=5 <6",
    "ai": ">=7 <8",
    "eve": ">=0.30 <1"
  },
  "peerDependenciesMeta": {
    "@ai-sdk/provider-utils": {
      "optional": true
    },
    "ai": {
      "optional": true
    },
    "eve": {
      "optional": true
    }
  }
```

Pin the devDependency to an exact version, matching how `ai` and `@ai-sdk/provider-utils` are pinned. Before writing the number, confirm the current release rather than trusting this document:

```bash
npm view eve version
```

`0.31.0` was current on 2026-08-06 — it superseded `0.30.8` *during planning*, which is why this instruction exists. Pin what `npm view` reports and keep the peer range at `>=0.30 <1`.

**Then record the pinned version in the phase summary**, because Phases 3, 4 and 5 each carry a "verify against the installed typings" step and every Eve API claim in them was originally read from `0.30.8`. Those steps are not optional ceremony; they are what makes a plan written against one minor safe to execute against another.

**Step 3: Verify**

```bash
npm install
```

Expected: completes with no `EBADENGINE` **error** and no peer-dependency error. A `warn EBADENGINE` line mentioning `eve` and `node` is expected and acceptable on Node 22 — `eve` declares `engines.node: ">=24"`, and this repo's `.npmrc` does not set `engine-strict`, so the field is advisory. Task 2 verifies that explicitly.

**Step 4: Commit**

```bash
git add arcjet-guard/package.json package-lock.json
git commit -m "build(guard): add the vercel-eve/v0 export and the eve optional peer"
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Verify the install is safe on the whole CI matrix

**Verifies:** None (infrastructure) — but this task is what makes AC2.2 achievable in Phase 8, so do not skip it.

**Files:** None (verification only).

**Why this task exists:** two install-time hazards, both of which would surface as a red CI run days later rather than as a local failure now.

1. `.github/workflows/guard.yml` runs unit tests on a `node: [22, 24, 26]` matrix and installs with plain `npm install`. `eve` requires Node ≥24.
2. The repo's `.npmrc` sets `strict-allow-scripts=true`, which fails an install when a dependency introduces a lifecycle script that is not on the root allowlist. `eve` itself declares no `install`/`prepare`/`postinstall` script, but it depends on `nitro` (a beta release) and `undici`, and the transitive set is what actually matters.

**Step 1: Confirm the Node 22 install succeeds**

On Node 22:

```bash
node --version   # expect v22.x
rm -rf node_modules
npm install
```

Expected: exits 0. Warnings about `eve` and `engines` are acceptable; an error is not.

**Step 2: Confirm no new lifecycle scripts are introduced**

```bash
npm query ":attr(scripts, [install]), :attr(scripts, [preinstall]), :attr(scripts, [postinstall]), :attr(scripts, [prepare])" --json \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d);console.log(p.map(x=>x.name+'@'+x.version).sort().join('\n')||'(none)')})"
```

Run this **before** Task 1's install and again after, and diff the two lists. Expected: no new entries.

If a new entry appears, stop and surface it. Do not add it to the allowlist unilaterally — `strict-allow-scripts` exists so that a new scripted dependency is a reviewed decision.

**Step 3: Confirm the unit-test command still passes**

```bash
npm run test-unit --workspace @arcjet/guard
```

Expected: the existing suite passes unchanged (no `src/vercel-eve/` files exist yet).

**Step 4: Record the findings**

No commit. Report in the phase summary: the Node 22 install outcome, the lifecycle-script diff, and the exact `eve` version pinned.
<!-- END_TASK_2 -->

<!-- START_SUBCOMPONENT_A (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: Create the placeholder barrel

**Verifies:** vercel-eve-namespace.AC1.1 (resolution).

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/index.ts`

**Implementation:**

Create the barrel with the package documentation block and the proxy re-export only. No helper exists yet; the proxy is what makes the path resolvable and non-empty.

```ts
/**
 * @packageDocumentation
 *
 * Vercel Eve namespace for Arcjet Guards.
 *
 * This module provides Eve-specific guard helpers plus the framework-agnostic
 * layer they build on, so an Eve agent needs one import path and no notion of
 * layering.
 *
 * **Requires the optional peer dependency `eve@>=0.30 <1`**, and Eve's own
 * Node floor of 24 — higher than `@arcjet/guard`'s. Nothing in this module
 * imports `eve` at runtime: every Eve type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls Eve in.
 *
 * **Note:** the version segment is `v0` because Eve is pre-1.0 and has never
 * published a 1.x. A `v1` namespace is added when Eve reaches 1.0; the segment
 * names the SDK's major, not this integration's iteration.
 */

export * from "../../agents/index.ts";
```

Match the surrounding comment density: the v7 barrel carries a full worked example, and this one will too once the helpers exist. Do not write a placeholder example against functions that do not exist yet.

**Verification:**

```bash
npm run build --workspace @arcjet/guard
ls arcjet-guard/dist/vercel-eve/v0/
```

Expected: `index.js` and `index.d.ts` are present. This is the proof that `tsdown`'s `unbundle: true` glob picks up a new nested directory with no config change.

```bash
npm run typecheck --workspace @arcjet/guard
npm run lint --workspace @arcjet/guard
```

Expected: both pass.

**Commit:** `build(guard): scaffold the vercel-eve/v0 barrel`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Update the export-map assertions

**Verifies:** vercel-eve-namespace.AC1.3, vercel-eve-namespace.AC1.4.

**Files:**
- Modify: `arcjet-guard/src/vercel-ai/v7/index.test.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/index.test.ts`

**Implementation:**

Two edits and one new file. Read `arcjet-guard/src/vercel-ai/v7/index.test.ts` in full first — the assertions below already exist there in a form that will now fail.

In `arcjet-guard/src/vercel-ai/v7/index.test.ts`:

1. In the test named `AC1.1: root export map keys and runtime conditions unchanged`, add `"./vercel-eve/v0"` to `expectedRootKeys`. The list is sorted, so it goes last.
2. In the test named `AC1.5 and AC1.6: export map has correct subpaths`, leave the `./vercel-ai` and `./vercel-ai/v6` negative assertions and the `./agents` negative assertion exactly as they are. They still hold and are not this phase's business.

That is **one** edited test, in step 1. Step 2 is a "confirm and leave alone" instruction, not a change.

The v7 file's `AC1.4` test asserts `v7Keys.length === agentKeys.length + 2`. That arithmetic is about the v7 namespace's own exports and is **not** affected by adding a sibling namespace — do not touch it.

Then create `arcjet-guard/src/vercel-eve/v0/index.test.ts` with the Eve-side export-map assertions, following the v7 file's structure (`readJsonObject`/`objectField` helpers can be duplicated locally; they are small and the v7 file does not export them):

**Testing:** Tests must verify each AC listed above:
- **AC1.3:** the export map has no `./vercel-eve` key, no `./vercel-eve/v1` key, and every key beginning `./vercel-eve/` is exactly `./vercel-eve/v0`. This is a static read of `arcjet-guard/package.json`, mirroring how the v7 suite does it — no build and no `import()` of an unexported path is needed, and a static check runs on every platform in the matrix.
- **AC1.4:** the full sorted key set equals `[".", "./bun", "./fetch", "./node", "./vercel-ai/v7", "./vercel-eve/v0"]`, and the `.` entry's condition keys still equal `["bun", "default", "deno", "edge-light", "node", "workerd"]`. Assert the whole set with `deepEqual`, not membership — an extra key must fail.
- **AC1.4:** `./agents` is absent.

Add one further test asserting `./vercel-eve/v0` **is** present, so a rename or a typo in Task 1 fails loudly rather than passing the negative assertions vacuously.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
```

Expected: all tests pass, including the one edited v7 test and the new Eve file. Confirm the new file is actually collected — the `test-unit` glob is `'src/**/*.test.ts'` and is single-quoted in `package.json`, so nested files are picked up; check the test count rose rather than assuming it.

**Commit:** `test(guard): assert the vercel-eve/v0 export map and the absence of an alias`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_TASK_5 -->
### Task 5: Verify AC1.5 by installing without Eve

**Verifies:** vercel-eve-namespace.AC1.5.

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/peer.test.ts`

**Implementation:**

The static half of AC1.5 is testable in-repo; the install half is not, and conflating them produces a test that claims more than it checks.

**Testing:** the test file asserts, by reading `arcjet-guard/package.json`:
- `peerDependencies.eve` is exactly `">=0.30 <1"`.
- `peerDependenciesMeta.eve.optional` is `true`.
- `eve` is **not** in `dependencies`. A vendor SDK in `dependencies` would force it on every consumer, which is the whole failure this structure exists to prevent.

**Verification (the install half, manual):**

```bash
mkdir -p /tmp/aj-peer-check && cd /tmp/aj-peer-check
npm init -y >/dev/null
npm pack ../../path/to/arcjet-js/arcjet-guard   # adjust to the repo path
npm install ./arcjet-guard-*.tgz 2>&1 | tee install.log
grep -Ei "peer|EBADENGINE" install.log || echo "no peer or engine complaints"
```

Expected: no peer-dependency warning or error mentioning `eve`, `ai`, or `@ai-sdk/provider-utils`. Record the output in the phase summary; this is the observation AC1.5's second clause rests on, and there is no automated substitute for it in this repo.

Then confirm the encapsulation claim on the packed tarball:

```bash
node --input-type=module -e "
for (const p of ['@arcjet/guard', '@arcjet/guard/vercel-eve/v0']) {
  try { await import(p); console.log('resolved:', p) } catch (e) { console.log('FAILED:', p, e.code) }
}
for (const p of ['@arcjet/guard/vercel-eve', '@arcjet/guard/vercel-eve/v1', '@arcjet/guard/vercel-eve/v0/guard-approval', '@arcjet/guard/agents']) {
  try { await import(p); console.log('UNEXPECTEDLY resolved:', p) } catch (e) { console.log('correctly refused:', p, e.code) }
}
"
```

Expected: the first two resolve; the remaining four each report `ERR_PACKAGE_PATH_NOT_EXPORTED`. `@arcjet/guard/vercel-eve/v0` resolves here without `eve` installed, which is the type-only guarantee showing up for the first time — note it, because the equivalent check for `vercel-ai/v7` fails by design (it imports `ai` at runtime).

**Commit:** `test(guard): assert eve is an optional peer and not a dependency`
<!-- END_TASK_5 -->

---

## Phase 1 done when

- `npm install` succeeds on Node 22 and Node 24 with no new lifecycle scripts.
- `npm run build --workspace @arcjet/guard` emits `dist/vercel-eve/v0/index.js` and `.d.ts`.
- `npm run typecheck --workspace @arcjet/guard` (both configs) and `npm run lint --workspace @arcjet/guard` pass.
- `npm run test-unit --workspace @arcjet/guard` passes, with a higher test count than the pre-phase baseline.
- The manual packed-tarball check recorded: `@arcjet/guard/vercel-eve/v0` resolves without `eve` present; the unversioned parent, `v1`, a deep path, and `./agents` all report `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- The pinned `eve` version is recorded in the phase summary, for Phases 3–5 to re-verify their API claims against.
