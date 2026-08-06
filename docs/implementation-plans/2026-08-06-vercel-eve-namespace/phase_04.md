# Vercel Eve Namespace Implementation Plan — Phase 4: `guardTool` and `guardInbound`

**Goal:** The authored-tool wrapper (which, unlike the approval gate, can observe execution) and the channel-boundary screen (the only place Eve lets a turn be declined before it starts).

**Architecture:** `guardTool` wraps an already-branded `ToolDefinition`'s `execute` and reuses the agnostic `runGuarded` engine, because here there genuinely is something to execute. It must return a copy that preserves both of Eve's stamped symbols, one of which is non-enumerable and would be lost to an object spread. `guardInbound` is a plain async call for a channel handler: it screens text, returns a verdict the handler can turn into user-facing copy, and never throws.

**Tech Stack:** TypeScript 7, `node --test`, oxlint. Eve types via `import type` only.

**Scope:** Phase 4 of 8 from `docs/design-plans/2026-08-06-vercel-eve-namespace.md`.

**Codebase verified:** 2026-08-06

---

## Acceptance Criteria Coverage

This phase implements and tests:

### vercel-eve-namespace.AC5: `guardTool` wraps an authored tool, and `guardInbound` screens the channel
- **vercel-eve-namespace.AC5.1 Success:** `guardTool(client, tool, policy)` returns a definition that still carries Eve's tool brand (`Symbol.for("eve:tool-brand")`) **and** its definition-source key (`Symbol.for("eve.definition-source-key")`). The brand is enumerable and the source key is not, so a plain object spread silently drops the second one and breaks `toolResultFrom` matching in channel handlers. Both are asserted, including the source key's `enumerable: false` descriptor.
- **vercel-eve-namespace.AC5.2 Success:** The input definition is not mutated: `guardTool` returns a new object and the original's `execute` is unchanged by reference.
- **vercel-eve-namespace.AC5.3 Success:** On ALLOW the original `execute` runs with the same `(input, ctx)` it would have received, its result is returned unchanged, and the outcome is captured (`"success"`, or `"error"` with the original error rethrown unchanged).
- **vercel-eve-namespace.AC5.4 Failure:** On DENY, `execute` never runs. What the model receives is governed by `policy.onDeny`; the default throws `ArcjetDeniedError`, which Eve projects as a failed `action.result`. On either guard-unavailable signal under the default `onGuardError: "deny"`, `execute` also never runs and `ArcjetGuardUnavailableError` is thrown, with both discriminant legs distinguishable — `.cause` set and `.decision` reading `undefined` when the guard call threw, `.decision` set and `.cause` reading `undefined` when a decision failed open. Returning a denial *object* is not the default because an authored tool may declare an `outputSchema` that the object would violate — a `guardTool` that silently breaks a tool's declared contract is worse than a clean failure. A task in Phase 4 establishes empirically whether Eve validates tool output against `outputSchema`; if it does not, `policy.onDeny: "result"` becomes available as an opt-in.
- **vercel-eve-namespace.AC5.5 Success:** `guardTool` refuses to wrap a tool with no `execute` function, naming the problem.
- **vercel-eve-namespace.AC5.6 Success:** `guardInbound(client, text, options)` returns `{ allowed: true }` on ALLOW and, on DENY, `{ allowed: false, reason: "DENY", decision, message }` where `message` is a caller-presentable explanation and `decision` is the real decision so the caller can classify it further with a rule's own `results()`.
- **vercel-eve-namespace.AC5.7 Failure:** `guardInbound` maps both guard-unavailable signals to `{ allowed: false, reason: "UNAVAILABLE" }` under the default `onGuardError: "deny"`, and to `{ allowed: true }` with a gated warning matching `/fail(ing|ed) open/` under `"allow"` (see AC4.7 on why the phrasing is an alternation). This is the one helper whose `"allow"` mode is expected to see real use: a channel that fails closed on an Arcjet outage stops answering entirely.
- **vercel-eve-namespace.AC5.8 Success:** `guardInbound` never throws, and captures one event with `outcome` matching the verdict and metadata `eve.phase: "inbound"`.
- **vercel-eve-namespace.AC5.9 Success:** `guardInbound` accepts an explicit `correlationId` and uses it on both the guard and the capture payload. With it omitted, **no** id is generated and neither payload carries the key — an id nobody else knows looks like a correlation and joins to nothing. The channel boundary runs before a session exists, so there is no session id to derive from; the caller passes the identity it has (a thread or continuation token). AC6.3 is what makes the two halves joinable.

---

## Context an engineer needs before starting

### Eve's two stamped symbols

