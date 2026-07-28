# Guard SDK Namespaces Implementation Plan — Phase 5: Example and documentation migration

**Goal:** Move the example app and all prose onto the new import paths, relocate
the integration skill into `arcjet-guard`, and document the subpath convention so
`vercel-eve/v1` can be added later without re-deciding structure.

**Architecture:** Three import layers become visible to users for the first time
here. The example is also the only place the new export map is exercised through a
real bundler, which matters because Turbopack has a documented subpath-exports
bug.

**Tech Stack:** Next.js 16.2.6, Workflow DevKit 4.6.1, `ai@7.0.36`, zod 4.4.3.

**Scope:** Phase 5 of 6 from `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`

**Codebase verified:** 2026-07-27

---

## Acceptance Criteria Coverage

This phase implements and tests:

### guard-sdk-namespaces.AC5: The renames are complete
- **guard-sdk-namespaces.AC5.2 Success:** No `createAiContext` or `ArcjetAiContext` identifier remains anywhere in source, tests, docs, the skill, or the example.

Completed by Task 7's final sweep, after Task 6 ports the README and Task 7
rewrites the test plan. Tasks 1–5 get most of the way there; the sweep is only
authoritative once those two content changes have landed.

- **guard-sdk-namespaces.AC5.4 Success:** The enforcing helpers are exported as `guardTool` and `guardAction` (with `GuardToolPolicy` / `GuardActionPolicy`); no `protectTool`, `protectAction`, `ProtectToolPolicy` or `ProtectActionPolicy` identifier remains anywhere in source, tests, docs, the skill, or the example.

### guard-sdk-namespaces.AC7: The example runs on the new paths
- **guard-sdk-namespaces.AC7.1 Success:** The example imports only from `@arcjet/guard`, `@arcjet/guard/agents`, and `@arcjet/guard/vercel-ai/v7`, and its `package.json` has no `@arcjet/ai` dependency.
- **guard-sdk-namespaces.AC7.2 Success:** The example builds.

### guard-sdk-namespaces.AC8: Documentation carries the convention
- **guard-sdk-namespaces.AC8.1 Success:** The integration skill lives under `arcjet-guard/skills/`, and `skills/` is included in the package's `files`.
- **guard-sdk-namespaces.AC8.2 Success:** Every code example in the README, JSDoc, and skill compiles against the installed typings.
- **guard-sdk-namespaces.AC8.3 Success:** The README states the `<vendor-sdk>/v<major>` convention, the optional-peer requirement, and the no-unversioned-alias rule, and names `vercel-eve/v1` as the next target.

---

## Verified current state

The example's four relevant files and their exact imports:

| File | Line(s) | Current import |
|---|---|---|
| `examples/nextjs-ai-agent/lib/arcjet.ts` | 1 | `import { launchArcjet } from "@arcjet/guard";` |
| `examples/nextjs-ai-agent/app/api/agent/route.ts` | 1 | `import { createAiContext, securityMetadata } from "@arcjet/ai";` |
| `examples/nextjs-ai-agent/workflows/support-agent.ts` | 1–7 | `import { aiToolsContext, captureAction, protectAction, protectTool, securityMetadata } from "@arcjet/ai";` — note the **old** verb names, which Task 1 must rename |
| `examples/nextjs-ai-agent/workflows/support-agent.ts` | 8 | `import type { ArcjetAiContext } from "@arcjet/ai";` |
| `examples/nextjs-ai-agent/workflows/support-agent.ts` | 9 | `import { slidingWindow, tokenBucket } from "@arcjet/guard";` |

`examples/nextjs-ai-agent/package.json` dependencies include
`"@arcjet/ai": "file:../../arcjet-ai"` and
`"@arcjet/guard": "file:../../arcjet-guard"`. The first must go; the second stays.

The skill is a single file: `arcjet-ai/skills/integrate-arcjet-ai/SKILL.md`
(7101 bytes). `arcjet-guard` has `README.md`, `CONTRIBUTING.md`, and
`CHANGELOG.md`.

**Ordering note:** Phase 4 deletes `arcjet-ai/`, so by the time this phase runs
neither `SKILL.md` nor `arcjet-ai/README.md` exists on disk. Do **not** try to
copy them out first — Phase 4 Task 1 Step 4 records the pre-deletion SHA in
`docs/implementation-plans/2026-07-27-guard-sdk-namespaces/.pre-deletion-sha`
and verifies both are readable at it. Every reference to their *content* in this
phase (Task 3's four `SKILL.md` line anchors, Task 6's README port) is read back
with `git show "$(cat …/.pre-deletion-sha):<path>"`.

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: Retarget the example's imports

**Verifies:** `guard-sdk-namespaces.AC7.1`

**Files:**
- Modify: `examples/nextjs-ai-agent/package.json` (remove the `@arcjet/ai` dependency)
- Modify: `examples/nextjs-ai-agent/app/api/agent/route.ts:1`
- Modify: `examples/nextjs-ai-agent/workflows/support-agent.ts:1-9`
- Modify: `examples/nextjs-ai-agent/README.md:79` — reword the sentence that
  says "`@arcjet/ai` logs a warning at the …" to name `@arcjet/guard` instead.
  Without this, Step 3's check cannot report clean.
