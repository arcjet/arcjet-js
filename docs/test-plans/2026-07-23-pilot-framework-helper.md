# Human Test Plan — Pilot Framework Helper (`@arcjet/guard`)

**Acceptance-criterion namespaces used in this document.** Two separate criterion
sets apply to this code, and their numbers collide — `AC1.1` means different things
in each. Every reference below is therefore scoped:

- **`pilot-framework-helper.AC*`** — the 2026-07-23 pilot criteria. These cover
  correlation context, tool protection, and the agent skill. Sections "Phase 5",
  "Phase 6", and both end-to-end scenarios use this set.
- **`guard-sdk-namespaces.AC*`** — the 2026-07-27 subpath-migration criteria. These
  cover the export map, optional peers, and documentation. Sections "Doc-example
  compile sweep" and "Runtime suite coverage" use this set.

Numbers are unchanged from their source documents so external citations
(e.g. arcjet/review#28, which cites `pilot-framework-helper.AC7.1`) stay valid.

Automated coverage: `arcjet-guard/src/agents/*.test.ts` and
`arcjet-guard/src/vercel-ai/v7/*.test.ts` (76 tests: 51 migrated + 25 net-new,
inside a 426-test suite) plus the `nextjs-ai-agent` CI build. This plan covers the
criteria that no automated gate can decide.

## Prerequisites

- Node 22, repo installed and built: from repo root `npm ci && npm run build`.
- `arcjet-guard` automated gate green: `cd arcjet-guard && npm run test-unit` → 426 pass, 0 fail.
- For `pilot-framework-helper.AC5.2`: a **dev Arcjet site** (`ARCJET_KEY` from
  app.arcjet.com) and an `AI_GATEWAY_API_KEY` (Vercel AI Gateway).
- For `pilot-framework-helper.AC6.1`: a copy of
  `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md` and a
  sample AI SDK v7 app prepared **outside** this repo.

## Phase 5: Example App — Live Run (`pilot-framework-helper.AC5.2`)

| Step | Action | Expected |
|------|--------|----------|
| 1 | `cd examples/nextjs-ai-agent && npm ci` | Installs cleanly against built `@arcjet/guard` |
| 2 | `cp .env.local.example .env.local`; set real `ARCJET_KEY` (dev site) + `AI_GATEWAY_API_KEY` | File present with live values |
| 3 | `ARCJET_LOG_LEVEL=warn npm run dev` | Dev server on `http://localhost:3000`, no startup errors |
| 4 | Open `http://localhost:3000`, ask "What's the status of order 42?" | Agent responds with an order status; API response includes `runId` and `correlationId` — record both |
| 5 | `npx workflow inspect runs` | The run for `runId` shows as completing (route → workflow → tool → action steps) |
| 6 | Open the Arcjet dashboard (or MCP `list-guards`), filter by the recorded `correlationId` | Two guard decisions visible — `order.looked-up` and `ticket.updated` — both carrying that same `correlationId` |
| 7 | Confirm capture-events behavior | With current `@arcjet/guard` (no `experimental_capture()`), a `warn`-level log appears and capture events are absent — documented deferral, not a failure |
| 8 | Ask ~11 order questions within 60s | After the token-bucket limit, `lookupOrder` is denied; the model receives a structured denial and apologizes instead of retrying |
| 9 | Record the observed `correlationId` in the PR description as evidence | Evidence captured |

**Deferral note:** the capture-**events** portion of
`pilot-framework-helper.AC5.2` is deferred until
`@arcjet/guard` ships `experimental_capture()` (unmerged,
`origin/quinn/experimental-capture`). Guard-**decision** correlation
(steps 5–6) is verifiable now and is the pass condition for this cycle.

## Phase 6: Agent Skill File (`pilot-framework-helper.AC6.1`)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Prepare a sample AI SDK v7 app outside this repo: a `generateText` call with one or two real-`execute` tools plus one app-invoked side-effect function, no Arcjet | Baseline app runs |
| 2 | Start a fresh coding-agent session with exactly two inputs: `SKILL.md` and the prompt "Using this skill, integrate Arcjet security into this app" | Session starts with no other context |
| 3 | Observe the agent integrate: launch client, context at entry point, `guardTool` + `toolsContext`, `guardAction`/`captureAction`, denial line in the system prompt | Completes asking only clarifying questions; any correction of wrong API usage is a failure requiring a skill fix + re-run |
| 4 | Export the transcript, reference it in the PR with a one-line verdict | Clean recorded transcript exists before merge |

**Status:** the `pilot-framework-helper.AC6.1` fresh-agent run passed on
2026-07-23 — verdict "completed with 4 clarifying questions, zero corrections".
`SKILL.md` has since been rewritten for the subpath structure, so this run is
**stale and must be repeated** before the criterion can be called green again.

## End-to-End: Single-run correlation across decision types

Purpose: validates the headline `pilot-framework-helper.AC1` promise — one `correlationId` joins a
guarded tool decision and a guarded external-action decision from one
workflow run (the seam automated integration tests stub, exercised here
against the real backend).

Steps: Perform Phase 5 steps 3–6, then in the dashboard confirm that the
tool decision (`order.looked-up`) and the external-action decision
(`ticket.updated`) share the exact `correlationId` returned in the API
response. Once `experimental_capture()` ships, re-run and confirm
`notification.sent` capture events carry the same ID.

## End-to-End: Rate-limit denial visible to the model

Purpose: confirms the deny path is user-observable end to end
(`pilot-framework-helper.AC2.2` / `pilot-framework-helper.AC2.9` in a live loop,
not a mock).

Steps: Phase 5 step 8 — drive `lookupOrder` past its token-bucket limit;
verify the agent surfaces an apology/denial rather than the order data, and
the dashboard shows a DENY `RATE_LIMIT` decision under the run's
`correlationId`.

## Human Verification Required

| Criterion | Why Manual | Steps |
|-----------|------------|-------|
| `pilot-framework-helper.AC5.2` | Needs a live dev Arcjet site + dashboard/MCP inspection no CI job or unit test can perform | Phase 5, steps 1–9 |
| `pilot-framework-helper.AC6.1` | Success is skill-file quality judged from an observed fresh-agent transcript — not an automatable assertion | Phase 6, steps 1–4 — **re-run required**, the recorded pass predates the SKILL.md rewrite |
| `guard-sdk-namespaces.AC8.2` | Whether a documentation example is *correct and useful* is a judgement call; the compile sweep proves only that it typechecks | Doc-example compile sweep, steps 1–4 |

## Traceability

All criteria in this table are in the **`pilot-framework-helper`** namespace.

| Acceptance Criterion | Automated Test | Manual Step |
|----------------------|----------------|-------------|
| `pilot-framework-helper.AC1.1`–`AC1.4` | `arcjet-guard/src/agents/context.test.ts` | — |
| `pilot-framework-helper.AC1.5`, `AC1.6` | `arcjet-guard/src/vercel-ai/v7/generate-text.test.ts` | E2E "single-run correlation" (live confirmation) |
| `pilot-framework-helper.AC1.7` | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` | — |
| `pilot-framework-helper.AC2.1`–`AC2.8` | `arcjet-guard/src/vercel-ai/v7/guard-tool.test.ts` | — |
| `pilot-framework-helper.AC2.9` | `arcjet-guard/src/vercel-ai/v7/generate-text.test.ts` | E2E "rate-limit denial" (live confirmation) |
| `pilot-framework-helper.AC3.1`–`AC3.5` | `arcjet-guard/src/agents/guard-action.test.ts` | — |
| `pilot-framework-helper.AC4.1`–`AC4.3` | `arcjet-guard/src/agents/vocabulary.test.ts` | — |
| `pilot-framework-helper.AC5.1` | `reusable-examples.yml` CI matrix (`nextjs-ai-agent`) | — |
| `pilot-framework-helper.AC5.2` | — | Phase 5, steps 1–9 |
| `pilot-framework-helper.AC6.1` | — | Phase 6, steps 1–4 |

**Known gap (documented, not a coverage failure):** capture-event delivery is
unavailable until `@arcjet/guard` ships `experimental_capture()`. The library
warns and skips capture; tests assert the warning path, and the example
README documents the deferral.

---

# Subpath migration (`guard-sdk-namespaces`)

These helpers ship as `@arcjet/guard` subpaths: `@arcjet/guard/agents` for the
framework-agnostic layer and `@arcjet/guard/vercel-ai/v7` for the Vercel AI SDK
layer. Nearly all of the migration's criteria are machine-checkable and run as
automated gates. Two need a record here.

## Doc-example compile sweep (`guard-sdk-namespaces.AC8.2`)

Every documentation example must compile against the **installed** typings — not
against a remembered API shape. This is the migration's one genuinely human
criterion: the sweep proves a block typechecks, but only a reader can judge whether
it teaches the right thing.

**Sources — all nine, not a subset:**

| File | Blocks |
|---|---|
| `arcjet-guard/README.md` | all TS code blocks |
| `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md` | all TS code blocks |
| `arcjet-guard/src/agents/index.ts` | `@packageDocumentation` |
| `arcjet-guard/src/agents/context.ts` | 1 `@example` |
| `arcjet-guard/src/agents/vocabulary.ts` | 1 `@example` |
| `arcjet-guard/src/agents/guard-action.ts` | **3** `@example` |
| `arcjet-guard/src/vercel-ai/v7/index.ts` | `@packageDocumentation` |
| `arcjet-guard/src/vercel-ai/v7/tools-context.ts` | 1 `@example` |
| `arcjet-guard/src/vercel-ai/v7/guard-tool.ts` | 1 `@example` |

The five easiest to miss are the `@example` blocks in `agents/vocabulary.ts`,
`agents/guard-action.ts` (3), and `v7/guard-tool.ts` — JSDoc examples attract less
scrutiny than README prose, and a sweep that only covers the two Markdown files
will report clean while leaving them unchecked.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Extract every TS block from the nine sources into standalone files in a `mktemp -d` scratch directory | 39 blocks (25 README + 5 SKILL + 9 JSDoc) |
| 2 | Run `tsc --noEmit` over them with `arcjet-guard`'s own settings — strict, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `moduleResolution: bundler`, es2023 — resolving against the built `dist/` | Zero structural failures. Undeclared narrative placeholders (`userId`, `ctx`, `languageModel`) and `TS4111` on `process.env` are expected snippet artifacts, not defects |
| 3 | Check import layering by eye: `securityMetadata` never imported from the `@arcjet/guard` root, `launchArcjet` never from a subpath, every imported name a real export of the path named | No layer violations |
| 4 | Read each block as a user would: is it the shortest correct way to do the thing it claims? | Judgement call — this is the part no gate can make |

A doc example that does not compile is a defect, not a nit: these ship to npm, and
the packaged `SKILL.md` is read by coding agents with no other context.

## Runtime suite coverage (`guard-sdk-namespaces.AC9.2`)

`guard-sdk-namespaces.AC9.2` requires the node, fetch, bun, deno, and cloudflare suites to pass. Record
which leg ran where — a blanket "all green" hides an unrun leg.

| Leg | Where it runs | Notes |
|---|---|---|
| node | local, `npm run test-runtime-node` | |
| fetch | local, `npm run test-runtime-fetch` | |
| bun | local, `npm run test-runtime-bun` | needs `bun` on PATH |
| cloudflare | local, `npm run test-runtime-cloudflare` | via the `miniflare` devDependency, under `node --test` |
| **deno** | **CI only** | `deno` is not installed on the current dev machine. `.github/workflows/guard.yml`'s `runtime:` job runs `test-runtime-deno` on both `lts` and `latest` |

When deno cannot run locally, cite the specific CI run and its two job
conclusions — `Runtime (deno lts)` and `Runtime (deno latest)` — and confirm the
run's `headSha` matches the commit being reported. Claiming `guard-sdk-namespaces.AC9.2` green without
either a local deno run or that citation is a false completion claim.