`defineTool` in `node_modules/eve/dist/src/public/definitions/tool.js` does exactly two things to the object it is given, then returns **the same object**:

```js
Object.assign(e, { [TOOL_BRAND]: true });          // TOOL_BRAND = Symbol.for("eve:tool-brand")
stampDefinitionKey(e, `tool:${e.description}`);     // Object.defineProperty(t, DEFINITION_KEY, { configurable: true, value: n })
```

The consequences that decide `guardTool`'s implementation:

- `TOOL_BRAND` is set by `Object.assign`, so it is an **enumerable own symbol property**. `{ ...tool }` copies it.
- `DEFINITION_KEY` (`Symbol.for("eve.definition-source-key")`) is set by `Object.defineProperty` with only `configurable: true`, so it is **non-enumerable**. `{ ...tool }` does **not** copy it.
- `DEFINITION_KEY` is what `toolResultFrom` (from `eve/tools`) reads to match a tool result back to its definition in a channel handler. Losing it does not fail loudly: `toolResultFrom` returns `undefined` and the handler quietly stops matching.

So the copy must be built from property descriptors:

```ts
const wrapped = Object.defineProperties(
  {},
  Object.getOwnPropertyDescriptors(tool),
) as typeof tool;
// then override execute
```

Verify the symbol *names* against the installed package before relying on them — they are `Symbol.for(...)` registry symbols, so a test can look them up by name without importing Eve, which is exactly what keeps AC5.1 testable under the type-only rule.

### Eve does not AST-transform authored tool files

`internal/workflow-bundle/dynamic-tool-transform.js` hoists inline `execute` functions to module-scope step functions, but its documented scope is **dynamic** tool files (`defineDynamic`), and it returns null for anything else. Authored static tools in `agent/tools/*.ts` are executed by the harness (`harness/tools.js` → `wrapToolExecute`), which reads `execute` off the definition at runtime. That is why wrapping `execute` is viable at all — and it is also why the plan does not attempt to guard `defineDynamic` tools in this phase (their `execute` is hoisted by a compiler pass that would not see through a wrapper). Note that limitation in the skill.

### Other reading

- `arcjet-guard/src/agents/guarded.ts` — `runGuarded`, reused here unchanged.
- `arcjet-guard/src/agents/guard-action.ts` — `ArcjetDeniedError`, `ArcjetGuardUnavailableError`, `OnGuardError`.
- `arcjet-guard/src/vercel-eve/v0/gate.ts` from Phase 3, and `arcjet-guard/src/vercel-eve/v0/denial.ts` from Phase 2 Task 1.
- The toto Slack channel at `../arcjet/apps/toto/agent/channels/slack.ts` — the hand-rolled version of `guardInbound`. Read it: `guardInbound`'s shape is derived from what that code actually needed (a DENY-vs-unavailable distinction, a presentable message per reason, and a `decision` it can classify further with each rule's own `results()`), and Phase 7 deletes it.

---

<!-- START_TASK_1 -->
### Task 1: Establish whether Eve validates tool output against `outputSchema`

**Verifies:** None (investigation) — its outcome decides one line of AC5.4's implementation.

**Files:** None (findings recorded in the phase summary and, if the answer is "no", a follow-up task).

**Why:** `guardTool`'s denial has to reach the model somehow. `vercel-ai/v7` returns an `ArcjetDenialResult` object as the tool's result, which works there because v7's tools rarely declare an output schema and the SDK does not enforce one. In Eve, an authored tool may declare `outputSchema`, and `harness/tools.js` forwards it verbatim to the AI SDK's `tool()`:

```js
tool({ description, execute: wrapToolExecute(s), inputSchema: s.inputSchema, outputSchema: s.outputSchema, ... })
```

If the SDK validates the returned value against that schema, a denial object would be rejected as a malformed tool result — turning a clean "denied" into a confusing schema error. If it does not validate, returning the object is available as an opt-in.

**Step 1: Read the AI SDK's tool-execution path**

In the installed `ai@7`, find where a locally-executed tool's return value is handled and whether `outputSchema` is applied to it. Start from `node_modules/ai/dist/index.d.ts` for `outputSchema`'s documented role, then the tool-call execution in the compiled output.

**Step 2: Test it empirically**

Write a scratch script outside the repo (use the scratchpad, not `arcjet-guard/`): a `generateText` call with a mock language model and one tool declaring a strict `outputSchema`, whose `execute` returns a value that violates it. Observe whether the call rejects, whether the tool result is marked an error, or whether it passes through.

**Step 3: Record and decide**

