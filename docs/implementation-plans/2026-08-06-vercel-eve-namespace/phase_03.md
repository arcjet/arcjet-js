# Vercel Eve Namespace Implementation Plan — Phase 3: `guardApproval` and `runGate`

**Goal:** The namespace's primary enforcement surface — one gate assignable to an authored tool's `approval`, an OpenAPI connection's `approval`, and an MCP connection's `approval`.

**Architecture:** Eve's `approval` field is a function of `ApprovalContext` returning an `ApprovalStatus`; `{ type: "denied", reason }` blocks the call and hands the model a reason string. It is the only enforcement point that reaches connection-derived tools, which have no local `execute` to wrap. Because an approval function never executes the call it gates, the agnostic `runGuarded` engine (whose whole shape is guard → execute → capture) does not fit; this namespace gets its own small `runGate` engine that captures a *gate* outcome and stops there. Execution outcomes arrive separately from `arcjetHooks` in Phase 5.

**Tech Stack:** TypeScript 7, `node --test`, oxlint. Eve types via `import type` only.

**Scope:** Phase 3 of 8 from `docs/design-plans/2026-08-06-vercel-eve-namespace.md`.

**Codebase verified:** 2026-08-06

---

## Acceptance Criteria Coverage

This phase implements and tests:

### vercel-eve-namespace.AC4: `guardApproval` gates tool and connection calls
- **vercel-eve-namespace.AC4.1 Success:** On ALLOW the returned `Approval` resolves to `"not-applicable"` by default — Arcjet asserts nothing about *human* approval, so the call proceeds through Eve's normal path.
- **vercel-eve-namespace.AC4.2 Success:** `policy.onAllow: "user-approval"` makes an ALLOW resolve to `"user-approval"` instead, so a site can require a human even when the policy passed. This is the knob for irreversible actions and is why ALLOW is not hardcoded.
- **vercel-eve-namespace.AC4.3 Failure:** On DENY the approval resolves to `{ type: "denied", reason }` where `reason` names the denying reason and, for `RATE_LIMIT`, the retry-after in seconds. The wrapped call does not execute.
- **vercel-eve-namespace.AC4.4 Success:** `guard()` is called with `label` = `policy.action`, the resolved rules, the session-derived `correlationId`, and metadata merged in order context ← policy ← per-call function, plus `eve.tool` (`ctx.toolName`) and `eve.call` (`ctx.callId`).
- **vercel-eve-namespace.AC4.5 Success:** `policy.rules` may be a static array or a function of the `ApprovalContext`, so a rate limit can be keyed on the session, the principal, or the tool input (`ctx.toolInput`).
- **vercel-eve-namespace.AC4.6 Failure:** With the default `onGuardError: "deny"`, **both** guard-unavailable signals — the guard call throwing, and a returned decision whose `hasFailedOpen()` is true — resolve to `{ type: "denied", reason }` naming an unavailable check, and capture `outcome: "unavailable"`. Not `"denied"`: a policy outage and a policy denial must stay distinguishable on the capture stream.
- **vercel-eve-namespace.AC4.7 Failure:** With `onGuardError: "allow"`, both signals resolve to `"not-applicable"` (or `policy.onAllow`) and emit a warning gated on `ARCJET_LOG_LEVEL`. The warning names the mode actually taken: the `"allow"` path's warning matches `/fail(ing|ed) open/` and the `"deny"` path's does not — it says "failing closed" or "was unavailable". The alternation is not laziness: `src/agents/guarded.ts` deliberately says "failing open" when the guard call threw and "failed open (API error)" when a decision reported itself failed-open, and this criterion asserts the *mode is named*, not one particular phrasing. A criterion demanding the literal `"failing open"` would be unsatisfiable against the second string while forbidding the fix.
- **vercel-eve-namespace.AC4.8 Success:** The gate captures exactly one event per evaluation, with `outcome` of `"allowed"`, `"denied"` or `"unavailable"`, and — for `guardApproval` specifically — metadata `eve.phase: "approval"`. The phase key is written by each helper, not by the shared `runGate` engine, which `guardInbound` also drives with `eve.phase: "inbound"`. It never captures `"success"` or `"error"` — the gate cannot observe execution, and claiming otherwise would make the capture stream lie. Execution outcomes come from `arcjetHooks` (AC6).
- **vercel-eve-namespace.AC4.9 Edge:** The returned function never throws, for any input, including a context missing `session`, a `rules` callback that throws, and a client whose `guard()` rejects. Eve treats a throwing approval as a failed call; a security helper must not be the reason a tool call fails.
- **vercel-eve-namespace.AC4.10 Success:** `policy.onDeny` reshapes the returned `ApprovalStatus`, and receives the `DecisionDeny`. It is **not** invoked on either unavailable signal.

