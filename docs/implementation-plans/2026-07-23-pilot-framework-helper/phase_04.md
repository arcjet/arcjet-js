# Pilot Framework Helper (`@arcjet/ai`) Implementation Plan — Phase 4: `protectAction` and `captureAction`

**Goal:** The non-tool enforcement surface (`protectAction`, throwing `ArcjetDeniedError` on DENY) and the observe-only surface (`captureAction`), converging on the same guard/capture wire shapes as `protectTool`.

**Architecture:** Same execution skeleton as `protectTool` (Phase 3) minus the AI SDK: guard (when rules present) → on DENY capture + **throw** (there is no model to hand a structured result to) → on ALLOW run `fn` → capture outcome. Reuses `ArcjetAiClient`, `captureEvent`, `shouldWarn` from `arcjet-ai/src/client.ts` and the metadata-merge convention (context ← policy). `ArcjetDeniedError` is a plain `Error` subclass carrying the `DecisionDeny` — the repo has no existing error-class convention (arcjet-guard defines none), so this is a new, design-mandated pattern.

**Tech Stack:** `@arcjet/guard@1.9.1` types, node:test. No AI SDK involvement in this phase.

**Scope:** Phase 4 of 6 from `docs/design-plans/2026-07-23-pilot-framework-helper.md`.

**Dependencies:** Phases 2 **and 3** — the design lists only Phase 2, but this
phase imports `captureEvent`, `shouldWarn`, and `ArcjetAiClient` from
`arcjet-ai/src/client.ts`, which Phase 3 Task 1 creates. This is a hard build
dependency: execute after Phase 3.

**Codebase verified:** 2026-07-23 (same verification base as Phase 3: guard/capture shapes, fail-open behavior, warning convention).

---

## Acceptance Criteria Coverage

This phase implements and tests:

### pilot-framework-helper.AC3: `protectAction` / `captureAction`
- **pilot-framework-helper.AC3.1 Success:** on ALLOW, `fn` runs and its return
  value is passed through.
- **pilot-framework-helper.AC3.2 Failure:** on DENY, `ArcjetDeniedError`
  (carrying the decision) is thrown and `fn` is never called.
- **pilot-framework-helper.AC3.3 Success:** capture fires after `fn` with the
  outcome (success/denied/error).
- **pilot-framework-helper.AC3.4 Success:** `captureAction` emits a capture
  event with the context's correlation ID and merged metadata.
- **pilot-framework-helper.AC3.5 Failure:** guard API errors fail open (`fn`
  runs).

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: `ArcjetDeniedError`, `protectAction`, `captureAction`

**Files:**
- Create: `arcjet-ai/src/protect-action.ts`
- Modify: `arcjet-ai/src/index.ts` (exports)

**Implementation:**

```ts
import type { DecisionDeny, RuleWithInput } from "@arcjet/guard";
import { captureEvent, shouldWarn } from "./client.js";
import type { ArcjetAiClient } from "./client.js";
import type { ArcjetAiContext } from "./context.js";

/**
 * Thrown by `protectAction()` when guard denies the action. Carries the
 * denying decision so callers can branch on `error.decision.reason`,
 * catch-and-skip, or abort the workflow.
 */
export class ArcjetDeniedError extends Error {
  readonly decision: DecisionDeny;

  constructor(action: string, decision: DecisionDeny) {
    super(
      `Arcjet denied action "${action}" (${decision.reason}); decision ${decision.id}`,
    );
    this.name = "ArcjetDeniedError";
    this.decision = decision;
  }
}

/** Policy for `protectAction()`. */
export interface ProtectActionPolicy {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate; omit for capture-only behavior. */
  rules?: RuleWithInput[];
  /** Metadata merged over the context's. */
  metadata?: Record<string, string>;
}

export async function protectAction<T>(
  client: ArcjetAiClient,
  ctx: ArcjetAiContext,
  policy: ProtectActionPolicy,
  fn: () => Promise<T>,
): Promise<T> {
  const correlationId = ctx.correlationId;
  const metadata = { ...ctx.metadata, ...policy.metadata };

  let decisionId: string | undefined;
  if (policy.rules !== undefined && policy.rules.length > 0) {
    let decision;
    try {
      decision = await client.guard({
        label: policy.action,
        rules: policy.rules,
        correlationId,
        metadata,
      });
    } catch (error) {
      if (shouldWarn()) {
        console.warn(
          `@arcjet/ai: guard check for "${policy.action}" errored; failing open:`,
          error,
        );
      }
      decision = undefined;
    }
    if (decision !== undefined) {
      decisionId = decision.id;
      if (decision.hasFailedOpen() && shouldWarn()) {
        console.warn(
          `@arcjet/ai: guard check for "${policy.action}" failed open (API error).`,
        );
      }
      if (decision.conclusion === "DENY") {
        captureEvent(client, {
          action: policy.action,
          correlationId,
          decisionId,
          metadata: { ...metadata, outcome: "denied" },
        });
        throw new ArcjetDeniedError(policy.action, decision);
      }
    }
  }

  let result: T;
  try {
    result = await fn();
  } catch (error) {
    captureEvent(client, {
      action: policy.action,
      correlationId,
      decisionId,
      metadata: { ...metadata, outcome: "error" },
    });
    throw error;
  }
  captureEvent(client, {
    action: policy.action,
    correlationId,
    decisionId,
    metadata: { ...metadata, outcome: "success" },
  });
  return result;
}

/** Options for `captureAction()`. */
export interface CaptureActionOptions {
  /** Capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Metadata merged over the context's. */
  metadata?: Record<string, string>;
}

/**
 * Observe-only sugar over `experimental_capture()`: records that the
 * application did something, correlated to the run. Fire-and-forget; never
 * throws.
 */
export function captureAction(
  client: ArcjetAiClient,
  ctx: ArcjetAiContext,
  opts: CaptureActionOptions,
): void {
  captureEvent(client, {
    action: opts.action,
    correlationId: ctx.correlationId,
    metadata: { ...ctx.metadata, ...opts.metadata },
  });
}
```