- If output **is** validated: the default (throw `ArcjetDeniedError`) is the only safe denial, and `policy.onDeny: "result"` is not offered. Say so explicitly in the JSDoc and the skill.
- If output is **not** validated: keep the throwing default (it is still the right default — a tool that declares an output contract should not silently return something else), and add `policy.onDeny: "result"` as a documented opt-in for tools with no `outputSchema`. Create a follow-up task in this phase for it.

Either way, record the finding with the file and line you read it from. Do not carry this question into Task 2 unresolved.
<!-- END_TASK_1 -->

<!-- START_SUBCOMPONENT_A (tasks 2-3) -->
<!-- START_TASK_2 -->
### Task 2: `guardTool`

**Verifies:** vercel-eve-namespace.AC5.1, AC5.2, AC5.3, AC5.4, AC5.5.

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/guard-tool.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/guard-tool.test.ts`
- Modify: `arcjet-guard/src/vercel-eve/v0/index.ts`

**Implementation:**

```ts
export interface GuardToolPolicy<TInput> {
  action: string;
  rules?: RuleWithInput[] | ((input: TInput) => RuleWithInput[]);
  metadata?: ArcjetMetadata | ((input: TInput) => ArcjetMetadata);
  onGuardError?: OnGuardError;
  /** Reshape what a denial does. Defaults to throwing `ArcjetDeniedError`. */
  onDeny?: (decision: DecisionDeny) => never | unknown;
}

export function guardTool<TInput, TOutput>(
  client: ArcjetAgentClient,
  tool: ToolDefinition<TInput, TOutput>,
  policy: GuardToolPolicy<TInput>,
): ToolDefinition<TInput, TOutput>;
```

Body:

1. Reject a tool whose `execute` is not a function, with a message naming the problem and the helper: `@arcjet/guard: guardTool() requires a tool with an execute function`. Match v7's wording and its `Error` (not `TypeError`) choice, and carry v7's `oxlint-disable-next-line unicorn/prefer-type-error` comment for the same reason.
2. Bind the original: `const originalExecute = tool.execute.bind(tool);`
3. Build the descriptor-preserving copy (see Context above) and override `execute` on it. Do **not** mutate `tool`.
4. The replacement `execute(input, ctx)`:
   - derives the context with `eveAgentContext(ctx)` — `ToolContext` extends `SessionContext`;
   - resolves `rules` and `metadata` from `input`;
   - adds `eve.tool: ctx.toolName` and `eve.call: ctx.callId`;
   - calls the agnostic `runGuarded` with `execute: () => originalExecute(input, ctx)`, `onDeny` defaulting to a throw of `ArcjetDeniedError`, and `onUnavailable` throwing `ArcjetGuardUnavailableError` with the right discriminant (`{ cause }` for threw, `{ decision }` for failed-open) — the same shapes `guardAction` uses, so a handler that already knows one knows both.

Unlike `guardApproval`, this helper **may** throw: that is how a denial reaches Eve, which projects a thrown tool error as `action.result` with `status: "failed"` and an `ActionResultError`. Say so in the JSDoc, next to the note that the approval gate is the better surface when the tool declares an `outputSchema` or comes from a connection.

**Testing:** Tests must verify each AC listed above:
- **AC5.1:** the returned object has `Symbol.for("eve:tool-brand") === true` and `Symbol.for("eve.definition-source-key")` present with the same value as the input's. Assert the source key's descriptor with `Object.getOwnPropertyDescriptor(...).enumerable === false`. Then assert the negative control in the same test: `Symbol.for("eve.definition-source-key") in { ...tool }` is `false`. Without that control the test passes against a spread implementation on any Node where the descriptor happens to differ, and the control is what documents *why* the descriptor copy exists.
- **AC5.2:** the returned object is not `tool` (`!==`), `tool.execute` is still the original function by reference after wrapping, and the input's own keys are unchanged.
- **AC5.3:** ALLOW → `execute` called exactly once with the same `input` and `ctx` objects by reference; the result returned unchanged (use a non-primitive so identity is checkable); one capture with `outcome: "success"`. Then a throwing `execute` → one capture with `outcome: "error"` and the original error rethrown **by reference**.
- **AC5.4:** DENY → `execute` call count is `0`, and the returned promise rejects with `ArcjetDeniedError` whose `.decision` is the stub decision by reference. Then `policy.onDeny` supplied → its return value resolves instead, and it is not called on either unavailable signal.
- **AC5.4:** unavailable under the default → `execute` not called, rejects with `ArcjetGuardUnavailableError`, capture `outcome: "unavailable"`. Assert both legs of the discriminant as the v7/`guardAction` tests do: on the threw path `.cause` is the thrown error by reference **and** `.decision === undefined`; on the failed-open path `.decision` is the decision **and** `.cause === undefined`. Test `decision` with `=== undefined`, not `in` — it is a declared optional field and therefore an own property on both paths.
- **AC5.5:** a definition with `execute: undefined` and one with `execute: "nope"` both throw at wrap time, with the message naming `execute`.

  Note the typing friction, which the v7 equivalent does not have: Eve's `ToolDefinition.execute` is **required** (`dist/src/public/definitions/tool.d.ts`, around line 100), whereas `ai`'s `Tool.execute` is optional. So neither fixture is assignable to `ToolDefinition` and the test cannot simply pass one in. Build the fixture as a plain object and assert past the parameter type at the call site — a single narrowly-scoped cast in the **test**, with a comment saying the runtime check exists for JavaScript callers and for a definition that lost its `execute` through some other transform. Do not weaken `guardTool`'s parameter type to accommodate the test; the guard is a runtime backstop, not a type-level one.

Build tool definitions in tests as plain objects with the two symbols stamped by hand (`Object.assign` for the brand, `Object.defineProperty` for the source key) — this is the only faithful way to test the descriptor behaviour without importing `eve`, and it doubles as documentation of what `defineTool` does.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
npm run lint --workspace @arcjet/guard
```

