# Pilot Framework Helper (`@arcjet/ai`) Implementation Plan — Phase 6: Agent skill file and docs

**Goal:** A coding agent given only the skill file (or a developer reading the README) can perform the `@arcjet/ai` integration unaided, asking only clarifying questions.

**Architecture:** A portable SKILL.md at `arcjet-ai/skills/integrate-arcjet-ai/SKILL.md` following the Agent Skills open standard (agentskills.io — the format Claude Code, Cursor, Copilot et al. consume) using ONLY portable frontmatter fields so it can graduate to Arcjet's public skills repository unchanged. The `skills/` directory ships in the npm package (added to `files`), and the README documents how to install it (Claude Code does NOT auto-discover skills inside `node_modules` — users copy or symlink into `.claude/skills/`). The package README gains the full human-facing recipe.

**Tech Stack:** Markdown + YAML frontmatter; no code beyond doc snippets.

**Scope:** Phase 6 of 6 from `docs/design-plans/2026-07-23-pilot-framework-helper.md` (design Phases 7–8 belong to the `review` repo).

**Codebase verified:** 2026-07-23. Facts: no SKILL.md or `skills/` directory exists anywhere in the repo (this is the first); README conventions per `sensitive-info-rampart/README.md` (logo header, npm badge, Installation/Usage/License) and `arcjet-guard/README.md` (rich section structure, "Quick setup with an AI agent" section already exists there as prior art for agent-oriented docs); JSDoc conventions: `@example` with fenced code, `@param`/`@returns`, `{@link}`, `@packageDocumentation` module docs. SKILL.md spec facts (agentskills.io, verified 2026-07-23): required frontmatter `name` (lowercase alnum + hyphens, ≤64 chars, MUST equal parent directory name) and `description` (≤1024 chars, states what it does AND when to use it); optional portable fields `license`, `compatibility`, `metadata` (string map); body guidance: keep under ~500 lines, push detail to `references/` files; avoid Claude-Code-only fields (`disable-model-invocation`, `context`, hooks) for portability.

---

## Acceptance Criteria Coverage

This phase implements and verifies:

### pilot-framework-helper.AC6: Agent skill file
- **pilot-framework-helper.AC6.1 Success:** a fresh coding-agent session given
  only the skill file and a sample AI SDK v7 app completes the integration
  with only clarifying questions (manual verification, one recorded
  transcript).

**Verification split:** AC6.1 is **human verification** by design (the AC
says so). Task 3 defines the exact procedure and evidence to record. There
are no automated tests in this phase; `npm test --workspace @arcjet/ai` must
still pass (docs must not break the build — README/JSDoc edits touch
published files).

---

<!-- START_TASK_1 -->
### Task 1: Write the skill file

**Files:**
- Create: `arcjet-ai/skills/integrate-arcjet-ai/SKILL.md`
- Modify: `arcjet-ai/package.json` (`files`: add `"skills/"`)

**Step 1: Create `arcjet-ai/skills/integrate-arcjet-ai/SKILL.md`**

Complete content (adjust only if the Phase 2–4 APIs drifted during
implementation — the skill must match the shipped API exactly):

````markdown
---
name: integrate-arcjet-ai
description: Integrate Arcjet security into a Vercel AI SDK (v7) application using @arcjet/ai — wrap agent tools with guard checks, enforce rules on risky app actions, and emit audit events joined by one correlation ID. Use when asked to add Arcjet to an AI SDK app, protect or rate limit agent tool calls, guard AI agent actions, or audit what an agent did.
license: Apache-2.0
compatibility: Requires the target app to use the Vercel AI SDK (`ai` >= 7) on Node.js >= 22.
metadata:
  author: arcjet
---

# Integrate `@arcjet/ai` into a Vercel AI SDK app

`@arcjet/ai` wraps the app's existing `@arcjet/guard` client. It never talks
to the Arcjet API itself. Three surfaces, one decision rule:

- **Model-invoked** (the LLM decides to call a tool) → `protectTool()`
- **App-invoked** (your code performs a risky action) → `protectAction()`
- **Observe-only** (record that something happened) → `captureAction()`

All three attach the same correlation ID so the Arcjet Console reconstructs
the whole run as one Sequence.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tool calls / actions are **risky** (external side effects,
   irreversible, spends money, sends messages)? Those get rules. Purely
   informational ones get capture-only wrapping (no `rules`).