Notes:
- JSDoc each export in repo style; `protectAction` gets an `@example` showing
  a workflow step posting to GitHub behind a rate-limit rule and a
  `try/catch (ArcjetDeniedError)` branch. Also document the decision rule the
  skill file teaches: model-invoked → `protectTool`; app-invoked →
  `protectAction`; observe-only → `captureAction`.
- `captureAction` deliberately does NOT add an `outcome` key: it records a
  bare fact, not a guarded execution.
- Add exports to `src/index.ts`:

```ts
export {
  ArcjetDeniedError,
  captureAction,
  protectAction,
} from "./protect-action.js";
export type {
  CaptureActionOptions,
  ProtectActionPolicy,
} from "./protect-action.js";
```
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: `protectAction` / `captureAction` tests

**Verifies:** pilot-framework-helper.AC3.1, AC3.2, AC3.3, AC3.4, AC3.5

**Files:**
- Create: `arcjet-ai/test/protect-action.test.ts` (unit)

**Testing:** reuse the stub-client factory pattern from
`test/protect-tool.test.ts` (copy the small factory into this file or lift it
into `test/_shared/stub-client.ts` — arcjet-guard uses a `test/_shared/`
directory for exactly this; prefer the shared helper and refactor
`protect-tool.test.ts` to use it).

Tests must verify each AC listed above:

- **AC3.1:** ALLOW decision → `fn` runs once, `protectAction` resolves with
  `fn`'s return value (sentinel object, `assert.equal` reference check).
- **AC3.2:** DENY decision → `assert.rejects` with an error where
  `error instanceof ArcjetDeniedError`, `error.name === "ArcjetDeniedError"`,
  `error.decision.reason === "RATE_LIMIT"`, `error.message` mentions the
  action and reason; the `fn` spy was never called.
- **AC3.3 (three outcomes):** success path → one capture with metadata
  `outcome: "success"` and `decisionId` set; denied path → one capture with
  `outcome: "denied"` + `decisionId`; error path (`fn` rejects with a
  sentinel) → the same sentinel propagates out and one capture fired with
  `outcome: "error"`.
- **AC3.4:** `captureAction(client, ctx, { action: "notification.sent", metadata: { destination: "slack" } })`
  with `ctx = createAiContext({ correlationId: "run-1", metadata: { agent: "review-bot" } })`
  → exactly one capture call with `action: "notification.sent"`,
  `correlationId: "run-1"`, metadata
  `{ agent: "review-bot", destination: "slack" }`, and NO `outcome` key.
- **AC3.5:** guard throws → `fn` still runs, result passes through, and
  (with `ARCJET_LOG_LEVEL=warn` + mocked `console.warn`) a fail-open warning
  was emitted.
- **Capture-only:** no `rules` in policy → guard never called, `fn` runs,
  capture fires `outcome: "success"` without `decisionId`.

**Verification:**
Run: `npm test --workspace @arcjet/ai`
Expected: all tests pass (including Phases 2–3 suites).

Also run: `npm run typecheck --workspace @arcjet/ai`, root `npm run lint`,
root `npm run format:check`.
Expected: all exit 0.

**Commit:** `feat(ai): add protectAction() and captureAction()`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

---

## Phase completion checklist

- [ ] `npm test --workspace @arcjet/ai` passes
- [ ] `npm run typecheck --workspace @arcjet/ai` passes
- [ ] Root `npm run lint` and `npm run format:check` pass
- [ ] AC3.1–AC3.5 each named in a test description
- [ ] One commit as specified