**Commit:** `feat(guard): add guardTool for authored Eve tools`
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Add `onDeny: "result"` if Task 1 established output is not validated

**Verifies:** vercel-eve-namespace.AC5.4 (the opt-in half).

**Files:**
- Modify: `arcjet-guard/src/vercel-eve/v0/guard-tool.ts`
- Modify: `arcjet-guard/src/vercel-eve/v0/guard-tool.test.ts`
- Modify: `arcjet-guard/src/vercel-eve/v0/denial.ts` (created by Phase 2 Task 1) — add the `ArcjetDenialResult` interface and the `UNAVAILABLE_RETRY_AFTER_SECONDS` constant
- Modify: `arcjet-guard/src/vercel-eve/v0/denial.test.ts`

**Conditional task.** Execute only if Task 1 found that the AI SDK does not validate a locally-executed tool's return value against `outputSchema`. If it does validate, skip this task, record why in the phase summary, and make sure the JSDoc says the throwing denial is the only option and names the reason.

**Implementation:** widen `policy.onDeny` to accept the literal `"result"` alongside a function. With `"result"`, a denial resolves to the same `ArcjetDenialResult` shape `vercel-ai/v7` returns — import the type from `../../vercel-ai/v7/guard-tool.ts`? **No**: that would put `ai` in this namespace's import graph, which AC2.1 forbids. Add the interface to the existing `src/vercel-eve/v0/denial.ts`, with a comment that it is intentionally structurally identical to v7's so a model prompted for one reads the other. Two declarations of a four-field interface in two namespaces is the cheaper of the two costs here.

Add `UNAVAILABLE_RETRY_AFTER_SECONDS = 5` to the same file at the same time. Phase 2 deliberately left it out because nothing consumed it — this task is its first consumer, since the unavailable-path `ArcjetDenialResult` needs a `retryAfterSeconds` and `unavailableReason()` alone carries no number. It is duplicated from v7's `guard-tool.ts` rather than shared: v7's copy is a module-local `const` in a file that imports `ai`, and reaching it would put `ai` in this import graph. Note that in a comment so the duplication reads as deliberate.

**Testing:** `onDeny: "result"` → the promise resolves (does not reject) to an object with `arcjetDenied: true`, the decision's `reason`, a `message`, `retryable` true only for `RATE_LIMIT`, and `retryAfterSeconds` present only for a rate-limit denial with a reset time. Add a test asserting the JSDoc's warning case is not enforced in code — i.e. `"result"` works even when the tool declares an `outputSchema`, because the guardrail is documentation, not validation. State that explicitly so nobody later "fixes" it into a throw.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
```

**Commit:** `feat(guard): allow guardTool denials to surface as a tool result`
<!-- END_TASK_3 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_TASK_4 -->
### Task 4: `guardInbound`

**Verifies:** vercel-eve-namespace.AC5.6, AC5.7, AC5.8, AC5.9.

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/guard-inbound.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/guard-inbound.test.ts`
- Modify: `arcjet-guard/src/vercel-eve/v0/index.ts`

**Implementation:**

