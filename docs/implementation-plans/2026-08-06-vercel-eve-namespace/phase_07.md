# Vercel Eve Namespace Implementation Plan — Phase 7: Dogfood — `arcjet/apps/toto`

**Goal:** One Slack conversation with toto is one Sequence in the Arcjet Console, and toto's hand-rolled security plumbing is replaced by the helpers.

> **These tasks execute in a different repository.** Every path below is relative to `arcjet/` (checked out at `../arcjet`), not `arcjet-js/`. Copy this phase file into that repo before running it and reconcile it against the repo's current state first — toto is under active development and the versions and line numbers here were read on 2026-08-06. Task 0 exists to force that reconciliation rather than let it be assumed.

**Architecture:** toto is a Slack-fronted Eve agent whose model-facing tools all come from one OpenAPI connection. It already calls Arcjet by hand at the channel boundary (`agent/arcjet.ts` + `agent/channels/slack.ts`, ~140 lines including the fail-open/closed logic and the denial-copy mapping) and does not correlate anything. This phase replaces the boundary code with `guardInbound`, adds the gate the connection has never had via `guardApproval`, mounts `arcjetHooks`, and thereby produces the correlated Sequence that is this whole feature's proof.

**Tech Stack:** Eve, TypeScript, vitest, `@arcjet/guard`.

**Scope:** Phase 7 of 8 from `docs/design-plans/2026-08-06-vercel-eve-namespace.md`.

**Codebase verified:** 2026-08-06 (in `../arcjet`, at `apps/toto`)

---

## Acceptance Criteria Coverage

This phase implements and tests:

### vercel-eve-namespace.AC8: Dogfood — toto is a single Sequence
- **vercel-eve-namespace.AC8.1 Success:** `apps/toto/agent/channels/slack.ts` screens inbound messages with `guardInbound` and its hand-rolled screening block (`passesScreening`, the `enforcing` fail-open/closed branching, the decision-to-copy mapping) is deleted, with the user-facing decline copy preserved.
- **vercel-eve-namespace.AC8.2 Success:** `apps/toto/agent/connections/arcjet-internal.ts` carries a `guardApproval` gate on the cross-tenant internal API tools.
- **vercel-eve-namespace.AC8.3 Success:** `apps/toto/agent/hooks/arcjet.ts` mounts `arcjetHooks`.
- **vercel-eve-namespace.AC8.4 Success:** toto's existing test suite passes, including its Slack channel tests, which currently assert the hand-rolled behaviour and must be retargeted rather than deleted.
- **vercel-eve-namespace.AC8.5 Success:** One dev or staging Slack conversation produces, under one correlation id, the inbound screening decision, a gate decision per tool call, and an execution outcome per tool call — verified via the Console or MCP `list-guards`.

---

## State of toto as read on 2026-08-06

| File | Lines | What it does today |
|---|---|---|
| `agent/agent.ts` | 9 | `defineAgent` with model + `modelContextWindowTokens` |
| `agent/arcjet.ts` | 74 | launches the client; exports `enforcing`, `screenUserMessage(text)`, `denialReason(decision)` |
| `agent/channels/slack.ts` | 137 | `slackChannel`; `passesScreening`, `requesterAllowed`, `safePost`, `dispatch`, the `DENY_MESSAGE` map |
| `agent/connections/arcjet-internal.ts` | 219 | `defineOpenAPIConnection` with a vendored spec, OIDC auth, two allowed operations. **No `approval`.** |
| `agent/instrumentation.ts` | 21 | `defineInstrumentation` + `registerOTel` |
| `agent/__tests__/slack.test.ts` | 273 | vitest; mocks `../arcjet.js`, `eve/channels/slack`, `@vercel/connect/eve`; **12** `it(...)` blocks — 8 under `describe("inbound Slack screening seam")`, 4 under `describe("requester allowlist (F2)")` |
| `agent/__tests__/arcjet-internal.test.ts` | 83 | connection tests |
| `package.json` | — | `@arcjet/guard@1.10.0-rc.0`, `eve@0.27.1`, `ai@7.0.35`, vitest 4 |