2. What **limits**? (e.g. "10 lookups/min per user" → `tokenBucket`;
   "5 posts/min" → `slidingWindow`.)
3. Who is the **user** for metadata — an opaque user/tenant/installation ID
   (never PII)?
4. Is there an existing **run identifier** (request ID, job ID, review ID)
   to use as the correlation ID? Default: auto-generated ULID.

## Step 1: Install and find the guard client

```sh
npm install @arcjet/ai
```

`@arcjet/ai` peer-depends on `@arcjet/guard` and `ai` (>= 7). If the app has
no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";
export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Create the context at the run's entry point

In the HTTP route / job handler / webhook that starts the run:

```ts
import { createAiContext, securityMetadata } from "@arcjet/ai";

const ctx = createAiContext({
  correlationId: existingRunId, // omit to auto-generate a ULID
  metadata: securityMetadata({ agent: "support-agent", workflow: "support-request", user: userId }),
});
```

Constraints: correlation IDs are 1–256 characters of printable ASCII;
invalid values throw at creation.

## Step 3: Thread the context explicitly

The context is a plain JSON-serializable object. Pass it hand to hand — as a
field on queue payloads and workflow inputs (it survives serialization).
Never stash it in module state or AsyncLocalStorage.

## Step 4: Wrap model-invoked tools

```ts
import { protectTool } from "@arcjet/ai";
import { tokenBucket } from "@arcjet/guard";

const lookupLimit = tokenBucket({ bucket: "lookups", refillRate: 5, intervalSeconds: 60, maxTokens: 10 });

const tools = {
  lookupOrder: protectTool(arcjet, lookupOrderTool, {
    action: "order.looked-up", // "resource.verb", past tense
    rules: () => [lookupLimit({ key: userId, requested: 1 })],
    metadata: (input) => securityMetadata({ resource: `order:${input.orderNumber}` }),
  }),
};
```

- Omit `rules` for capture-only wrapping (audit without enforcement).
- On DENY the tool's `execute` never runs; the model receives a structured
  denial result (`arcjetDenied`, `reason`, `message`, `retryable`,
  `retryAfterSeconds`) it can read and adapt to. Reshape it with `onDeny`.
- Guard API failures fail open: the tool still runs, a warning is logged
  when `ARCJET_LOG_LEVEL=warn`.
- Pilot limitation: `protectTool` throws if the tool already declares its
  own `contextSchema`.

## Step 5: Deliver the context to the tools

```ts
import { aiToolsContext } from "@arcjet/ai";

const result = await generateText({
  model,
  instructions:
    systemPrompt +
    " If a tool call is denied by security policy, do not retry it; explain the denial to the user or try a different approach.",
  prompt,
  tools,
  toolsContext: aiToolsContext(ctx, tools),
  stopWhen: stepCountIs(5),
});
```

Works identically with `streamText`, `ToolLoopAgent`, and `WorkflowAgent` —
the wrapper only changes the tool's own behavior. Always add the denial
line to the system prompt (shown above).

## Step 6: Wrap app-invoked actions; capture side effects

```ts
import { ArcjetDeniedError, captureAction, protectAction } from "@arcjet/ai";

await protectAction(
  arcjet,
  ctx,
  {
    action: "review.submitted",
    rules: [submitLimit({ key: repoId })],
    metadata: securityMetadata({ destination: "github", reversibility: "compensable" }),
  },
  () => octokit.pulls.createReview(...),
);

captureAction(arcjet, ctx, {
  action: "notification.sent",
  metadata: securityMetadata({ destination: "slack" }),
});
```

`protectAction` throws `ArcjetDeniedError` (carrying the decision) on DENY —
decide with the human whether to catch-and-skip or let it abort.

## Metadata vocabulary

Use `securityMetadata()` keys consistently: `user` (whose authority — opaque
ID), `agent` (which automated actor), `workflow` (logical workflow name),
`dataClass` (`public`/`internal`/`confidential`/`regulated`), `destination`
(where effects go: `github`, `slack`, `internal`), `reversibility`
(`reversible`/`compensable`/`irreversible`), `resource` (what's acted on,
e.g. `repo:owner/name#123`). The `action` is not metadata — it is the guard
label / capture action.

## Verify the integration