```ts
export interface GuardInboundOptions {
  /** Rules to evaluate against the inbound text. */
  rules: RuleWithInput[];
  /**
   * Guard label and capture action. Defaults to `"message.received"`.
   */
  action?: string;
  /**
   * Correlation id for this screening. A channel handler runs before Eve
   * creates the session, so there is no session id to derive from — pass the
   * identity the channel has (a thread timestamp, a continuation token, a
   * delivery id). `arcjetHooks` emits a join record at `session.started` that
   * ties this id to the session id.
   */
  correlationId?: string;
  metadata?: ArcjetMetadata;
  /** Default `"deny"`. */
  onGuardError?: OnGuardError;
}

export type InboundVerdict =
  | { allowed: true }
  | {
      allowed: false;
      reason: "DENY" | "UNAVAILABLE";
      message: string;
      decision?: Decision;
    };

export function guardInbound(
  client: ArcjetAgentClient,
  text: string,
  options: GuardInboundOptions,
): Promise<InboundVerdict>;
```

Body: resolve the action (default `"message.received"`), build metadata with `eve.phase: "inbound"` merged under the caller's — written here, not in `runGate`, which stays phase-agnostic because `guardApproval` writes `"approval"` through the same engine — and call `runGate` from Phase 3 with `onAllow`, `onDeny` and `onUnavailable` mapping to the three verdict shapes. Wrap in a last-resort `try`/`catch` returning the fail-closed or fail-open verdict per `onGuardError`.

`rules` is **required** here, unlike every other helper. The other helpers keep the guard call reachable by remotely-configured policy even with no local rules; a channel screen with no rules is a round trip that can only ever return `{ allowed: true }`, and making the caller pass rules is what stops a screen that screens nothing from looking installed. Note this asymmetry in the JSDoc — a reader who has just used `guardApproval` will expect it to be optional.

`text` is not inspected by this helper: the caller builds the rules (`detectPromptInjection()(text)`, `localDetectSensitiveInfo()(text)`) and passes the same text. Keeping the parameter makes the call site read correctly and gives the helper something to attribute in metadata if that is ever wanted — but do **not** put the text in metadata. It is user content, `localDetectSensitiveInfo` exists precisely to keep it out of places it should not go, and metadata is not one of those places.

**Testing:** Tests must verify each AC listed above:
- **AC5.6:** ALLOW → exactly `{ allowed: true }` (assert the whole object with `deepEqual`, so a stray field fails). DENY → `allowed: false`, `reason: "DENY"`, `decision` the stub by reference, and a `message` that names the denying reason. Assert that the caller can classify further: given `decisionDenyPromptInjection()`, `verdict.decision` is present so a rule's own `results()` could be applied to it — this is what replaces toto's `denialReason()` helper.
- **AC5.7:** both unavailable signals under the default → `reason: "UNAVAILABLE"`, and under `"allow"` → `{ allowed: true }` with a warning matching `/fail(ing|ed) open/` at `ARCJET_LOG_LEVEL=warn`. Match the pattern, not the literal `"failing open"` — `src/agents/guarded.ts` phrases the two fail-open legs differently ("errored; failing open:" vs "failed open (API error)."), and Phase 3 Task 2's AC4.7 note explains why. Assert the warning is silent with the level unset.
- **AC5.8:** never throws — a rejecting `guard()`, a throwing `capture()`, and a `rules` array containing a value the client rejects all resolve to a verdict. One capture per call, with `outcome` `"allowed"`/`"denied"`/`"unavailable"` matching the verdict and metadata carrying `eve.phase: "inbound"`.
- **AC5.9:** the supplied `correlationId` appears on both the guard payload and the capture payload; with it omitted, neither payload carries a `correlationId` key (test with `in`). Do **not** generate a ULID here: an id nobody else knows is worse than no id, because it looks like a correlation and joins to nothing.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
npm run lint --workspace @arcjet/guard
```

**Commit:** `feat(guard): add guardInbound for Eve channel handlers`
<!-- END_TASK_4 -->

---

## Phase 4 done when

- Task 1's finding about `outputSchema` validation is recorded with its source, and Task 3 was either done or skipped for that stated reason.
- `guardTool` satisfies AC5.1–AC5.5, including the spread negative control and both legs of the unavailable discriminant.
- `guardInbound` satisfies AC5.6–AC5.9, including the no-generated-correlation-id rule.
- No inbound text reaches metadata.
- `guardTool` and `guardInbound` each carry a JSDoc `@example`, mirroring `src/vercel-ai/v7/`. `guardInbound`'s should show the channel-handler shape, since that is where its explicit `correlationId` earns its keep. Their *compilation* is verified in Phase 6 Task 6, which extracts every `@example` in the namespace and compares the count against the export count — it cannot be checked here, because the helpers are not on the barrel until Phase 5 and the extraction target `examples/eve-agent` does not exist until Phase 6. Do not sign this off by eyeball as "compiles".
- Build, both typechecks, lint and unit tests with coverage pass.