- No changes needed: `examples/nextjs-ai-agent/lib/arcjet.ts` (already imports
  `launchArcjet` from `@arcjet/guard`, which is unchanged)

**Implementation:**

Remove `"@arcjet/ai": "file:../../arcjet-ai",` from `dependencies`.

`app/api/agent/route.ts` — both symbols are framework-agnostic, so both come from
the agents layer, and `createAiContext` is renamed:

```ts
import { createAgentContext, securityMetadata } from "@arcjet/guard/agents";
```

Update the call site from `createAiContext(...)` to `createAgentContext(...)`.

`workflows/support-agent.ts` — this file uses symbols from both layers. Because
the v7 namespace proxies the shared layer, everything except the rule builders can
come from one path:

```ts
import {
  aiToolsContext,
  captureAction,
  guardAction,
  guardTool,
  securityMetadata,
} from "@arcjet/guard/vercel-ai/v7";
import type { ArcjetAgentContext } from "@arcjet/guard/vercel-ai/v7";
import { slidingWindow, tokenBucket } from "@arcjet/guard";
```

Rename the `ArcjetAiContext` type reference in `SupportAgentInput` to
`ArcjetAgentContext`.

**Also rename the call sites.** This file calls `protectTool(` once and
`protectAction(` once, and names them in the import list — **4 occurrences total**.
Change them to `guardTool(` / `guardAction(`. The import block above already shows
the new names; the call sites are separate edits and are easy to miss.

Using the single proxied path here is deliberate: it exercises AC1.4 in a real
consumer and demonstrates the intended ergonomics. Do **not** split these across
two imports.

**Do NOT set `onGuardError` on the consequential calls — that is now the default.**
Review (davidmytton) noted these are live enforcement events, unlike bot-checking a
page view, and asked for `"deny"` to be the default; it is. So the example gets a
short comment on the `ticket.updated` `guardAction` policy **only** — the write —
noting that an unevaluable policy blocks the call by default, rather than an
explicit option that would imply the opposite default. Do **not** put that comment
on `lookupOrder`: the next paragraph sets `onGuardError: "allow"` there, so a
"blocks by default" comment would be false at that very call site. An earlier
draft of this task said to add `onGuardError: "deny"` explicitly — that instruction
is superseded; adding it would be harmless at runtime but would teach readers that
fail-open is what they get for free.

**Demonstrate the opt-out once, where it is the right call.** So the example shows
both sides of the lever: set `onGuardError: "allow"` on the `lookupOrder` `guardTool`
policy, with a comment that an order lookup is read-only, so availability beats
enforcement. This demonstrates that the option exists and where to use it. Do not
leave the example silent on the option: `onGuardError` is the one setting whose
*default* changed, and the example is where most readers will infer it from.

**Also show rules derived from tool input.** qw-in had to guess from the README
whether `rules: ({ orderNumber }) => [...]` was supported. The example's
`lookupOrder` tool already uses a `rules` callback — but
`support-agent.ts:50` is currently `rules: () => [lookupLimit({ key:
"demo-user", requested: 1 })]`, which **discards its argument**. A comment alone
would assert the shape without demonstrating it. Change that line to a genuinely
input-derived callback, keying the rate limit on the tool's own `orderNumber`:

```ts
rules: ({ orderNumber }) => [
  lookupLimit({ key: `order:${orderNumber}`, requested: 1 }),
],
```

Keep a short comment noting a moderation rule could be computed the same way. The
README states it too (Task 4 item 10) — the example shows it, the README
documents it.

**Show the explicit-call alternative.** qw-in noted a personal preference for
wiring the guard call inside the `execute` block rather than wrapping the tool:
"My (personal) preference for guards would be to wire an explicit call in the
`execute` block but I know many people would prefer something like this." Both are
supported — `guardAction` called directly inside a tool's `execute` is exactly that
explicit form. Add a comment at the `lookupOrder` tool pointing this out, naming
the trade-off: `guardTool` pulls the context out of the call automatically via the
injected `contextSchema`, whereas an explicit `guardAction` inside `execute`
requires threading the context in by hand but keeps the control flow visible. The
README (Task 4) documents it properly; here it just needs to be discoverable.

Leave the `"use workflow"` / `"use step"` directives alone — they are Workflow
DevKit function-level directives consumed by `withWorkflow()` in
`next.config.ts`, and removing them breaks the workflow. CodeQL has flagged them
twice; both were dismissed.

**Step 1: Make the edits.**

**Step 2: Reinstall so the removed dependency drops out**

This must run **inside the example directory** — the example carries its own
`examples/nextjs-ai-agent/package-lock.json`, and that is the lock that changes.
A bare `npm install` at the repo root will not remove the dependency.

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/examples/nextjs-ai-agent
npm install
git status --short package-lock.json package.json
```

Expected: the example's own lockfile shows as modified and no longer references
`arcjet-ai`. Confirm with:

```bash
if grep -q "arcjet-ai" package-lock.json; then
  echo "FAIL: residual arcjet-ai reference in the example lockfile"; return 1