---

## Context an engineer needs before starting

Read these before writing anything:

- `arcjet-guard/src/agents/guarded.ts` — `runGuarded`, the engine `runGate` is modelled on. Note in particular: the `guard()` call happens **always**, including with no rules; `decision.id === ""` is suppressed because fail-open decisions synthesize an empty id; the `conclusion === "ALLOW" && hasFailedOpen()` conjunct must stay inside the `if` for TypeScript to narrow to `DecisionAllow`; warnings use constant format strings with interpolated arguments (a Semgrep requirement) and are extracted into a helper to stay inside oxlint's `max-depth` of 4.
- `arcjet-guard/src/agents/capture.ts` — `captureEvent()` (swallows every throw) and `shouldWarn()`.
- `arcjet-guard/src/vercel-ai/v7/guard-tool.ts` — the denial-message wording to stay consistent with. Its `UNAVAILABLE_RETRY_AFTER_SECONDS = 5` is **not** needed here: this namespace's unavailable string carries no seconds, and the constant belongs to the conditional Phase 4 Task 3, which is its only consumer. Do not reintroduce it earlier.
- `arcjet-guard/test/_shared/stub-client.ts` — `stubClient`, `decisionAllow`, `decisionDenyRateLimit`, `decisionDenyPromptInjection`, `decisionDenyPromptInjectionWithReset`, `decisionDenyError`, `decisionFailOpenAllow`, `fakeRule`. Every stub this phase needs already exists; do not write new decision builders.
- `arcjet-guard/test/_shared/source-scan.ts` — `recorded()` for reading back a stub's recorded call.

Eve's approval types, all `import type`:

```ts
// from eve/tools
type ApprovalStatus =
  | undefined | boolean
  | "not-applicable" | "approved" | "denied" | "user-approval"
  | { readonly type: "not-applicable"; readonly reason?: never }
  | { readonly type: "approved"; readonly reason?: string }
  | { readonly type: "denied"; readonly reason?: string }
  | { readonly type: "user-approval"; readonly reason?: never };

interface ApprovalContext<TInput = Record<string, unknown>> extends SessionContext {
  readonly approvedTools: ReadonlySet<string>;
  readonly callId: string;
  readonly toolInput?: TInput extends object ? Readonly<TInput> : TInput;
  readonly toolName: string;
}

type Approval<TInput = Record<string, unknown>> =
  (ctx: ApprovalContext<TInput>) => ApprovalStatus | Promise<ApprovalStatus>;
```

Two facts about `ApprovalStatus` that shape the implementation:

1. `"not-applicable"` means "this policy has no opinion; proceed without human approval". `"approved"` means "auto-approved". Arcjet on ALLOW is asserting the former: an Arcjet pass is not a human approval and should not be reported as one. That is why the default is `"not-applicable"`.

   Note what is **not** the reason. `ApprovalContext.approvedTools` is populated only when a human answers a pending approval request — the harness stores it under `eve.runtime.hitl.approvedTools` and `recordApprovedTools` (`harness/input-requests.js`) filters on responses whose `optionId === "approve"`. Returning `"approved"` from an approval function does not appear to add to that set. So the choice between the two statuses is a semantic and audit-surface one, not a behavioural one, as far as this reading of the harness goes. Confirm the observable difference (what reaches `action.result`, and what a channel handler sees) before writing anything stronger than that in the JSDoc.