1. `tsc --noEmit` (or the app's typecheck) passes.
2. Run the app with `ARCJET_LOG_LEVEL=warn`; exercise the agent.
3. Confirm in the Arcjet dashboard (or MCP `list-guards`) that the run's
   decisions share the expected correlation ID.
4. Trip a rate limit deliberately; confirm the model receives the denial
   and does not loop on retries.

Note: capture events require a `@arcjet/guard` version that ships
`experimental_capture()`; on older versions `@arcjet/ai` skips them with a
warning — guard decisions still correlate.
````

**Step 2: Ship the skill in the npm package**

In `arcjet-ai/package.json`, change `"files": ["dist"]` to
`"files": ["dist", "skills/"]`.

**Step 3: Verify**

```bash
npm run build --workspace @arcjet/ai
npm pack --workspace @arcjet/ai --dry-run 2>&1 | grep -c skills/
```

Expected: pack listing includes `skills/integrate-arcjet-ai/SKILL.md`.
Frontmatter sanity: `name` equals the directory name
(`integrate-arcjet-ai`), description ≤1024 chars, only portable fields used.

**Commit:** `docs(ai): add integrate-arcjet-ai agent skill`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Expand the package README and audit JSDoc

**Files:**
- Modify: `arcjet-ai/README.md` (replace the stub "Use" section)
- Modify: JSDoc in `arcjet-ai/src/*.ts` only where the audit below finds gaps

**Step 1: README expansion**

Keep the Phase 1 header (logo, badge, intro, Experimental note, Install).
Replace the "Use" placeholder with the human-facing recipe — same substance
as the skill file, README register (model the section flow on
`arcjet-guard/README.md`):

- **Use** — the 20-line end-to-end snippet: launch client → `createAiContext`
  → `protectTool` a rate-limited tool → `generateText` with
  `toolsContext: aiToolsContext(ctx, tools)` → `protectAction` around an
  external call → `captureAction`. One snippet, runnable shape.
- **Which helper?** — the three-way decision rule (model-invoked /
  app-invoked / observe-only) as a short table.
- **Correlation** — context is plain JSON; thread it through workflow/queue
  inputs; explicit `correlationId` overrides; 1–256 printable-ASCII rule.
- **Denials** — the `ArcjetDenialResult` shape the model sees, the
  recommended system-prompt line, `ArcjetDeniedError` for actions.
- **Metadata vocabulary** — the seven keys with one-line meanings.
- **Failure posture** — fail-open on guard errors; capture is
  fire-and-forget; note the `experimental_capture()` availability caveat.
- **Agent skill** — point at `skills/integrate-arcjet-ai/SKILL.md`; document
  installing it: copy or symlink
  `node_modules/@arcjet/ai/skills/integrate-arcjet-ai` into the project's
  `.claude/skills/` (agents do not auto-discover skills inside
  `node_modules`).
- **Example** — link to `examples/nextjs-ai-agent`.
- Keep **License** section as-is.

**Step 2: JSDoc audit**

Every export from `src/index.ts` must have JSDoc (Phases 2–4 required it;
verify none slipped): `createAiContext`, `aiToolsContext`, `ArcjetAiContext`,
`securityMetadata`, `SecurityMetadataFields`, `protectTool`,
`ProtectToolPolicy`, `ArcjetDenialResult`, `ArcjetAiClient`, `CaptureOptions`,
`protectAction`, `captureAction`, `ArcjetDeniedError`, `ProtectActionPolicy`,
`CaptureActionOptions`. At minimum: one-sentence summary; `@example` on the
four entry-point functions (`createAiContext`, `protectTool`, `protectAction`,
`captureAction`); constraints documented where they bite (correlation-ID
rule, contextSchema limitation, fail-open, capture availability). Follow
`arcjet-guard/src/index.ts` register, including a `@packageDocumentation`
block in `src/index.ts`.

**Step 3: Verify**

```bash
npm test --workspace @arcjet/ai
npm run typecheck --workspace @arcjet/ai
npm run lint && npm run format:check
```

Expected: all pass (README is markdown — oxfmt ignores `.md`, but the JSDoc
edits touch `.ts` files).

**Commit:** `docs(ai): write README integration guide and complete JSDoc`
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: AC6.1 manual verification — fresh-agent integration run

**Verifies:** pilot-framework-helper.AC6.1 (human verification — no automated test)

This task is a documented procedure the human (or the executing agent under
human observation) performs once the previous tasks are committed:

1. **Prepare a sample app** OUTSIDE this repo (e.g. in a temp directory):
   a minimal AI SDK v7 Node/Next.js app with (a) a `generateText` call using
   one or two `tool()` tools with real `execute` functions and (b) one
   app-invoked side-effect function (e.g. "send email" that console.logs) —
   and NO Arcjet anywhere. `npm install ai zod` plus a stub `ARCJET_KEY`
   available. (Writing this sample is part of the procedure, not a repo
   deliverable.)
2. **Start a fresh coding-agent session** (new Claude Code session, empty
   context) in that sample app directory. Provide exactly two inputs: the
   path to a copy of `skills/integrate-arcjet-ai/SKILL.md`, and the prompt:
   "Using this skill, integrate Arcjet security into this app."
3. **Observe:** the agent should complete the integration (launch client,
   context at entry point, `protectTool` + `toolsContext`, `protectAction`/
   `captureAction` where fitting, denial line in the system prompt) asking
   ONLY clarifying questions of the kind the skill tells it to ask (risky
   actions, limits, user identity, existing run ID). Interventions that
   correct wrong API usage = failure; refine the skill and re-run.
4. **Record:** export/save the session transcript; link or attach it in the
   PR description as the AC6.1 evidence, with a one-line verdict
   ("completed with N clarifying questions, zero corrections").
5. **Gate:** if the run failed, fix SKILL.md (that is the deliverable under
   test), commit `docs(ai): refine integration skill after agent dry-run`,
   and repeat until a clean transcript exists.

**Done when:** one clean recorded transcript exists and is referenced from
the PR.
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Remove the design and implementation plan documents from the tree (branch finalization)

**Verifies:** None — branch-hygiene task requested by the project owner: the
planning documents must not ship in the merged branch (git history retains
them).

**SEQUENCING — run this task LAST.** Only perform it after every other task
in Phases 1–6 is complete AND all plan-driven review steps have finished
(the final code review and any test-requirements-based analysis read these
files from disk). This is the last commit on the branch before the PR is
finalized. If a review pass after this task needs the plan documents, they
remain available in git history (`git show HEAD~1:<path>`).

**Files:**
- Delete: `docs/design-plans/2026-07-23-pilot-framework-helper.md` (tracked —
  committed in `4eea6ab1`)
- Delete: `docs/implementation-plans/2026-07-23-pilot-framework-helper/`
  (entire directory: `phase_01.md`–`phase_06.md`, `test-requirements.md` —
  these may be tracked or untracked depending on whether earlier commits
  included them; handle both)

**Step 1: Remove tracked and untracked copies**

```bash
git rm -r --ignore-unmatch \
  docs/design-plans/2026-07-23-pilot-framework-helper.md \
  docs/implementation-plans/2026-07-23-pilot-framework-helper
rm -rf docs/implementation-plans/2026-07-23-pilot-framework-helper
rm -f docs/design-plans/2026-07-23-pilot-framework-helper.md
```

Then remove the parent directories if now empty and untracked:

```bash
rmdir docs/design-plans docs/implementation-plans docs 2>/dev/null || true
```

**Step 2: Verify**

```bash
git status --short
ls docs 2>/dev/null || echo "docs/ gone"
git log --oneline -1
```

Expected: no `docs/design-plans/2026-07-23-*` or
`docs/implementation-plans/2026-07-23-*` paths remain in the working tree;
`git status` shows only the staged deletions (plus nothing else unexpected).

**Step 3: Commit**

```bash
git commit -m "chore: remove pilot framework helper planning documents"
```

(If `git rm` staged nothing because the files were never committed, and the
working-tree copies are already gone, there is nothing to commit — verify
`git status` is clean and move on.)
<!-- END_TASK_4 -->

---

## Phase completion checklist

- [ ] `skills/integrate-arcjet-ai/SKILL.md` exists, portable-spec-valid, ships in `npm pack`
- [ ] README "Use" section is the full recipe; JSDoc complete on all exports
- [ ] Full workspace test/typecheck/lint/format pass
- [ ] AC6.1 transcript recorded and referenced in the PR
- [ ] Planning documents removed from the tree as the final commit (Task 4 — after all reviews)
- [ ] Commits as specified