fi
echo "0 references — good"
```

**Step 3: Verify no `@arcjet/ai` reference survives in the example (AC7.1)**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
grep -rn "@arcjet/ai" examples/nextjs-ai-agent \
  --include=*.ts --include=*.tsx --include=*.json --include=*.md \
  | grep -v package-lock || echo "clean"
```

`--include=*.md` matters: `examples/nextjs-ai-agent/README.md` line 79 also
mentions `@arcjet/ai`, and this task owns that edit (see the Files list above).

Expected: `clean`

**Step 4: Commit**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
git add examples/nextjs-ai-agent
git commit -m "refactor(example): import from @arcjet/guard subpaths"
```

Note the example's lockfile lives inside `examples/nextjs-ai-agent/`, so the
single `git add` above covers it. The root `package-lock.json` was already updated
in Phase 4.
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Build the example

**Verifies:** `guard-sdk-namespaces.AC7.2`

**Files:** none modified — this is a verification task.

**Implementation:**

The example is the only place the new export map is resolved by a real bundler.
Two documented risks apply, so treat a failure here as informative rather than
surprising:

- **Turbopack** has an open bug resolving subpath exports for *transitive*
  dependencies (vercel/next.js#88540). The example depends on `@arcjet/guard`
  directly, which is the case that should work — but if the build fails on
  module resolution, test whether webpack succeeds where Turbopack does not, and
  record the finding.
- The `file:` dependency means the example resolves `@arcjet/guard` through a
  symlink into the workspace, so `arcjet-guard` **must be built first** — the
  export map points at `dist/`.

**Step 1: Build guard, then the example**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
npm run build --workspace @arcjet/guard
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js/examples/nextjs-ai-agent
npm run build
```

Expected: both succeed. If the example fails to resolve
`@arcjet/guard/vercel-ai/v7` or `@arcjet/guard/agents`, confirm
`arcjet-guard/dist/vercel-ai/v7/index.js` and `dist/agents/index.js` exist before
investigating the bundler.

**Step 2: Record the outcome.** If Turbopack fails and webpack works, note it in
the README's caveats section (Task 4) so consumers are not surprised.

**Step 3: No commit** unless a fix was required.
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-5) -->
<!-- START_TASK_3 -->
### Task 3: Relocate the integration skill

**Verifies:** `guard-sdk-namespaces.AC8.1`

**Files:**
- Create: `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md`
- Input: `git show "$(cat docs/implementation-plans/2026-07-27-guard-sdk-namespaces/.pre-deletion-sha):arcjet-ai/skills/integrate-arcjet-ai/SKILL.md"`
  — the file was deleted in Phase 4 and this is the only way to read it. The line
  anchors below (`SKILL.md:60`, `:95`, `:142`, `:166-168`) refer to that content.
  Write it to a scratch path first if you prefer to read it repeatedly.
