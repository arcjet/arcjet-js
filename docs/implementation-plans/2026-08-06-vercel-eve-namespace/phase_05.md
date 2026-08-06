# Vercel Eve Namespace Implementation Plan — Phase 5: `arcjetHooks` and the barrel

**Goal:** Execution outcomes and the channel-to-session join reach the Sequence without per-call-site wiring, and the namespace's public surface is final.

**Architecture:** Eve's hooks subscribe to runtime stream events and are documented observe-only — their handlers return `void | Promise<void>` and cannot reject a turn or inject model context. That makes them useless for enforcement and exactly right for capture: `action.result` carries every tool call's outcome, `session.started` is where the channel's correlation id can be tied to the session's, and the `subagent.*` events make a delegated Sequence reachable from its parent.

**Tech Stack:** TypeScript 7, `node --test`, oxlint. Eve types via `import type` only.

**Scope:** Phase 5 of 8 from `docs/design-plans/2026-08-06-vercel-eve-namespace.md`.

**Codebase verified:** 2026-08-06

---

## Acceptance Criteria Coverage

This phase implements and tests:

### vercel-eve-namespace.AC1: The subpath resolves as specified
- **vercel-eve-namespace.AC1.1 Success:** `import { guardApproval, guardInbound, guardTool, arcjetHooks, eveAgentContext } from "@arcjet/guard/vercel-eve/v0"` resolves.
- **vercel-eve-namespace.AC1.2 Success:** The namespace re-exports the agnostic layer, and each proxied export is the *same function identity* as the one `@arcjet/guard/vercel-ai/v7` exports. Both namespaces proxy one implementation; two identities would mean a second copy to keep in sync.

### vercel-eve-namespace.AC6: `arcjetHooks` captures the lifecycle
- **vercel-eve-namespace.AC6.1 Success:** `arcjetHooks(client, options?)` returns a `HookDefinition` whose `events` map is accepted by `defineHook` without a type error, and which contains only keys present in Eve's `HookEventMap`.
- **vercel-eve-namespace.AC6.2 Success:** An `action.result` event captures one event whose `outcome` is `"success"` for `status: "completed"`, `"error"` for `"failed"`, and `"denied"` for `"rejected"`, correlated by the session-derived correlation id and carrying `eve.phase: "result"`.
- **vercel-eve-namespace.AC6.3 Success:** A `session.started` event captures a join record carrying the session id and, when the hook context exposes one, `eve.continuation-token` and `eve.channel`. This is what lets a `guardInbound` decision correlated by thread token be joined to the in-session decisions correlated by session id.
- **vercel-eve-namespace.AC6.4 Success:** `subagent.called` captures a delegation record carrying the child session id, so a subagent's own Sequence can be reached from the parent's. `subagent.completed` captures a completion record carrying `callId` and `subagentName` **only** — its payload is `{ callId, output, subagentName }` and has no `childSessionId`, so the two events are joined to each other by call id rather than both naming the child session. (`output` is model-visible text and is never captured.)
- **vercel-eve-namespace.AC6.5 Edge:** Every handler is side-effect-only and never throws — including when the client's `capture()` throws and when an event's `data` is missing fields the handler reads. Eve's hooks are documented as observe-only; a throwing hook is a defect.
- **vercel-eve-namespace.AC6.6 Success:** `options.events` selects which event families are captured (`"session"`, `"turn"`, `"tool"`, `"subagent"`), defaulting to all four. An agent that runs long conversations must be able to bound capture volume.

---

## Context an engineer needs before starting

### The hook contract

From `node_modules/eve/dist/src/public/definitions/hook.d.ts`:

```ts
interface HookContext extends SessionContext {
  readonly agent: { readonly name: string; readonly nodeId?: string };
  readonly channel: { readonly kind?: string; readonly continuationToken?: string };
}

type StreamEventHook<TEvent> = (event: TEvent, ctx: HookContext) => void | Promise<void>;

interface HookDefinition<TKey extends HookEventKey = HookEventKey> {
  readonly events?: StreamEventHooks<TKey>;
}

declare function defineHook<const T extends HookDefinition>(
  definition: ExactDefinition<T, HookDefinition>,
): HookDefinition<DefinedHookEventKeys<T>>;
```

`HookContext` is the only context that exposes `channel.continuationToken` and `agent.name` — a `ToolContext` has neither. That asymmetry is why the join record lives here and not in `eveAgentContext`.

`defineHook` is an identity-with-types helper (it returns its argument unchanged), so `arcjetHooks` returns a plain `HookDefinition` and the author wraps it. Under the type-only rule we cannot call `defineHook` ourselves.

`ExactDefinition<T, HookDefinition>` rejects keys outside `events`, so the returned object must contain **only** `events`.