Two things to notice before touching anything:

1. **`eve@0.27.1` is below the namespace's `>=0.30` floor.** Bumping Eve is a prerequisite, not an incidental version change, and it is the task most likely to have side effects — three minor lines of a pre-1.0 framework.
2. **`agent/arcjet.ts`'s header comment already documents the design constraint this whole feature is built on**: *"eve's hooks are observe-only and cannot reject a turn, so screening happens at the inbound channel boundary."* That comment is correct and should survive, reworded to point at `guardInbound`.

---

<!-- START_TASK_0 -->
### Task 0: Reconcile this phase against the current repo

**Verifies:** None (prerequisite).

**Files:** None.

**Step 1:** Re-read every file in the table above and note every difference from it — versions, function names, line counts, tests.

**Step 2:** Confirm the helper surface this phase calls actually exists in the `@arcjet/guard` build being consumed. Check the installed `.d.ts`, not this plan:

```bash
cd apps/toto
node -e "console.log(require.resolve('@arcjet/guard/package.json'))"
grep -n "vercel-eve" node_modules/@arcjet/guard/package.json
ls node_modules/@arcjet/guard/dist/vercel-eve/v0/
```

**Step 3: Decide how toto consumes the unreleased namespace.** This is a prerequisite with no default, and Task 1 cannot start without it. `apps/toto/package.json` pins `@arcjet/guard: 1.10.0-rc.0` **from the npm registry** — unlike `examples/nextjs-ai-agent`, which uses `file:../../arcjet-guard` and picks up the workspace build for free. Two options:

- **Publish a new prerelease.** `@arcjet/guard`'s dist-tags are `latest: 1.9.1`, `rc: 1.10.0-rc.0`, `experimental: 0.1.0-experimental.2`, so cutting `1.10.0-rc.1` carrying the namespace follows how toto already receives prereleases. Costs a publish; gives toto a normal dependency and a deploy that works from CI.
- **Install a packed tarball.** `npm pack` in `arcjet-guard/` and install the file into toto. No publish, but the lockfile records a local path, `eve deploy` from CI will not resolve it, and it must be undone before merge.

The first is the better fit for AC8.5, which needs a **deployed or dev-server** run against a real Arcjet site rather than a local unit test. Pick one, record which, and if it is the tarball say explicitly how the deploy path is covered.

**Step 4:** Record the deltas and adjust the tasks below before executing them. If a helper's signature moved, this file is wrong and the typings are right.
<!-- END_TASK_0 -->

<!-- START_TASK_1 -->
### Task 1: Bump `eve` and `@arcjet/guard`

**Verifies:** None (infrastructure), but AC8.4 depends on it landing cleanly.