- Delete: `arcjet-ai/skills/integrate-arcjet-ai/SKILL.md` (via Phase 4's directory removal)

**Implementation:**

Move the skill and rewrite it for the new structure. The directory name changes
because the skill no longer integrates a package called `@arcjet/ai`.

Content changes required throughout:
- install instructions: `@arcjet/guard` plus `ai` (the AI SDK is now an optional
  peer, so say so explicitly rather than implying it comes along)
- every import rewritten to the correct layer — core from `@arcjet/guard`,
  agnostic helpers from `@arcjet/guard/agents`, `guardTool`/`aiToolsContext`
  from `@arcjet/guard/vercel-ai/v7`
- `createAiContext` → `createAgentContext`, `ArcjetAiContext` →
  `ArcjetAgentContext`
- **`protectTool` → `guardTool` and `protectAction` → `guardAction`** (plus
  `ProtectToolPolicy` → `GuardToolPolicy`, `ProtectActionPolicy` →
  `GuardActionPolicy`). There are **8** such occurrences in the current
  `SKILL.md`. Missing these ships a packaged skill that instructs agents to call
  exports which do not exist
- keep the existing warning that the compiler will not catch a missing
  `toolsContext`
- show metadata carrying a **nested** value somewhere, since flat strings are no
  longer the only option and the previous docs implied they were
- state that the version segment is explicit and there is no unversioned alias

**Review feedback to incorporate (davidmytton, 2026-07-27):**

1. **Explain what `correlationId` is *for*** (comment on `SKILL.md:60`): "Worth
   adding an explanation of what the `correlationId` is for, then the AI can decide
   which ID is best suited (or let us generate one)." Add a short paragraph: it
   joins every guard decision and capture event from one logical run **or session**
   into a single sequence in the Arcjet console, so the best value is an ID the app
   already has and can be searched by (request ID, job ID, ticket ID, review ID);
   omit it and a ULID is generated.

   The wording "run **or session**" is davidmytton's explicit follow-up on the
   draft text ("I suggest adding session as well"), so keep both nouns — a
   long-lived chat session and a single background run are both valid scopes, and
   naming only one narrows the guidance the agent reading this skill will follow.
   Use the same phrasing in the README (Task 4).
2. **The lone `octokit` reference** (`SKILL.md:142`): "This is the first and only
   time `octokit` appears. Worth commenting what it's representing, or use a generic
   example." Replace it with a generic external call, or add a one-line comment
   naming it as an example GitHub API client.
3. **The metadata-caps paragraph is stale** (`SKILL.md:166-168`): davidmytton flagged
   "This is no longer accurate". **Resolved — no need to ask.** arcjet-js#6171
   (merged 2026-07-27, in this branch's history after the rebase) rewrote metadata
   entirely, and its `arcjet-guard/README.md` "Metadata" section is authoritative.
   Replace the "max 20 pairs, key <=64 bytes, value <=512 bytes, extras dropped" paragraph with
   the current server-enforced behaviour:

   | Limit | Value | Over the limit |
   |---|---|---|
   | Top-level keys | 128 | extra keys dropped |
   | Serialized bytes per value | 4 KiB | that key dropped |
   | Nesting depth per value | 10 | that key dropped |
   | Key names | letters, digits, `-`, `.`, `_` | that key dropped |

   Plus the points that change the guidance materially:
   - metadata accepts **any JSON-serializable value** — nested objects and arrays
     included, not flat strings
   - nothing about metadata can fail a call or change a decision; it is excluded
     from fingerprinting
   - every dropped key is reported on `decision.warnings`, and the SDK adds one
     `AJ1017` warning naming values it could not encode (`undefined`, a function, a
     `BigInt`, a circular reference)
   - a `metadata` that is not a plain object is ignored entirely
   - metadata is untrusted and **not redacted** — no secrets or PII
   - numbers are float64, so integers above `Number.MAX_SAFE_INTEGER` should be
     passed as strings

   Delete the old warning that merging `ctx.metadata` with per-call
   `securityMetadata()` "can quietly exceed 20 pairs": the limit is now 128
   top-level keys and drops surface as warnings rather than silently.
4. **Fail-closed guidance** (`SKILL.md:95`): the current text says only that guard
   API failures fail open. That is now **wrong**, not merely incomplete — the
   default is `"deny"`. Replace it with:
   - the default is `"deny"`: if the policy cannot be evaluated, the call is
     blocked, because these helpers wrap consequential effects;
   - `onGuardError: "allow"` is the opt-out, for call sites where availability
     matters more than enforcement;
   - what the agent reading this skill will actually see on that path —
     `guardTool` returns `reason: "ERROR"` with `retryable: true` (so the model can
     retry or explain, rather than treating it as a permanent refusal), and
     `guardAction` throws `ArcjetGuardUnavailableError`, which is **not**
     `ArcjetDeniedError` and should be caught separately if the app distinguishes
     "blocked by policy" from "policy unavailable";
   - the fail-closed tool result carries **`retryAfterSeconds: 5`** (AC4.13) — a
     fixed backoff hint, not a prediction of when the policy becomes evaluable.
     An agent reading this skill writes the retry/backoff handling, so this is
     the number it needs.
   - the capture event records **`outcome: "unavailable"`**, deliberately not
     `"denied"`, so an operator can query a policy outage separately from a
     policy denial.
   - one sentence on the layering, since it looks like an inconsistency otherwise:
     the `@arcjet/guard` client still fails open by construction and *reports* it
     via `hasFailedOpen()`; these helpers are what *decide* to block on it.

5. **The explicit-call alternative** (qw-in): state that calling `guardAction`
   directly inside a tool's `execute` is a supported alternative to wrapping with
   `guardTool`, and when to prefer each — `guardTool` extracts the context from the
   call automatically via the injected `contextSchema`; the explicit form keeps
   control flow visible but requires threading the context in by hand. An agent
   following this skill should not conclude that wrapping is the only option.

`arcjet-guard/package.json` already lists `skills/` in `files` from Phase 1 — no
packaging change needed here. Verify it is still there.

**Step 1: Create the new skill file with the rewritten content.**

**Step 2: Verify packaging includes it (AC8.1)**

```bash
cd arcjet-guard
python3 -c "import json; print('skills/' in json.load(open('package.json'))['files'])"
npm pack --dry-run 2>&1 | grep -c "skills/"
```

Expected: `True`, and a non-zero count of `skills/` entries in the pack listing.

**Step 3: Commit**

```bash
git add arcjet-guard/skills/
git commit -m "docs(guard): move the integration skill into arcjet-guard"
```
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Document the subpath convention in the README

**Verifies:** `guard-sdk-namespaces.AC8.3`

**Files:**
- Modify: `arcjet-guard/README.md`

**Implementation:**

Add a section covering the three layers and the rules for extending them. It must
state, explicitly:

1. **The three layers** and what belongs in each, with a working import example
   for all three.
2. **The convention:** `@arcjet/guard/<vendor-sdk>/v<major>`, vendor-prefixed and
   flat. Name `vercel-eve/v1` as the next planned namespace so the pattern is
   unambiguous with a second example.
3. **Explicit versions only — no unversioned aliases.** `@arcjet/guard/vercel-ai`
   does not resolve, deliberately: with a fast-moving SDK surface, an alias would
   silently change meaning when a new major is supported. Note that unexported
   paths throw `ERR_PACKAGE_PATH_NOT_EXPORTED`.
4. **Optional peers.** The `vercel-ai/v7` subpath requires `ai` and
   `@ai-sdk/provider-utils`; they are optional peers, so nothing is forced on
   users who only want core guard or the agnostic `/agents` layer. Record the
   **pnpm caveat**: pnpm does not reliably honour
   `peerDependenciesMeta.*.optional` (pnpm#5152, #8142), especially with
   `--strict-peer-dependencies`, so pnpm users may need to install the peers
   explicitly or relax strict peer checking.
5. **Turbopack caveat**, if Task 2 found one.
6. **Why `/agents` exists separately** — one sentence: importing anything that
   re-exports `guardTool` loads `ai`, so non-AI callers need a path that never
   reaches an AI SDK.
7. **`onGuardError`** — document the option and its **`"deny"` default**, which is
   the one place these helpers deliberately diverge from the platform's fail-open
   convention. Cover:
   - what "the guard is unavailable" means: **both** the `guard()` call throwing and
     a decision whose `hasFailedOpen()` is `true`. Readers who know the platform
     will assume only the first, and the second is the common one.
   - the surfaces: `reason: "ERROR"` / `retryable: true` to the model for
     `guardTool`; `ArcjetGuardUnavailableError` thrown for `guardAction`. Note the
     error type is deliberately distinct from `ArcjetDeniedError` so a policy outage
     can be alerted on separately from a policy denial, and that it carries `cause`
     (the guard call threw) or `decision` (a decision failed open) so the two are
     distinguishable in a handler.
   - the fixed **`retryAfterSeconds: 5`** on the unavailable result (AC4.13), and
     that it is a backoff hint rather than a reset time.
   - the capture `outcome` on that path is **`"unavailable"`**, not `"denied"` —
     name the field, since it is what an operator alerts on.
   - the layering, in one line: the client fails open and *reports* it; the helper
     *decides* to block. Without this the two defaults read as a bug.
   - `onGuardError: "allow"` as the opt-out, and its consequence — an Arcjet
     incident no longer affects that call site, and no enforcement happens there
     during one.
   - the cost of the default, stated plainly: a `guardAction` wrapping a background
     job will throw during an Arcjet incident rather than degrade. Users who prefer
     the opposite for a given call site have `"allow"`.

8. **The explicit-call alternative** — `guardAction` inside a tool's `execute` is a
   supported alternative to `guardTool` wrapping (qw-in raised this preference on
   the PR). Show both forms and name the trade-off: automatic context extraction
   versus visible control flow.

9. **What `correlationId` is for** — davidmytton asked for this on the skill and
   it belongs in the README too, in the same words: it joins every guard decision
   and capture event from one logical **run or session** into a single sequence in
   the Arcjet console, so the best value is an ID the app already has and can
   search by (request ID, job ID, ticket ID, review ID); omit it and a ULID is
   generated. Task 3 item 1 carries the identical paragraph for the skill — port
   it, do not re-word it.
10. **`rules` may be a callback over the tool's parsed input** — one line, with a
   signature example. qw-in had to guess this *from the README*, so answering it
   only in an example comment leaves the original gap open.

Also add a short "adding a new SDK namespace" note: new
`src/<vendor-sdk>/v<major>/` directory, new `exports` entry, new optional peer if
required; no changes to the shared layer or the build config.

**Step 1: Write the section.**

**Step 2: Verify the required content is present (AC8.3)**

Grep for distinctive strings, not for common words. `optional` already appears in
the current README and `agents` would match ordinary prose, so those prove
nothing:

```bash
cd arcjet-guard
for s in \
  "@arcjet/guard/agents" \
  "@arcjet/guard/vercel-ai/v7" \
  "vercel-eve/v1" \
  "peerDependenciesMeta" \
  "ERR_PACKAGE_PATH_NOT_EXPORTED" \
  "onGuardError" \
  "ArcjetGuardUnavailableError" \
  "hasFailedOpen" \
  "retryAfterSeconds" \
  "unavailable" \
  "never reaches an AI SDK" \
  "rules: ({" \
  "correlationId" \
  "or session" \
  "contextSchema" \
  "adding a new SDK namespace" \
  ; do
# NOTE: do NOT add "contextSchema" here. Item 8 requires showing both call forms
# and naming the trade-off; it does not mandate that word, so grepping for it
# fails against a README that fully satisfies item 8. The term above for item 6
# ("never reaches an AI SDK") and item 10 ("rules: ({") are wordings those items
# do require.
for _unused in \
  ; do
  grep -q -- "$s" README.md && echo "ok: $s" || echo "MISSING: $s"
done
grep -qiE "no unversioned|does not resolve|explicit version" README.md \
  && echo "ok: no-alias rule stated" || echo "MISSING: no-alias rule"
grep -qi "pnpm" README.md && echo "ok: pnpm caveat" || echo "MISSING: pnpm caveat"
```

Expected: all `ok`.

**Step 3: Commit**

```bash
git add arcjet-guard/README.md
git commit -m "docs(guard): document the SDK namespace convention"
```
<!-- END_TASK_4 -->

<!-- START_TASK_5 -->
### Task 5: Compile-check every documentation example and sweep the old identifiers

**Verifies:** `guard-sdk-namespaces.AC8.2`, `guard-sdk-namespaces.AC5.2`

**Files:**
- Modify: any README / JSDoc / SKILL.md example found not to compile
- Create: a throwaway extraction directory from `mktemp -d` (not committed; do
  not hardcode `/tmp/doc-example-check/`, which collides if phases run in
  parallel)

**Implementation:**

Two sweeps.

**A. Compile-check the examples (AC8.2).** Every code block that claims to be
usable must actually typecheck against the installed typings — not against
remembered API shapes. Extract each TypeScript block into standalone files in a
scratch directory, then run `tsc --noEmit` over them with the same compiler
settings and module resolution the package uses.

The complete list of sources — **all** of these, not a subset:

| File | Blocks |
|---|---|
| `arcjet-guard/README.md` | all TS code blocks, incl. the ported usage docs from Task 6 |
| `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md` | all TS code blocks |
| `arcjet-guard/src/agents/index.ts` | `@packageDocumentation` (no separate `@example`) |
| `arcjet-guard/src/agents/context.ts` | `@example` |
| `arcjet-guard/src/agents/vocabulary.ts` | 1 `@example` |
| `arcjet-guard/src/agents/guard-action.ts` | **3** `@example` blocks |
| `arcjet-guard/src/vercel-ai/v7/index.ts` | `@packageDocumentation` + `@example` |
| `arcjet-guard/src/vercel-ai/v7/tools-context.ts` | `@example` |
| `arcjet-guard/src/vercel-ai/v7/guard-tool.ts` | 1 `@example` |

The three files in bold-adjacent rows (`agents/vocabulary.ts`, `guard-action.ts`,
`guard-tool.ts`) are the ones most likely to be missed: their examples were
written against `@arcjet/ai` and `createAiContext`, and Phases 2 and 3 instruct
rewriting them. This sweep is the check that the rewrite actually happened.

Check specifically for the things that are easy to get wrong here:
- every imported name is a real export of the path it is imported from
- the layer is correct — e.g. `securityMetadata` from `@arcjet/guard/agents` or
  the v7 namespace, never from `@arcjet/guard`
- no `createAiContext` / `ArcjetAiContext` survivors
- no reserved words used as identifiers (the old `aiToolsContext` example used
  `const protected = ...`, which does not compile in strict mode)
- rule builder signatures match `arcjet-guard/src/rules.ts` as installed
- `launchArcjet` is imported from `@arcjet/guard`, not a subpath

Fix any block that fails. A doc example that does not compile is a defect.

**B. Repo-wide identifier sweep (AC5.2).** Phase 2 verified only
`src/agents/**`; Phases 3–5 complete the migration, so the sweep is now absolute
apart from the two planning directories Phase 6 deletes:

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
grep -rn "createAiContext\|ArcjetAiContext\|@arcjet/ai\|protectTool\|protectAction\|ProtectToolPolicy\|ProtectActionPolicy" \
  --include=*.ts --include=*.tsx --include=*.md --include=*.json . \
  | grep -v -e node_modules -e package-lock \
             -e 'docs/design-plans/' -e 'docs/implementation-plans/' \
  || echo "clean"
```

Only `docs/design-plans/` and `docs/implementation-plans/` are excluded, because
Phase 6 Task 5 deletes both.

**This run is a DRY RUN, not the gate.** At this point in the phase two known
items are still outstanding by design: Task 6 has not yet ported the README, and
Task 7 has not yet rewritten `docs/test-plans/2026-07-23-pilot-framework-helper.md`.
So the expected output here is *only* hits in that test plan — nothing else.

- hits in `docs/test-plans/` → expected, Task 7 fixes them
- hits anywhere else (`arcjet-guard/`, `examples/`, the skill) → a real miss from
  Phases 2–5; fix it now

The authoritative AC5.2 gate is **Task 7 Step 3**, run after both content changes
have landed. That is the only place `clean` is the required result.

**Step 1: Run sweep A over every source in the table above; fix every failure.**

**Step 2: Run sweep B as a dry run**; fix anything outside `docs/test-plans/`.
Do not expect `clean` here — see the note above.

**Step 3: Full re-verify**

```bash
cd arcjet-guard && npm run build && npm run typecheck && npm run lint && npm run test-unit
```
Expected: all green.

**Step 4: Commit**

```bash
git add -A
git commit -m "docs(guard): compile-check examples and finish the rename sweep"
```
<!-- END_TASK_5 -->
<!-- END_SUBCOMPONENT_B -->

<!-- START_SUBCOMPONENT_C (tasks 6-7) -->
<!-- START_TASK_6 -->
### Task 6: Port the `@arcjet/ai` usage documentation

**Verifies:** `guard-sdk-namespaces.AC8.2` (its new blocks join the sweep)

**Files:**
- Modify: `arcjet-guard/README.md`
- Input: `git show "$(cat docs/implementation-plans/2026-07-27-guard-sdk-namespaces/.pre-deletion-sha):arcjet-ai/README.md"`
  (the SHA was recorded in Phase 4 Task 1 Step 4; there is deliberately no
  temp-directory copy to depend on)

**Implementation:**

`arcjet-ai/README.md` was 225 lines of user-facing reference documentation that
Phase 4 deletes along with the directory. Task 4 only *added* a layers/convention
section to guard's README; without this task that reference material is simply
lost, and no acceptance criterion would have caught it.

Port the content across, rewritten for the new structure. It covers:
- `guardTool` usage and the shape of `ArcjetDenialResult`
- `guardAction` / `captureAction` for non-tool code paths
- `securityMetadata` and the metadata vocabulary
- threading context through agent, tool, queue, and workflow boundaries
- the `onDeny` escape hatch
- the server-side metadata caps — **port Task 3 item 3's table verbatim**, do
  **not** port the current text. davidmytton flagged the existing claim ("max 20
  pairs … the extras are dropped") as no longer accurate, and arcjet-js#6171
  settled what replaces it: 128 top-level keys, 4 KiB serialized per value,
  nesting depth 10, drops reported on `decision.warnings`. There is nothing left
  to confirm here — an earlier draft of this task said to "carry the behaviour he
  confirms, or omit the specific numbers", which would leave the README silent
  while the packaged skill carries the numbers. Two documents disagreeing about
  the same server behaviour is worse than either alone.

Rewrite every import to the correct layer, and rename **both** sets of
identifiers: `createAiContext` → `createAgentContext`, `ArcjetAiContext` →
`ArcjetAgentContext`, **`protectTool` → `guardTool`, `protectAction` →
`guardAction`**, `ProtectToolPolicy` → `GuardToolPolicy`, `ProtectActionPolicy` →
`GuardActionPolicy`. There are **11** verb occurrences in the source
`arcjet-ai/README.md` (`protectTool` ×6, `protectAction` ×5). Drop anything describing `@arcjet/ai` as a separately
installable package.

This file is **published**, so a missed verb rename ships a README documenting an
export that does not exist — the single highest-visibility failure mode in this
phase.

Integrate with Task 4's convention section rather than appending a disconnected
block: the convention explains *where* things live, this explains *how* to use
them, so the convention section comes first.

**Step 1: Port and rewrite the content.**

**Step 2: Confirm nothing was silently dropped**

```bash
cd arcjet-guard
for s in guardTool guardAction captureAction securityMetadata onDeny; do
  grep -q "$s" README.md && echo "ok: $s" || echo "MISSING: $s"
done
```

Expected: all `ok`.

**Step 3: Re-run Task 5 sweep A** over the README — it now contains new code
blocks that must compile against installed typings.

**Commit:** `docs(guard): port the @arcjet/ai usage documentation into the guard README`
<!-- END_TASK_6 -->

<!-- START_TASK_7 -->
### Task 7: Rewrite the pilot test plan, then run the final sweep

**Verifies:** `guard-sdk-namespaces.AC5.2` and `guard-sdk-namespaces.AC5.4`
(the final sweep completes both)

**Files:**
- Modify: `docs/test-plans/2026-07-23-pilot-framework-helper.md`

**Implementation:**

This document is tracked, was added by this branch, and describes the superseded
separate-package structure. AC5.2 covers docs, so leaving it untouched makes AC5.2
unsatisfiable.

**Decision: rewrite it, do not delete it.** It is a deliberate deliverable of this
branch and the test-plan record stays useful.

Exact edits required — verified counts, so there is nothing to go hunting for:

| What | Occurrences | Change to |
|---|---|---|
| `@arcjet/ai` | 2 — the title on line 1, and line 22's "Installs cleanly against built `@arcjet/ai`" | `@arcjet/guard` |
| `arcjet-ai/` paths | 10 — line 5 (`arcjet-ai/test/*.test.ts`), line 12 (the `cd arcjet-ai && npm run test` command), line 15 (the SKILL.md path), and the AC-to-test coverage table around lines 84–90 | the new homes: `arcjet-guard/src/agents/*.test.ts`, `arcjet-guard/src/vercel-ai/v7/*.test.ts`, and `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md` |
| `createAiContext` / `ArcjetAiContext` | **0** — neither appears | nothing to do |
| `protectTool` / `protectAction` | **2** — line 43 | `guardTool` / `guardAction` |

Also update line 5's test count (says 47 tests in `arcjet-ai/test/*.test.ts`) and
line 12's stale command and count (says `cd arcjet-ai && npm run test` with 47 pass):
the migrated suites total 51 across the two new directories (see the Phase 6
reconciliation table).

Map the coverage table's paths using the phase_02 and phase_03 source-mapping
tables — e.g. `arcjet-ai/test/context.test.ts` splits into
`arcjet-guard/src/agents/context.test.ts` and
`arcjet-guard/src/vercel-ai/v7/tools-context.test.ts`, so the row for AC1.1–AC1.4
points at the former.

**Preserve the document's own bare `AC1.1`-style identifiers exactly as they are.**
It does not use the scoped `pilot-framework-helper.AC*` form internally (verified:
zero scoped occurrences), and arcjet/review#28's PR body cites
`pilot-framework-helper.AC7.1` externally — so renumbering or re-scoping anything
here would orphan that citation.

**Step 1: Rewrite the document.**

**Step 2: Verify this document is clean**

```bash
cd /mnt/mac/Users/rei/Documents/arcjet-dev/framework-helper/arcjet-js
if grep -nE "@arcjet/ai|arcjet-ai/|protectTool|protectAction|\b47\b" \
     docs/test-plans/2026-07-23-pilot-framework-helper.md; then
  echo "FAIL: stale references remain (see above)"; return 1
fi
echo "clean"
```

The pattern must include `arcjet-ai/` and `47`, not just `@arcjet/ai` and the
verbs: `@arcjet/ai` does not match `arcjet-ai/test/context.test.ts`, so the 10
directory paths and both stale `47`s would survive a partial rewrite and the gate
would still report clean. It must also **assert** — `grep -c … || echo` prints a
count and exits 0 when matches remain.

Expected: `clean`.

**Step 3: Run the FINAL authoritative sweep (AC5.2)**

This is the last content change in the phase, so re-run Task 5 sweep B now. It
must report `clean` across the whole repo, with only `docs/design-plans/` and
`docs/implementation-plans/` excluded.

**Commit:** `docs: update the pilot test plan for the guard subpath structure`
<!-- END_TASK_7 -->
<!-- END_SUBCOMPONENT_C -->

---

## Phase 5 exit checklist

- [ ] Example imports only `@arcjet/guard`, `@arcjet/guard/agents`,
      `@arcjet/guard/vercel-ai/v7`
- [ ] Example `package.json` has no `@arcjet/ai` dependency
- [ ] Example builds (guard built first)
- [ ] Skill lives at `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md`
      and appears in `npm pack --dry-run`
- [ ] README documents the three layers, the `<vendor-sdk>/v<major>` convention,
      `vercel-eve/v1` as next, no-alias rule, optional peers + pnpm caveat
- [ ] Every doc/JSDoc/skill example compiles against installed typings, including
      the 5 previously-missed `@example` blocks in `agents/vocabulary.ts`,
      `guard-action.ts` (3), and `guard-tool.ts`
- [ ] `arcjet-ai/README.md`'s usage documentation is ported into
      `arcjet-guard/README.md` (Task 6)
- [ ] `docs/test-plans/2026-07-23-pilot-framework-helper.md` rewritten for the
      subpath structure, with its bare `AC1.1`-style identifiers unchanged (the
      scoped `pilot-framework-helper.AC*` form does not appear in that file)
- [ ] Example does **not** set `onGuardError: "deny"` (it is the default) but
      comments that an unevaluable policy blocks the call, and names `"allow"` as
      the opt-out
- [ ] Example shows rules derived from tool input, and points out that an explicit
      `guardAction` inside `execute` is the alternative to wrapping (both qw-in)
- [ ] README carries the **same** `correlationId` paragraph as the skill —
      "one logical run **or session**" — ported from Task 3 item 1, not rewritten
- [ ] README and skill both state `retryAfterSeconds: 5` and
      `outcome: "unavailable"` for the guard-unavailable path
- [ ] Skill explains what `correlationId` is for using "one logical run **or
      session**" (davidmytton's wording), fixes the bare `octokit` reference,
      documents the `"deny"` default and the `"allow"` opt-out, and carries
      arcjet-js#6171's metadata-cap table (128 keys / 4 KiB / depth 10) rather
      than the stale "max 20 pairs" claim
- [ ] README and skill state the **same** metadata-cap numbers — they are ported
      from one table (Task 3 item 3), not written twice
- [ ] Skill no longer claims guard API failures fail open — that is now the
      opt-out, not the default
- [ ] README documents `onGuardError`'s `"deny"` default, both guard-unavailable
      signals (`hasFailedOpen()` as well as a throw), `ArcjetGuardUnavailableError`
      and its `cause` / `decision` split, and the client-reports/helper-decides
      layering
- [ ] Final repo-wide sweep finds no `createAiContext`, `ArcjetAiContext`, or
      `@arcjet/ai` anywhere except `docs/design-plans/` and
      `docs/implementation-plans/` (both deleted in Phase 6)