2. `approval` is a single function per tool or connection, so there is no composition with `always()`/`once()`/`never()` from `eve/tools/approval`. `policy.onAllow` is what covers the "guard passed, still ask a human" case, and the skill (Phase 6) has to say so, because a reader who knows Eve will reach for `once()` and find there is nowhere to put it.

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: `runGate`

**Verifies:** vercel-eve-namespace.AC4.6, AC4.8 (the engine's half), AC4.9 (the never-throws contract).

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/gate.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/gate.test.ts`

**Implementation:**

`runGate` is the guard → capture sequence for a call site that decides whether something may run but does not run it. Contract:

```ts
export async function runGate<T>(
  client: ArcjetAgentClient,
  params: {
    action: string;
    rules: RuleWithInput[] | undefined;
    correlationId: string | undefined;
    metadata: ArcjetMetadata;
    onAllow: () => T;
    onDeny: (decision: DecisionDeny) => T;
    onUnavailable: (
      unavailable:
        | { kind: "threw"; error: unknown }
        | { kind: "failed-open"; decision: DecisionAllow },
    ) => T;
    onGuardError?: "allow" | "deny";
  },
): Promise<T>;
```

Behaviour, following `runGuarded`'s structure exactly where it applies:

1. `onGuardError` defaults to `"deny"`.
2. Build `correlation` as `correlationId === undefined ? {} : { correlationId }` — the field is optional under `exactOptionalPropertyTypes`, so assigning `undefined` is a type error.
3. Call `client.guard({ label: action, rules: rules ?? [], ...correlation, metadata })` inside a `try`. Always call it, including with no rules: an empty set still produces a decision, which is what keeps the call site reachable by policy configured outside the code.
4. On throw: if failing closed, warn, `captureEvent` with `outcome: "unavailable"`, return `onUnavailable({ kind: "threw", error })`. If failing open, warn and fall through to the allow tail.
5. Suppress `decision.id === ""` — a fail-open decision carries an empty id and `""` is not a correlatable value.
6. `if (decision.conclusion === "ALLOW" && decision.hasFailedOpen() && failClosed)` → warn, capture `"unavailable"`, `onUnavailable({ kind: "failed-open", decision })`. Keep the conjunction inside the single `if`: TypeScript cannot narrow on a method return, and hoisting the test into a `const` makes the `onUnavailable` argument fail to typecheck. Do not reach for a cast.
7. `if (decision.conclusion === "ALLOW" && decision.hasFailedOpen())` (the fail-open, `"allow"`-mode case) → warn, fall through.
8. `if (decision.conclusion === "DENY")` → capture `"denied"` with the `decisionId`, return `onDeny(decision)`.
9. Allow tail: capture `"allowed"` with the `decisionId`, return `onAllow()`.

Two differences from `runGuarded`, both deliberate and both worth a comment in the file:

- **There is no `execute`.** The allow tail returns immediately. Nothing here can produce `"success"` or `"error"`.
- **The allow outcome is `"allowed"`, not `"success"`.** A gate that passed has not done the thing. Reusing `"success"` would make "the tool ran" and "the tool was permitted to run" indistinguishable on the capture stream operators query — the same reasoning that keeps `"unavailable"` separate from `"denied"`.

Every capture goes through `captureEvent`, which swallows throws. Every `metadata` write is a fresh spread (`{ ...metadata, outcome: … }`) — never mutate the caller's object.

**Testing:** Tests must verify:
- **AC4.6:** both unavailable signals under `"deny"` reach `onUnavailable` with the right discriminant, capture exactly one event with `outcome: "unavailable"`, and never reach `onAllow` or `onDeny`. Use `stubClient(new Error("boom"))` for the threw signal and `stubClient(decisionFailOpenAllow())` for the failed-open signal. Assert both legs: on `threw`, `unavailable.kind === "threw"` and the error is the same object by reference; on `failed-open`, `unavailable.kind === "failed-open"` and `decision` is the stub by reference.
- **AC4.8:** exactly one capture per invocation across all five paths (allow, deny, threw-deny, failed-open-deny, and each `"allow"`-mode fall-through). Assert `captureCalls.length === 1` — not `>= 1` — and assert the `outcome` value from the recorded payload. Also assert no capture ever carries `outcome: "success"` or `"error"`.
- **AC4.8:** an empty `decision.id` produces a capture with **no** `decisionId` key (test with `in`), and a non-empty id produces one carrying it.
- **AC4.9:** a client whose `capture()` throws does not make `runGate` reject, on every path.
- The guard call always happens, including when `rules` is `undefined` and when it is `[]`, and the recorded payload carries `rules: []` in both cases.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
npm run lint --workspace @arcjet/guard
```

Expected: all pass. Lint in particular — `max-depth` and the constant-format-string rule are the two that bite here, and the extracted `warnUnavailable` helper in `runGuarded` exists because of them.

**Commit:** `feat(guard): add the Eve gate engine`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: `guardApproval`

**Verifies:** vercel-eve-namespace.AC4.1, AC4.2, AC4.3, AC4.4, AC4.5, AC4.7, AC4.9, AC4.10.

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/guard-approval.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/guard-approval.test.ts`
- Modify: `arcjet-guard/src/vercel-eve/v0/index.ts` (export `guardApproval` and `GuardApprovalPolicy`)

**Implementation:**

```ts
export interface GuardApprovalPolicy<TInput = Record<string, unknown>> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate, static or computed from the approval context. */
  rules?: RuleWithInput[] | ((ctx: ApprovalContext<TInput>) => RuleWithInput[]);
  /** Metadata merged over the session-derived context's. */
  metadata?: ArcjetMetadata | ((ctx: ApprovalContext<TInput>) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /** Status returned on ALLOW. Default `"not-applicable"`. */
  onAllow?: ApprovalStatus;
  /** Reshape the status returned on DENY. */
  onDeny?: (decision: DecisionDeny) => ApprovalStatus;
}

export function guardApproval<TInput = Record<string, unknown>>(
  client: ArcjetAgentClient,
  policy: GuardApprovalPolicy<TInput>,
): Approval<TInput>;
```

The returned function:

1. Derives the context with `eveAgentContext(ctx)` (Phase 2). `ApprovalContext` extends `SessionContext`, so it is passed straight through.
2. Resolves `rules` and `metadata` — each may be a function of `ctx`. Wrap both resolutions so a throwing callback becomes a fail-closed denial rather than a thrown approval (AC4.9). A callback that throws is a caller defect, and the safe reading of "I could not evaluate the policy" is the same as an unavailable guard: deny under the default, allow under `"allow"`, warn either way.
3. Adds `eve.phase: "approval"`, `eve.tool: ctx.toolName` and `eve.call: ctx.callId` to the metadata, then merges: derived context metadata ← policy metadata ← per-call function output. Guard the `toolName`/`callId` reads — they are declared non-optional but this is framework-supplied data.

   `eve.phase` is written **here**, not in `runGate`. `runGate` is shared with `guardInbound`, which writes `eve.phase: "inbound"` (Phase 4 Task 4), so the engine has no business knowing which phase it is serving. This is also why the `eve.phase: "approval"` clause of AC4.8 is asserted in `guard-approval.test.ts` and not in `gate.test.ts` — see the Testing section.
4. Calls `runGate` with:
   - `onAllow: () => policy.onAllow ?? "not-applicable"`
   - `onDeny: (decision) => policy.onDeny?.(decision) ?? { type: "denied", reason: deniedReason(decision) }`
   - `onUnavailable: () => failClosed ? { type: "denied", reason: unavailableReason() } : (policy.onAllow ?? "not-applicable")`
5. Wraps the whole body in a `try`/`catch` of last resort that returns the fail-closed or fail-open status per `onGuardError` and warns. Eve treats a throwing approval as a failed call, so there is no input for which throwing is the better outcome.

Reason strings come from `arcjet-guard/src/vercel-eve/v0/denial.ts` (created and tested by Phase 2 Task 1 — `deniedReason` and `unavailableReason`), which builds them on `retryAfterSeconds` from `src/agents/denial.ts`. Do not re-derive them here; the wording is asserted by `denial.test.ts` and is shared with `guardInbound`. For reference, the four strings are:

- DENY, `RATE_LIMIT`, hint available: `Arcjet denied this call (RATE_LIMIT). It may be retried after N seconds.`
- DENY, `RATE_LIMIT`, no hint: `… It may be retried later.`
- DENY, anything else: `Arcjet denied this call (REASON). Do not retry; explain the denial to the user or try a different approach.`
- Unavailable: `Arcjet security check could not be completed; please retry later.`

Keep the wording aligned with `vercel-ai/v7`'s `ArcjetDenialResult.message`, which a model may already have been prompted against. Where v7 says "tool call" and this covers connections too, "call" is the neutral term.

**Testing:** Tests must verify each AC listed above. Build `ApprovalContext` objects by hand — a local factory in the test file taking overrides is worth writing once, since every test needs one:
- **AC4.1:** ALLOW → the resolved value is exactly the string `"not-applicable"`. Assert the exact value rather than "any permissive status": `"approved"` would also let the call proceed, and the point of the criterion is that this helper reports no opinion about human approval rather than claiming one. A test that accepts either status pins nothing and would not notice the default flipping.
- **AC4.2:** `onAllow: "user-approval"` → ALLOW resolves to `"user-approval"`.
- **AC4.3:** DENY with `decisionDenyRateLimit(reset)` → `{ type: "denied" }` whose `reason` contains `RATE_LIMIT` and the computed seconds; DENY with `decisionDenyPromptInjection()` → `reason` contains `PROMPT_INJECTION` and no retry-after; DENY with `decisionDenyPromptInjectionWithReset(reset)` → still no retry-after, even though a co-occurring allowed rule carries a reset time.
- **AC4.4:** read the recorded guard payload with `recorded(guardCalls[0])` and assert `label === policy.action`, the rules array, `correlationId === session id`, and that metadata contains `eve.tool`, `eve.call`, the `eve.session`/`eve.turn` keys from Phase 2, and the policy's own keys. Assert merge order with a key present in all three sources.
- **AC4.8 (the `eve.phase` clause):** the capture payload carries `eve.phase: "approval"` on all three outcomes. This lives here rather than in `gate.test.ts` because `runGate` never writes `eve.phase` — it is shared with `guardInbound`, which writes `"inbound"`. Asserting it in the engine's test would either fail or force the engine to know its caller.
- **AC4.5:** a `rules` function receives the `ApprovalContext` (assert it can read `ctx.toolInput` and `ctx.session.id`) and its output reaches the guard call.
- **AC4.7:** under `onGuardError: "allow"`, both signals resolve to `"not-applicable"`, and with `ARCJET_LOG_LEVEL=warn` the warning **matches `/fail(ing|ed) open/`**. Under the default, it does **not** match that pattern and does identify the signal. Assert both directions.

  Match the pattern, not the literal `"failing open"`. `src/agents/guarded.ts`'s `warnUnavailable` (around line 146) already distinguishes all four cases correctly, and the two fail-open strings are phrased differently:

  | signal | mode | string |
  |---|---|---|
  | threw | closed | `errored; failing closed:` |
  | threw | open | `errored; failing open:` |
  | failed-open | closed | `was unavailable; failing closed.` |
  | failed-open | open | `failed open (API error).` |

  That last one says **failed** open, so a literal `"failing open"` assertion fails against it. This is a behaviour to **preserve** in the new engine, not a defect to fix in the old one — do not "correct" those strings, and do not weaken the criterion to "emits some warning" either. If `runGate` chooses to phrase both legs as "failing open" for its own consistency, that is fine and the pattern still matches; note the divergence from `runGuarded` in a comment.
- **AC4.9:** four sub-cases, each asserting the returned promise resolves rather than rejects — a context with `session` absent, a `rules` callback that throws, a `metadata` callback that throws, and `stubClient(new Error(...))`. For the first, assert the guard call still happened with no `correlationId` key (or a generated one per AC3.3) rather than crashing.
- **AC4.10:** `onDeny` is called once with the `DecisionDeny` (assert by reference) and its return value is what resolves; and `onDeny` is **not** called on either unavailable signal — assert a call counter of `0`, not merely that the result differs.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
npm run lint --workspace @arcjet/guard
```

**Commit:** `feat(guard): add guardApproval for Eve tools and connections`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_TASK_3 -->
### Task 3: Prove the gate is assignable to all three Eve slots

**Verifies:** vercel-eve-namespace.AC4.1 (the assignability claim the whole design rests on).

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/assignability.test.ts`

**Implementation:**

The design's central claim is that one helper covers authored tools, OpenAPI connections and MCP connections. That claim is type-level, so a type-level test is the right instrument — and it is worth its own file because it is the assertion that would silently rot when Eve's minor version moves.

**Testing:** a compile-time-only test (no runtime assertions needed beyond a trivial one so `node --test` sees a test) asserting that the value returned by `guardApproval(client, { action: "x" })` is assignable to:

- `ToolDefinition<TInput, TOutput>["approval"]` (via `import type { ToolDefinition } from "eve/tools"`)
- `OpenAPIConnectionDefinition["approval"]` (via `import type { OpenAPIConnectionDefinition } from "eve/connections"`)
- `McpClientConnectionDefinition["approval"]` (same module)

Do this with typed `const` declarations rather than casts — a cast would make the test pass regardless, which defeats it:

```ts
import type { ToolDefinition } from "eve/tools";
import type {
  McpClientConnectionDefinition,
  OpenAPIConnectionDefinition,
} from "eve/connections";

const forTool: NonNullable<ToolDefinition<{ id: string }, unknown>["approval"]> =
  guardApproval(client, { action: "thing.read" });
const forOpenAPI: NonNullable<OpenAPIConnectionDefinition["approval"]> =
  guardApproval(client, { action: "thing.read" });
const forMcp: NonNullable<McpClientConnectionDefinition["approval"]> =
  guardApproval(client, { action: "thing.read" });
void [forTool, forOpenAPI, forMcp];
```

Verify the exact exported type names against the installed typings before writing this — read `node_modules/eve/dist/src/public/connections/index.d.ts` and `.../public/definitions/connections/openapi.d.ts`. Both are re-exported from `eve/connections`; do not import from a deep `#`-prefixed internal path, which will not resolve for a consumer.

Note the variance direction: a tool's `approval` is `Approval<ApprovalContextInput<TInput>>` while a connection's is the unparameterised `Approval`. If the generic default makes the tool case fail to assign, the fix is the signature's default type parameter, not a cast in the test.

**Verification:**

```bash
npm run typecheck --workspace @arcjet/guard
npm run test-unit --workspace @arcjet/guard
```

Expected: the typecheck is the real assertion. If any of the three `const` declarations fails to compile, `guardApproval`'s signature is wrong for that slot and the design's coverage claim is overstated — surface that rather than casting past it.

**Commit:** `test(guard): assert guardApproval is assignable to Eve's three approval slots`
<!-- END_TASK_3 -->

---

## Phase 3 done when

- `runGate` satisfies AC4.6 and AC4.8's outcome/exactly-one-capture clauses, plus the never-throws contract, with exactly-one-capture asserted on every path.
- `guardApproval` satisfies AC4.1–AC4.5, AC4.7, AC4.9, AC4.10, and AC4.8's `eve.phase: "approval"` clause.
- `runGate` writes no `eve.phase` of its own — that key belongs to each caller.
- The assignability test compiles against the installed `eve` typings for all three slots.
- No capture emitted by this phase carries `outcome: "success"` or `"error"`.
- The warning strings distinguish fail-closed from fail-open, asserted in both directions.
- `guardApproval` carries a JSDoc `@example`, mirroring `src/vercel-ai/v7/`. Show it on a connection's `approval`, which is the shape with no AI SDK analogue. Its *compilation* is verified in Phase 6 Task 6, which extracts every `@example` in the namespace and compares the count against the export count — it cannot be checked here, because the helper is not on the barrel until Phase 5 and the extraction target `examples/eve-agent` does not exist until Phase 6. Do not sign this off by eyeball as "compiles".
- Build, both typechecks, lint and unit tests with coverage pass.