### Event payloads to read (from `protocol/message.d.ts`)

| Event | `data` fields this phase reads |
|---|---|
| `session.started` | `invocation?` (subagent lineage), `runtime?` |
| `turn.started` | `turnId`, `sequence` |
| `turn.completed` / `turn.failed` | `turnId`, `sequence` (verify `turn.failed`'s shape against the installed typings) |
| `action.result` | `status: "completed" \| "failed" \| "rejected"`, `error?: { code, message }`, `result`, `turnId`, `stepIndex`, `sequence` |
| `subagent.called` | `callId`, `childSessionId`, `sessionId`, `name`, `toolName`, `turnId`, `workflowId` |
| `subagent.completed` | `callId`, `subagentName`, `output` — **no `childSessionId`**; this asymmetry is real and AC6.4 accounts for it |

**`action.result` does not carry a tool name.** `subagent.called` does; `action.result` carries the `result` (a `RuntimeActionResult`) and the lifecycle ids. The tool name has to be read out of `result` if it is there at all — check `runtime/actions/types.d.ts` for `RuntimeToolResultActionResult` and confirm before assuming. If it is not available, capture without it and say so in the JSDoc rather than reaching into an internal type path; the `eve.call` id already correlates the result to the gate event that `guardApproval` emitted for the same call, which is the join that matters.

**Do not put `output` or `result` payloads in metadata.** They are model-visible tool output and may contain anything the tool returned. Capture the outcome and the ids.

### Other reading

- `arcjet-guard/src/agents/capture.ts` — `captureEvent` (swallows throws).
- `arcjet-guard/src/vercel-eve/v0/context.ts` — `eveAgentContext`, which `HookContext` satisfies.
- `arcjet-guard/src/vercel-ai/v7/index.ts` — the barrel this phase's barrel mirrors, including the JSDoc `@example` convention.

---

<!-- START_SUBCOMPONENT_A (tasks 1-3) -->
<!-- START_TASK_1 -->
### Task 1: Verify the event payload shapes against the installed typings

**Verifies:** None (investigation feeding Task 2).

**Files:** None.

**Step 1:** Read `node_modules/eve/dist/src/protocol/message.d.ts` and confirm, for each event in the table above, the exact `data` field names and optionality. The table was built from `eve@0.30.8`, and `0.31.0` shipped before this plan was executed — confirm against whatever Phase 1 pinned and record any delta.

Pay particular attention to `subagent.completed`: on 0.30.8 its payload is `{ callId, output, subagentName }` with **no** `childSessionId`, which is why AC6.4 treats the two subagent events asymmetrically. If a later version adds one, that is a criterion change to surface, not a silent improvement to absorb.

**Step 2:** Establish whether a tool name is reachable from `action.result`. Read `RuntimeActionResult` and `RuntimeToolResultActionResult` in `node_modules/eve/dist/src/runtime/actions/types.d.ts`. Record whether the type is re-exported from a public entry point (`eve`, `eve/tools`, `eve/hooks`) — if it is only reachable through a `#`-prefixed internal specifier, it is **not** usable, because those do not resolve for a consumer and importing one would be a private-path dependency.

**Step 3:** Confirm `turn.failed` and `session.failed` payload shapes, which the table does not pin.

**Step 4:** Record the findings. If any field the design assumed is absent, adjust Task 2's scope and say so in the phase summary rather than capturing `undefined` under a key.
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: `arcjetHooks`

**Verifies:** vercel-eve-namespace.AC6.1, AC6.2, AC6.3, AC6.4, AC6.5, AC6.6.

**Files:**
- Create: `arcjet-guard/src/vercel-eve/v0/hooks.ts`
- Create: `arcjet-guard/src/vercel-eve/v0/hooks.test.ts`

**Implementation:**

```ts
export type ArcjetHookFamily = "session" | "turn" | "tool" | "subagent";

export interface ArcjetHooksOptions {
  /**
   * Which event families to capture. Defaults to all four. A long
   * conversation emits one event per tool call plus one per turn, so a chatty
   * agent may want `["session", "tool"]`.
   */
  events?: ReadonlyArray<ArcjetHookFamily>;
}

export function arcjetHooks(
  client: ArcjetAgentClient,
  options?: ArcjetHooksOptions,
): HookDefinition;
```

Build the `events` map conditionally from the selected families and return `{ events }` — and nothing else, because `ExactDefinition` rejects extra keys.

Handlers, all of them side-effect-only:

- **`session.started`** (family `session`) — the join record. `captureEvent` with `action: "eve.session-started"`, the session-derived `correlationId`, and metadata: the `eve.*` keys from `eveAgentContext`, plus `eve.continuation-token` from `ctx.channel.continuationToken` and `eve.channel` from `ctx.channel.kind` when present, plus `eve.agent` from `ctx.agent.name`. Omit any key whose source is absent. This one record is what joins a `guardInbound` decision (correlated by thread token) to everything else (correlated by session id) — say that in the JSDoc, because a reader will otherwise see a content-free event and delete it.
- **`session.failed`** (family `session`) — capture with `outcome: "error"`.
- **`turn.started` / `turn.completed` / `turn.failed`** (family `turn`) — capture with `eve.turn` and, for completed/failed, `outcome: "success"` / `"error"`.
- **`action.result`** (family `tool`) — capture with `eve.phase: "result"`, `eve.call` if a call id is reachable, and `outcome` mapped from `status`:

  | `status` | `outcome` |
  |---|---|
  | `"completed"` | `"success"` |
  | `"failed"` | `"error"` |
  | `"rejected"` | `"denied"` |

  `"rejected"` is the approval-denied path, which is how a `guardApproval` denial shows up on the result stream — so a denied call produces two events (the gate's `"denied"` and the result's `"denied"`), distinguishable by `eve.phase`. Include `error.code` when the status is `"failed"` and an error is present; do not include `error.message`, which may quote tool output.
  Handle an unrecognised status by capturing with no `outcome` key rather than guessing — Eve may add a status, and a wrong mapping is worse than a missing field.
- **`subagent.called`** (family `subagent`) — capture with `eve.child-session` (`childSessionId`), `eve.subagent` (`name`) and `eve.call` (`callId`). The child's own events correlate to the root session per AC3.2, so this record exists to name the delegation, not to bridge correlation.
- **`subagent.completed`** (family `subagent`) — capture with `eve.subagent` (`subagentName`) and `eve.call` (`callId`), and **no** `eve.child-session`. Its payload is `{ callId, output, subagentName }` — verified against `protocol/message.d.ts` — and carries no child session id. The `callId` is what joins it to the `subagent.called` record that does have one; do not synthesize the child session id here by remembering it from the earlier event, because a hook may not have seen that event (the family can be filtered, and a resumed session replays from an arbitrary point). `output` is model-visible text and is never captured.

Every handler must be individually total: read every field defensively, wrap each handler body so nothing escapes, and never `await` anything that could reject unhandled. `captureEvent` already swallows `capture()` throws; the remaining risk is a property read on malformed `data`, and the enclosing guard is what AC6.5 tests.

**Testing:** Tests must verify each AC listed above. Build `HookContext` objects and event objects by hand:
- **AC6.1:** the returned object's own keys are exactly `["events"]`, and every key of `events` is a member of a locally-declared list mirroring `HookEventMap`. Assert the type-level half in Task 3.
- **AC6.2:** three sub-cases over `status`, each asserting one capture with the mapped `outcome`, the session-derived `correlationId`, and `eve.phase: "result"`. Plus a fourth with an unrecognised status asserting no `outcome` key (test with `in`).
- **AC6.3:** with `channel.continuationToken` and `channel.kind` present → both keys on the capture; with `channel` empty → neither key present, and the record still emitted with the session id. That second case matters: a channel that supplies no token is not a reason to drop the join record, because the session id half is still worth having.
- **AC6.4:** `subagent.called` captures `eve.child-session` and `eve.call`. `subagent.completed` captures `eve.call` and `eve.subagent`, and assert `"eve.child-session" in metadata` is **false** — it has no `childSessionId` to carry, and an implementation that invents one (from a remembered earlier event, or as an empty string) must fail.
- **AC6.5:** a sweep over **every** handler in the returned map, invoked with `{}` as the event and `{}` as the context, asserting none throws and none returns a rejecting promise. Drive it from `Object.entries(definition.events)` rather than a hand-listed set, so a handler added later is covered automatically. Repeat the sweep with a client whose `capture()` throws.
- **AC6.6:** `{ events: ["tool"] }` yields only the tool-family keys; the default yields all four families' keys; `{ events: [] }` yields an empty map (and still a valid definition — an author may want the import without the volume).

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
npm run lint --workspace @arcjet/guard
```

**Commit:** `feat(guard): add arcjetHooks for Eve lifecycle capture`
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Prove the definition is accepted by `defineHook`

**Verifies:** vercel-eve-namespace.AC6.1 (the type-level half).

**Files:**
- Modify: `arcjet-guard/src/vercel-eve/v0/hooks.test.ts`

**Implementation:** no production change. `defineHook`'s parameter is `ExactDefinition<T, HookDefinition>`, which rejects excess keys and may interact awkwardly with a widened return type — a `HookDefinition` built at runtime from a conditional map is exactly the shape most likely to trip it. A runtime test cannot see that; a type-level assertion can.

**Testing:** add a compile-time assertion in the existing test file:

```ts
import type { HookDefinition } from "eve/hooks";

// Assignable to what `defineHook` accepts, and to what an authored
// `agent/hooks/*.ts` default-exports.
const asDefinition: HookDefinition = arcjetHooks(client);
void asDefinition;
```

Then, in the **example app** (Phase 6), the real `defineHook(arcjetHooks(aj))` call is what proves the `ExactDefinition` path end to end, because that is where `eve` is a genuine runtime dependency. Note the split explicitly in a comment here: this file can only assert assignability to `HookDefinition`, and the `ExactDefinition` wrapper is verified in Phase 6. Do not claim the stronger thing from here.

**Verification:**

```bash
npm run typecheck --workspace @arcjet/guard
npm run test-unit --workspace @arcjet/guard
```

**Commit:** `test(guard): assert arcjetHooks returns a valid HookDefinition`
<!-- END_TASK_3 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_TASK_4 -->
### Task 4: Finalise the barrel and assert the proxy identity across both namespaces

**Verifies:** vercel-eve-namespace.AC1.1, vercel-eve-namespace.AC1.2.

**Files:**
- Modify: `arcjet-guard/src/vercel-eve/v0/index.ts`
- Modify: `arcjet-guard/src/vercel-eve/v0/index.test.ts`

**Implementation:**

Complete the barrel: the five own exports and their types, then the proxy re-export. Add the worked `@example` to the package documentation block, matching v7's convention — an Eve agent's three files, which is the shape a reader actually needs:

```ts
export { eveAgentContext } from "./context.ts";
export { guardApproval } from "./guard-approval.ts";
export type { GuardApprovalPolicy } from "./guard-approval.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy } from "./guard-tool.ts";
export { guardInbound } from "./guard-inbound.ts";
export type { GuardInboundOptions, InboundVerdict } from "./guard-inbound.ts";
export { arcjetHooks } from "./hooks.ts";
export type { ArcjetHookFamily, ArcjetHooksOptions } from "./hooks.ts";
export * from "../../agents/index.ts";
```

Every example in the JSDoc must compile against the installed typings. Verify each one — this repo has a standing rule about it and Phase 6 asserts it across all docs.

**Testing:** Tests must verify:
- **AC1.1:** each of the five own exports is a function (`typeof === "function"`), and the type-only exports are asserted at type level with a `verifyTypeExports()` function, exactly as `src/vercel-ai/v7/index.test.ts` does — `Object.keys` on a namespace import never lists type-only exports, so a dropped type export is otherwise invisible.
- **AC1.2:** for each agnostic symbol (`createAgentContext`, `securityMetadata`, `guardAction`, `captureAction`, `ArcjetDeniedError`, `ArcjetGuardUnavailableError`), the value imported from `./index.ts` is `===` the value imported from `../../vercel-ai/v7/index.ts`. This is the first time the identity claim is testable across two namespaces rather than against the internal barrel, and it is the assertion that would catch a future "helpful" wrapper.
- **AC1.2:** the Eve namespace's key set is a strict superset of the agnostic barrel's, and its extra keys are exactly the five own exports. Assert the count arithmetic as the v7 test does, so an unintended export fails.

Note the import in this test reaches `../../vercel-ai/v7/index.ts`, which imports `ai` at runtime — so this test file needs the `ai` devDependency present. That is fine (it already is), but it means this one file is not part of the Node-22-without-`eve` story; AC2.2's run covers the namespace's own files, not this cross-namespace assertion. Say so in a comment so nobody later "fixes" the type-only scan to include it.

**Verification:**

```bash
npm run test-unit --workspace @arcjet/guard
npm run typecheck --workspace @arcjet/guard
npm run lint --workspace @arcjet/guard
npm run build --workspace @arcjet/guard
```

**Commit:** `feat(guard): complete the vercel-eve/v0 barrel`
<!-- END_TASK_4 -->

---

## Phase 5 done when

- Task 1's payload findings are recorded, including whether a tool name is reachable from `action.result` through a public entry point.
- `arcjetHooks` satisfies AC6.1–AC6.6, with the never-throws sweep driven from the returned map rather than a hand-listed set.
- No tool output, model output or inbound text reaches any capture payload.
- The barrel exports the five helpers and proxies the agnostic layer, with proxy identity asserted against `vercel-ai/v7`.
- Every JSDoc example in the barrel compiles, and `arcjetHooks` carries its own `@example` showing the `export default defineHook(arcjetHooks(aj))` mount. Phase 6 Task 6 extracts every `@example` in the namespace and compares the count against the export count, so a helper without one fails there rather than shipping undocumented.
- Build, both typechecks, lint and unit tests with coverage pass.