**Files:**
- Modify: `apps/toto/package.json`
- Modify: `apps/toto/package-lock.json` (or the repo's lockfile, if `apps/toto` is part of a workspace — check)

**Implementation:**

Bump `eve` from `0.27.1` to a version in `>=0.30 <1` and `@arcjet/guard` to the build carrying `vercel-eve/v0`, by whichever mechanism Task 0 Step 3 selected. Do these as **two separate commits**: an Eve bump across three minor lines of a pre-1.0 framework can break toto on its own, and separating the commits is what tells you which change broke what.

Before the Eve bump, read its changelog for the intervening minors:

```bash
npm view eve@0.28.0 dist.tarball  # or read node_modules/eve/CHANGELOG.md after installing
```

Pay attention to anything touching `slackChannel`, `defineOpenAPIConnection`, `defineInstrumentation`, or the `SessionContext` shape — those are toto's whole surface.

**Verification:**

```bash
cd apps/toto
npm install
npm run typecheck
npx vitest run
npm run build
```

Expected: all four pass after the Eve bump alone, before any Arcjet change. If they do not, fix that first and separately — do not let an Eve migration and an Arcjet integration land in one commit, because the next person bisecting will not be able to tell them apart.

**Commits:** `chore(toto): upgrade eve to 0.30.x` then `chore(toto): upgrade @arcjet/guard for the vercel-eve namespace`
<!-- END_TASK_1 -->

<!-- START_SUBCOMPONENT_A (tasks 2-4) -->
<!-- START_TASK_2 -->
### Task 2: Reduce `agent/arcjet.ts` to a client and rules

**Verifies:** vercel-eve-namespace.AC8.1 (the deletion half).

**Files:**
- Modify: `apps/toto/agent/arcjet.ts`

**Implementation:**

What survives: the `launchArcjet` call, the `mode` derivation from `ARCJET_MODE`, and the rule instances (`promptInjection`, `sensitiveInfo`) built at module scope. Export the client and the rules.

What goes: `screenUserMessage` (its guard call and its logging are `guardInbound`'s job now), `denialReason` (the caller classifies from `verdict.decision` using each rule's own `results()`), and `enforcing` as a *control-flow* flag — but read the next paragraph before deleting it.

`enforcing` currently does two distinct jobs, and only one of them moves:

1. It selects the guard **mode** (`LIVE` vs `DRY_RUN`) on the rules. That stays: it is a rule-construction concern and `ARCJET_MODE` is the switch.
2. It selects whether the channel **blocks** on a DENY or a failed-open decision. That becomes `guardInbound`'s `onGuardError` plus the caller's handling of `allowed: false`.

Those two are not the same switch and conflating them is a behaviour change waiting to happen. In `DRY_RUN`, a rule returns ALLOW even for content it flagged, so `guardInbound` returns `{ allowed: true }` and the channel dispatches — which is the current DRY_RUN behaviour and needs no extra flag. What *does* still need a decision is the unavailable path: today DRY_RUN observes and never blocks even when screening throws. Express that as `onGuardError: enforcing ? "deny" : "allow"` and keep exporting `enforcing` for that one use. Comment it, because "we still export `enforcing`" looks like leftovers otherwise.

Keep the header comment's explanation of *why* screening is at the channel boundary, reworded to name `guardInbound` and to say that the helper is where the fail-open/closed logic now lives.

The per-decision `console.log` of the decision id and per-rule results is genuinely useful and `guardInbound` does not do it. Move it to the channel, reading `verdict.decision`.

**Verification:**

```bash
cd apps/toto && npm run typecheck
```

Expected: `agent/channels/slack.ts` now fails to compile (it imports the deleted functions). That is expected mid-subcomponent; Task 3 fixes it. Do not commit a broken tree — land Tasks 2 and 3 as one commit.
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Replace the hand-rolled screening with `guardInbound`

**Verifies:** vercel-eve-namespace.AC8.1.

**Files:**
- Modify: `apps/toto/agent/channels/slack.ts`

**Implementation:**

Delete `passesScreening` entirely (it is ~35 lines of try/catch, fail-open/closed branching and decision classification, all of which `guardInbound` now does) and replace the call in `onInboundMessage`:

```ts
async function onInboundMessage(
  ctx: SlackContext,
  message: SlackMessage,
): Promise<SlackMentionResult> {
  if (!message.author || message.author.isBot) return null;
  if (!requesterAllowed(message)) return null;

  const verdict = await guardInbound(arcjet, message.markdown, {
    action: "slack.message-received",
    rules: [promptInjection(message.markdown), sensitiveInfo(message.markdown)],
    // The Slack thread is the identity the channel has; eve creates the session
    // after this handler returns, so arcjetHooks emits the join record that
    // ties this id to the session id.
    correlationId: message.threadTs ?? message.ts,
    onGuardError: enforcing ? "deny" : "allow",
  });

  if (!verdict.allowed) {
    await safePost(ctx, declineCopy(verdict));
    return null;
  }
  return dispatch(ctx, message);
}
```

Check the real field names on `SlackMessage` for the thread identity — `threadTs`/`ts` are a guess from the shape of Slack's API and must be verified against `node_modules/eve/dist/src/public/channels/slack/index.d.ts`. Whatever it is, it must be **stable across the messages of one conversation**, or the inbound decisions of a multi-turn thread will not join to each other.

Keep `requesterAllowed` exactly as it is: it is an access-control boundary on the Slack workspace, not content screening, and `guardInbound` does not replace it. Keep it *before* the screening call, as it is today — no reason to screen a message from a workspace that is refused anyway.

Keep `safePost` and its comment. The reasoning ("eve catches and silently drops handler errors, which would leave the user with no answer AND no explanation") is still exactly right.

Replace `DENY_MESSAGE` + `denialReason` with a `declineCopy(verdict)` function that maps the verdict to the same three strings toto uses today. Classify from `verdict.decision` with the rules' own `results()`:

```ts
function declineCopy(verdict: Extract<InboundVerdict, { allowed: false }>): string {
  if (verdict.reason === "UNAVAILABLE") return SCREENING_UNAVAILABLE;
  const decision = verdict.decision;
  if (decision && promptInjection.results(decision).some((r) => r.conclusion === "DENY")) {
    return declineBecause("it looks like an attempt to override my instructions");
  }
  if (decision && sensitiveInfo.results(decision).some((r) => r.conclusion === "DENY")) {
    return declineBecause("it appears to contain sensitive personal information");
  }
  return declineBecause("it was flagged by security screening");
}
```

The user-facing strings are **not** to be reworded. They are the only part of this a person outside the team sees, and changing them is a separate decision.

Note one behaviour change to state in the commit message: today a failed-open decision in LIVE mode declines with `SCREENING_UNAVAILABLE`, reached through an explicit `enforcing && decision.hasFailedOpen()` check in the channel. That check disappears because `guardInbound` handles the failed-open signal itself under `onGuardError: "deny"` and reports it as `reason: "UNAVAILABLE"` — the same outcome by a shorter path. Confirm it with a test rather than by reading (Task 5 covers it).

**Verification:**

```bash
cd apps/toto && npm run typecheck && npm run build
```

**Commit:** `feat(toto): screen inbound Slack messages with guardInbound`
<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Gate the internal API connection

**Verifies:** vercel-eve-namespace.AC8.2.

**Files:**
- Modify: `apps/toto/agent/connections/arcjet-internal.ts`
- Modify: `apps/toto/agent/arcjet.ts` (add the rate-limit rule)

**Implementation:**

This connection is the reason toto needs guarding at all. The reasoning is recorded in the files that *consume* it, not in the connection itself: `agent/channels/slack.ts:86-87` says "The internal request-info tool is cross-tenant, so screening alone is not an access-control boundary", and `agent/arcjet.ts:11` says the agent "wields a cross-tenant internal API tool". Read those two, not `agent/connections/arcjet-internal.ts`, which contains neither phrase. Until now the only defence has been the inbound screen and the workspace allowlist — nothing bounds how many cross-tenant lookups one conversation can make.

Add a token bucket to `agent/arcjet.ts` and a gate to the connection:

```ts
approval: guardApproval(arcjet, {
  action: "arcjet-internal.read",
  rules: (ctx) => [
    internalApiLimit({
      // Key on the Slack principal so one user cannot exhaust another's budget;
      // fall back to the session so an unauthenticated path is still bounded.
      key: ctx.session.auth.current?.principalId ?? ctx.session.id,
      requested: 1,
    }),
  ],
  metadata: (ctx) => ({ "eve.operation": ctx.toolName }),
}),
```

Choose the limit deliberately and write the reasoning in a comment: a normal investigation is a handful of lookups (site-activity, then one or two request-info drill-downs), so a bucket around 20 per 5 minutes leaves headroom while bounding a runaway loop. Confirm the actual shape and units of `tokenBucket`'s config against the installed typings before writing numbers.

Leave `onGuardError` at its `"deny"` default. This is a cross-tenant internal API; if the policy cannot be evaluated, not making the call is the right answer, and the model receives a reason it can explain to the user.

Do **not** reach for `guardTool` here. There is no local `execute` — the operations are generated from the OpenAPI spec — which is exactly the case the approval gate exists for.

**Verification:**

```bash
cd apps/toto && npm run typecheck && npx vitest run agent/__tests__/arcjet-internal.test.ts && npm run build
```

Expected: the connection tests pass. Check whether they assert the connection's exact config shape — if they do, they need the new `approval` key added, and that is a test edit rather than a failure.

**Commit:** `feat(toto): rate limit the cross-tenant internal API tools`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_TASK_5 -->
### Task 5: Mount the hooks

**Verifies:** vercel-eve-namespace.AC8.3.

**Files:**
- Create: `apps/toto/agent/hooks/arcjet.ts`

**Implementation:**

```ts
import { defineHook } from "eve/hooks";
import { arcjetHooks } from "@arcjet/guard/vercel-eve/v0";

import { arcjet } from "../arcjet.js";

// Observe-only: captures the session join record (which is what ties the
// channel-boundary screening decision to this session's guard decisions), each
// tool call's outcome, and any subagent delegation. eve's hooks cannot reject a
// turn — enforcement is the channel screen and the connection's approval gate.
export default defineHook(arcjetHooks(arcjet));
```

Start with all four event families. toto's conversations are short (an investigation is a few turns), so volume is not yet a reason to narrow, and the turn events are useful for reading a Sequence. Revisit if capture volume becomes visible.

**Verification:**

```bash
cd apps/toto && npm run typecheck && npm run build
```

Expected: `eve build` accepts the new hook file. Confirm from the build output that the hook was discovered — Eve's capabilities are path-derived, so a misplaced file is silently inert rather than an error. If the build output does not list it, check the directory name against Eve's convention (`agent/hooks/*.ts`).

**Commit:** `feat(toto): capture the Arcjet sequence from eve lifecycle hooks`
<!-- END_TASK_5 -->

<!-- START_TASK_6 -->
### Task 6: Retarget the Slack channel tests

**Verifies:** vercel-eve-namespace.AC8.4.

**Files:**
- Modify: `apps/toto/agent/__tests__/slack.test.ts`

**Implementation:**

The file mocks `../arcjet.js` and drives the channel handler through **12** tests (count them yourself with `grep -c "  it("` before starting; the figure was verified 2026-08-06). The mock target changes — `screenUserMessage` and `denialReason` are gone — but **every one of the 12 behaviours must still be asserted**. This is a retarget, not a rewrite: each existing test names a real behaviour someone decided mattered, and deleting one because its seam moved silently drops a guarantee.

Map them:

| Existing test | After |
|---|---|
| dispatches a clean ALLOW message | mock `guardInbound` → `{ allowed: true }`; assert typing indicator + auth |
| does NOT dispatch a prompt-injection DENY; posts an explanation | mock → `{ allowed: false, reason: "DENY", decision }` where the injection rule's `results()` yields a DENY; assert the exact copy |
| does NOT dispatch a PII DENY on the DM path | same with the sensitive-info rule |
| FAIL-OPEN GUARD: does not dispatch when screening failed open | mock → `{ allowed: false, reason: "UNAVAILABLE" }`; assert the unavailable copy. This is the behaviour Task 3 changed the *path* of, so this test is the one that proves the outcome is unchanged |
| DRY_RUN: observes a failed-open decision without blocking | with `ARCJET_MODE` unset, assert `guardInbound` was called with `onGuardError: "allow"`, and that an `{ allowed: true }` verdict dispatches |
| BOT GUARD | unchanged — it returns before screening |
| FAIL-CLOSED ON POST ERROR | unchanged — `safePost` is untouched |
| FAIL-CLOSED ON SCREENING ERROR: does not dispatch when screening throws | `guardInbound` is documented never to throw, so this test's premise changes. Keep it as a **defence-in-depth** test: make the mock reject and assert the handler still declines rather than throwing. If the handler has no try/catch of its own, add one — the contract that `guardInbound` never throws is `@arcjet/guard`'s, and toto should not be taken down by a regression in it |
| requester allowlist (4 tests) | unchanged — they return before screening |

Add two tests for behaviour that did not exist before:

- `guardInbound` receives a `correlationId` derived from the thread, and two messages in the same thread produce the **same** id. This is what AC8.5 rests on and is the assertion most likely to be quietly wrong.
- `guardInbound` receives both rule instances, in `rules`.

Mock at the `@arcjet/guard/vercel-eve/v0` boundary, matching how the file already mocks `eve/channels/slack`. Note that `vi.mock` is hoisted and this file depends on that (there is a comment saying so) — keep the import ordering intact.

**Verification:**

```bash
cd apps/toto && npx vitest run agent/__tests__/slack.test.ts
```

Expected: **14** tests in that file — 12 retargeted plus the 2 new ones. Scope the command to the one file: a whole-suite `npx vitest run` also runs `arcjet-internal.test.ts`, so its total conflates two files and cannot tell you whether a Slack behaviour was dropped.

If the file's count is below 14, a behaviour was dropped — find which, from the mapping table above. If it is above 14, you added something the table does not describe; that may be fine, but say what it is.

Then run the whole suite to confirm nothing else broke:

```bash
npx vitest run
```

**Commit:** `test(toto): retarget the Slack channel tests onto guardInbound`
<!-- END_TASK_6 -->

<!-- START_TASK_7 -->
### Task 7: Verify the Sequence end to end

**Verifies:** vercel-eve-namespace.AC8.5.

**Files:**
- Modify: `apps/toto/README.md` (the "How it works" diagram and the Security bullet)

**Implementation:**

Run one real conversation and confirm the Sequence, then document what was seen.

**Step 1: Run it**

```bash
cd apps/toto
npm run dev
```

In Slack (or against the dev channel endpoint), send a message that triggers at least two tool calls — "show me the latest requests for `site_…`" then a drill-down into one id.

**Step 2: Read the Sequence**

Using the Arcjet MCP server or the Console:

```
list-guards           # find the guard decisions for the site
get-guard <id>        # per-rule results for one
```

Confirm, and record the ids:

- one inbound screening decision, correlated by the thread identity;
- one `session.started` join record carrying both that thread identity and the session id;
- one gate decision per tool call, correlated by the session id;
- one result event per tool call, correlated by the session id, with `eve.phase: "result"` and an `outcome`.

**Step 3: Verify the negative path**

Send a message that trips the prompt-injection rule with `ARCJET_MODE=LIVE`. Confirm: the channel declines with the expected copy, the inbound decision is a DENY, and **no** session starts — no gate decisions, no result events. A decline that still dispatched a turn would be a silent failure of the whole design, and it is only observable here.

**Step 4: Exercise the gate**

Force a denial from the connection gate by setting the token bucket's capacity to 1 temporarily (or by making enough calls). Confirm: a gate decision with `outcome: "denied"`, a result event with `outcome: "denied"` and `eve.phase: "result"` for the same call id, and the model explaining the denial rather than retrying in a loop.

That last observation is the one worth writing down. The design predicts a denied call produces two events distinguishable by `eve.phase`; this is where that is either true or not.

**Step 5: Document**

Update `apps/toto/README.md`'s "How it works" diagram to show the gate and the hooks, and the Security bullet to mention the rate limit on the cross-tenant tools and the correlated Sequence. Include the correlation ids from Step 2 in the PR description, not the README — they are evidence, not documentation.

**Verification:** the recorded decision ids and the four confirmations above. If any leg is missing, AC8.5 is not met; report which, rather than reporting the phase complete.

**Commit:** `docs(toto): document the guarded, correlated request path`
<!-- END_TASK_7 -->

---

## Phase 7 done when

- Task 0's reconciliation is recorded, including any deltas from the table above **and** which `@arcjet/guard` consumption mechanism was chosen.
- `eve` and `@arcjet/guard` are bumped in separate commits, each green on its own.
- `passesScreening`, `screenUserMessage` and `denialReason` are gone; the user-facing decline copy is byte-identical.
- The internal API connection has a `guardApproval` gate with a rate limit whose size is justified in a comment.
- `agent/hooks/arcjet.ts` is discovered by `eve build`.
- `agent/__tests__/slack.test.ts` passes with **14** tests (12 retargeted + 2 new), and the whole suite passes. No pre-existing behaviour was dropped.
- One conversation's Sequence is recorded with real decision ids, plus the decline path and the gate-denial path confirmed.
