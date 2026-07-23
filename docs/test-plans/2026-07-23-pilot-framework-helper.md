# Human Test Plan — Pilot Framework Helper (`@arcjet/ai`)

Generated from the 2026-07-23 pilot-framework-helper implementation.
Automated coverage: 25/25 acceptance criteria covered by
`arcjet-ai/test/*.test.ts` (47 tests) and the `nextjs-ai-agent` CI build.
This plan covers the two human-verification criteria and live E2E
confirmations of behavior the automated tests exercise against stubs.

## Prerequisites

- Node 22, repo installed and built: from repo root `npm ci && npm run build`.
- `arcjet-ai` automated gate green: `cd arcjet-ai && npm run test` → 47 pass, 0 fail.
- For AC5.2: a **dev Arcjet site** (`ARCJET_KEY` from app.arcjet.com) and an
  `AI_GATEWAY_API_KEY` (Vercel AI Gateway).
- For AC6.1: a copy of `arcjet-ai/skills/integrate-arcjet-ai/SKILL.md` and a
  sample AI SDK v7 app prepared **outside** this repo.

## Phase 5: Example App — Live Run (AC5.2)

| Step | Action | Expected |
|------|--------|----------|
| 1 | `cd examples/nextjs-ai-agent && npm ci` | Installs cleanly against built `@arcjet/ai` |
| 2 | `cp .env.local.example .env.local`; set real `ARCJET_KEY` (dev site) + `AI_GATEWAY_API_KEY` | File present with live values |
| 3 | `ARCJET_LOG_LEVEL=warn npm run dev` | Dev server on `http://localhost:3000`, no startup errors |
| 4 | Open `http://localhost:3000`, ask "What's the status of order 42?" | Agent responds with an order status; API response includes `runId` and `correlationId` — record both |
| 5 | `npx workflow inspect runs` | The run for `runId` shows as completing (route → workflow → tool → action steps) |
| 6 | Open the Arcjet dashboard (or MCP `list-guards`), filter by the recorded `correlationId` | Two guard decisions visible — `order.looked-up` and `ticket.updated` — both carrying that same `correlationId` |
| 7 | Confirm capture-events behavior | With current `@arcjet/guard` (no `experimental_capture()`), a `warn`-level log appears and capture events are absent — documented deferral, not a failure |
| 8 | Ask ~11 order questions within 60s | After the token-bucket limit, `lookupOrder` is denied; the model receives a structured denial and apologizes instead of retrying |
| 9 | Record the observed `correlationId` in the PR description as evidence | Evidence captured |

**Deferral note:** the capture-**events** portion of AC5.2 is deferred until
`@arcjet/guard` ships `experimental_capture()` (unmerged,
`origin/quinn/experimental-capture`). Guard-**decision** correlation
(steps 5–6) is verifiable now and is the pass condition for this cycle.

## Phase 6: Agent Skill File (AC6.1)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Prepare a sample AI SDK v7 app outside this repo: a `generateText` call with one or two real-`execute` tools plus one app-invoked side-effect function, no Arcjet | Baseline app runs |
| 2 | Start a fresh coding-agent session with exactly two inputs: `SKILL.md` and the prompt "Using this skill, integrate Arcjet security into this app" | Session starts with no other context |
| 3 | Observe the agent integrate: launch client, context at entry point, `protectTool` + `toolsContext`, `protectAction`/`captureAction`, denial line in the system prompt | Completes asking only clarifying questions; any correction of wrong API usage is a failure requiring a skill fix + re-run |
| 4 | Export the transcript, reference it in the PR with a one-line verdict | Clean recorded transcript exists before merge |

**Status:** AC6.1 fresh-agent run passed on 2026-07-23 — verdict "completed
with 4 clarifying questions, zero corrections". Re-run only if `SKILL.md`
changes.

## End-to-End: Single-run correlation across decision types

Purpose: validates the headline AC1 promise — one `correlationId` joins a
guarded tool decision and a guarded external-action decision from one
workflow run (the seam automated integration tests stub, exercised here
against the real backend).

Steps: Perform Phase 5 steps 3–6, then in the dashboard confirm that the
tool decision (`order.looked-up`) and the external-action decision
(`ticket.updated`) share the exact `correlationId` returned in the API
response. Once `experimental_capture()` ships, re-run and confirm
`notification.sent` capture events carry the same ID.

## End-to-End: Rate-limit denial visible to the model

Purpose: confirms the deny path is user-observable end to end (AC2.2/AC2.9
in a live loop, not a mock).

Steps: Phase 5 step 8 — drive `lookupOrder` past its token-bucket limit;
verify the agent surfaces an apology/denial rather than the order data, and
the dashboard shows a DENY `RATE_LIMIT` decision under the run's
`correlationId`.

## Human Verification Required

| Criterion | Why Manual | Steps |
|-----------|------------|-------|
| AC5.2 | Needs a live dev Arcjet site + dashboard/MCP inspection no CI job or unit test can perform | Phase 5, steps 1–9 |
| AC6.1 | Success is skill-file quality judged from an observed fresh-agent transcript — not an automatable assertion | Phase 6, steps 1–4 (already passed; re-run on skill change) |

## Traceability

| Acceptance Criterion | Automated Test | Manual Step |
|----------------------|----------------|-------------|
| AC1.1–AC1.4 | `arcjet-ai/test/context.test.ts` | — |
| AC1.5, AC1.6 | `arcjet-ai/test/generate-text.test.ts` | E2E "single-run correlation" (live confirmation) |
| AC1.7 | `arcjet-ai/test/protect-tool.test.ts` | — |
| AC2.1–AC2.8 | `arcjet-ai/test/protect-tool.test.ts` | — |
| AC2.9 | `arcjet-ai/test/generate-text.test.ts` | E2E "rate-limit denial" (live confirmation) |
| AC3.1–AC3.5 | `arcjet-ai/test/protect-action.test.ts` | — |
| AC4.1–AC4.3 | `arcjet-ai/test/metadata.test.ts` | — |
| AC5.1 | `reusable-examples.yml` CI matrix (`nextjs-ai-agent`) | — |
| AC5.2 | — | Phase 5, steps 1–9 |
| AC6.1 | — | Phase 6, steps 1–4 |

**Known gap (documented, not a coverage failure):** capture-event delivery is
unavailable until `@arcjet/guard` ships `experimental_capture()`. The library
warns and skips capture; tests assert the warning path, and the example
README documents the deferral.
