# Pilot Framework Helper (`@arcjet/ai`) Implementation Plan — Phase 3: `protectTool`

**Goal:** Guard-gated, capture-emitting AI SDK tool wrapping — the package's core: guard before `execute`, structured `ArcjetDenialResult` on DENY, `onDeny` hook, capture after with outcome, fail-open on guard errors, metadata merge.

**Architecture:** `protectTool(client, tool, policy)` returns a same-shaped tool (spread-copy preserving every property) with a replaced `execute`, an injected `contextSchema` for `ArcjetAiContext | undefined`, and the internal brand from Phase 2 so `aiToolsContext` recognizes it. The client parameter is a locally defined **structural** type (`ArcjetAiClient`) rather than `@arcjet/guard`'s `ArcjetGuard`, because `experimental_capture()` has NOT merged into `@arcjet/guard` yet (see "Capture availability" below) — capture is feature-detected at runtime and silently unavailable-but-warned when missing.

**Tech Stack:** `ai@7.0.36` (`Tool`, `ToolSet`, `ToolExecutionOptions`, `jsonSchema`, `InferToolInput`, `generateText`, `stepCountIs`, `MockLanguageModelV4` from `ai/test`), `@arcjet/guard@1.9.1` types (`Decision`, `DecisionDeny`, `GuardOptions`, `RuleWithInput`), node:test.

**Scope:** Phase 3 of 6 from `docs/design-plans/2026-07-23-pilot-framework-helper.md`.

**Codebase verified:** 2026-07-23. Key verified facts:

- `arcjet-guard/src/index.ts:191-195` — `ArcjetGuard` has only `guard(opts: GuardOptions): Promise<Decision>`. **No `experimental_capture` exists on main or on this branch.**
- **Capture availability:** the design cites capture commits as merged; in reality they live on `origin/quinn/experimental-capture` (not merged; verified with `git merge-base --is-ancestor`). Its shape there (verbatim from that branch's `arcjet-guard/src/types.ts`): `experimental_capture(opts: CaptureOptions): void`, fire-and-forget, never throws/rejects, with `CaptureOptions = { action: string; correlationId?: string; decisionId?: string; occurredAt?: Date; metadata?: Record<string, string> }`. This phase codes against that shape via a local optional method + feature detection, so `@arcjet/ai` works with today's published guard (no capture events emitted, gated warning) and lights up when guard ships capture.
- `GuardOptions` (`arcjet-guard/src/types.ts:1661-1721`): `{ label: string; rules: RuleWithInput[]; metadata?: Record<string, string>; correlationId?: string; timeoutSeconds?: number; signal?: AbortSignal }`. The guard **client requires `rules.length > 0`** (`client.ts:62-64`).
- `Decision` = `DecisionAllow | DecisionDeny`; `conclusion: "ALLOW" | "DENY"`; `DecisionDeny.reason` ∈ `"RATE_LIMIT" | "PROMPT_INJECTION" | "MODERATE_CONTENT" | "SENSITIVE_INFO" | "CUSTOM" | "ERROR" | "NOT_RUN" | "UNKNOWN"`; `decision.id` (TypeID, prefix `gdec`); `decision.hasFailedOpen(): boolean`; `decision.results` rule results — rate-limit results carry `resetAtUnixSeconds`.
- Transport failures do NOT throw from `guard()` — the client synthesizes an ALLOW decision with `hasFailedOpen() === true` (`client.ts:148-169`). The wrapper still try/catches for defense in depth.
- Warning convention (`arcjet-guard/src/transport-recycle.ts:128-133`): `console.warn` gated by `ARCJET_LOG_LEVEL` ∈ `debug|info|warn`.
- AI SDK typings verified from the published package: tool-call content part is `{ type: "tool-call", toolCallId, toolName, input: <stringified JSON> }`; `finishReason` is `{ unified: "tool-calls" | "stop" | ..., raw?: ... }`; `MockLanguageModelV4` (from `ai/test`) accepts `doGenerate` as a single result, a function, or an **array of results consumed sequentially**; `stepCountIs` is exported from `ai`; `jsonSchema(schema, { validate })` builds a `Schema` with a custom validator returning `ValidationResult<T>` (`{ success: true; value: T } | { success: false; error: Error }` — confirm exact shape in `node_modules/@ai-sdk/provider-utils/dist/index.d.ts` around line 939 at implementation time).

---

## Acceptance Criteria Coverage

This phase implements and tests:

### pilot-framework-helper.AC1: Correlation context propagates end to end
- **pilot-framework-helper.AC1.5 Success:** a context passed via
  `aiToolsContext()` arrives in a wrapped tool's `execute` and its
  `correlationId` reaches the `guard()` call.
- **pilot-framework-helper.AC1.6 Edge:** a wrapped tool invoked with no
  context still runs its guard check (uncorrelated) and logs a dev-mode
  warning.
- **pilot-framework-helper.AC1.7 Success:** an explicit `correlationId` in a
  tool policy overrides the context's.
  (Moved here from the design's Phase 2 assignment — the override lives in
  `protectTool` policy handling; see the deviation note in `phase_02.md`.)

### pilot-framework-helper.AC2: `protectTool` enforces by default
- **pilot-framework-helper.AC2.1 Success:** on ALLOW, the original `execute`
  runs and its result is returned unchanged.
- **pilot-framework-helper.AC2.2 Success:** on DENY, `execute` is never called
  and the tool result is an `ArcjetDenialResult` with the denial reason.
- **pilot-framework-helper.AC2.3 Success:** `guard()` receives `label` =
  policy action and metadata merged in order context ← policy ← per-call
  function.
  (AC text copied literally from the design; at runtime this is a two-layer
  merge — see design decision 5 below.)
- **pilot-framework-helper.AC2.4 Success:** after successful execution,
  `experimental_capture()` fires with the action, correlation ID, and merged
  metadata.
- **pilot-framework-helper.AC2.5 Success:** on the denied path, capture fires
  with a denied outcome referencing the guard decision ID.
- **pilot-framework-helper.AC2.6 Failure:** when the guard API errors, the
  tool fails open — `execute` runs, and the failure is observable (warning +
  `hasFailedOpen()`).
- **pilot-framework-helper.AC2.7 Success:** `onDeny` reshapes the denial
  payload the model sees.
- **pilot-framework-helper.AC2.8 Edge:** when `execute` throws, capture
  records an error outcome and the original error propagates unchanged.
- **pilot-framework-helper.AC2.9 Success:** in a `generateText` loop with a
  mock model, a denied tool call produces the denial result in the
  conversation and the loop continues.

---

## Design decisions fixed for this phase

1. **Capture outcome convention:** `CaptureOptions` has no `outcome` field, so
   outcome rides in capture metadata under the key `outcome` with values
   `"success" | "denied" | "error"`. The denied path also passes
   `decisionId: decision.id`. (Wire-vocabulary decision — flag for reviewer
   approval alongside the `securityMetadata` keys.)
2. **Capture-only wrapping:** when `policy.rules` is absent or resolves to an
   empty array, `guard()` is **skipped entirely** (the guard client rejects
   empty rules) and the call is treated as allowed with no decision. This is
   deliberate — the review-bot dogfood wraps `loadSkill` capture-only.
3. **Denial retryability:** `retryable = reason === "RATE_LIMIT"`;
   `retryAfterSeconds` = `max(0, ceil(resetAtUnixSeconds - now))` from the
   first rule result that has `resetAtUnixSeconds`, omitted otherwise.
4. **Wrap-time guard:** `protectTool` throws immediately (plain `Error`) if
   the inner tool already declares `contextSchema` — the wrapper needs that
   slot for `ArcjetAiContext` and silently clobbering the app's own context
   contract would corrupt it. Pilot limitation, documented in JSDoc.
5. **Metadata merge is two layers at runtime:** the design's wording
   "context ← policy ← per-call function" reads as three layers, but
   `policy.metadata` is an object OR a per-call function (either/or), so
   exactly two sources ever merge: the context's metadata, then the policy's
   (static object or function-of-input result), later wins. AC2.3's test
   asserts this two-layer merge; do not invent a third layer.
6. **Context schema allows `undefined`:** the injected `contextSchema` types
   the context as `ArcjetAiContext | undefined`, which keeps the tool's
   `toolsContext` entry **optional** in `InferToolSetContext` (verified in
   the published typings: only context types that exclude `undefined` become
   required keys). This is what makes AC1.6 (no context supplied) legal at
   both the type and runtime level.

---

<!-- START_SUBCOMPONENT_A (tasks 1-3) -->
<!-- START_TASK_1 -->
### Task 1: Structural client type and capture helper

**Files:**
- Create: `arcjet-ai/src/client.ts`

**Implementation:**

```ts
import type { Decision, GuardOptions } from "@arcjet/guard";

/**
 * Options for `experimental_capture()` on guard clients that provide it.
 * Mirrors the in-flight `@arcjet/guard` CaptureOptions shape.
 */
export interface CaptureOptions {
  /** The fact itself, `"resource.verb"` past tense (e.g. `"review.submitted"`). */
  action: string;
  /** Opaque identifier joining this event to related decisions/events. */
  correlationId?: string;
  /** Join key referencing the guard decision this event relates to. */
  decisionId?: string;
  /** When the action occurred; defaults to the time of the call. */
  occurredAt?: Date;
  /** Arbitrary key-value metadata, same caps as guard metadata. */
  metadata?: Record<string, string>;
}

/**
 * The guard client surface `@arcjet/ai` needs, typed structurally.
 *
 * `experimental_capture` is optional because it has not shipped in a
 * published `@arcjet/guard` release yet; when the launched client lacks it,
 * capture calls become no-ops (with a gated warning).
 */
export interface ArcjetAiClient {
  guard(opts: GuardOptions): Promise<Decision>;
  experimental_capture?(opts: CaptureOptions): void;
}

/**
 * True when `ARCJET_LOG_LEVEL` asks for warnings (guard's convention:
 * `debug`, `info`, or `warn`).
 */
export function shouldWarn(): boolean {
  const level = globalThis.process?.env?.["ARCJET_LOG_LEVEL"];
  return level === "debug" || level === "info" || level === "warn";
}

/**
 * Fire-and-forget capture. Never throws. No-ops (with a gated warning) when
 * the client predates `experimental_capture()`.
 */
export function captureEvent(client: ArcjetAiClient, opts: CaptureOptions): void {
  if (typeof client.experimental_capture === "function") {
    try {
      client.experimental_capture(opts);
    } catch {
      // capture must never take the caller down.
    }
    return;
  }
  if (shouldWarn()) {
    console.warn(
      "@arcjet/ai: this @arcjet/guard client does not support experimental_capture(); event not recorded:",
      opts.action,
    );
  }
}
```

Note: feature detection is method-presence only — if a future guard were to
ship `experimental_capture()` without metadata support, `captureEvent` would
still pass `metadata` (which that client would ignore or drop). Accepted
risk: the shape coded against (`origin/quinn/experimental-capture`) already
includes `metadata`, and capture is best-effort by contract.

`shouldWarn`/`captureEvent` are internal (imported by later modules) but
exporting them from this module is fine; they are NOT re-exported from
`src/index.ts`. `ArcjetAiClient` and `CaptureOptions` ARE re-exported (Task 2
adds them to the entry point) — consumers need the client type in signatures.
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: `protectTool` implementation

**Files:**
- Create: `arcjet-ai/src/protect-tool.ts`
- Modify: `arcjet-ai/src/index.ts` (exports)

**Implementation:** the complete module below is the contract; the
implementor may adjust internal helper names but not observable behavior.

```ts
import type { DecisionDeny, RuleWithInput } from "@arcjet/guard";
import { jsonSchema } from "ai";
import type { InferToolInput, Tool } from "ai";
import { captureEvent, shouldWarn } from "./client.js";
import type { ArcjetAiClient } from "./client.js";
import type { ArcjetAiContext } from "./context.js";
import { arcjetProtectedTool } from "./internal.js";

/** Structured tool result returned to the model when a call is denied. */
export interface ArcjetDenialResult {
  arcjetDenied: true;
  /** Denial reason, e.g. `"RATE_LIMIT"` or `"PROMPT_INJECTION"`. */
  reason: string;
  /** Human/model-readable explanation of the denial. */
  message: string;
  /** Whether retrying later can succeed (true for rate limits). */
  retryable: boolean;
  /** Seconds until a rate-limited call may be retried. */
  retryAfterSeconds?: number;
}

/** Policy for `protectTool()`. */
export interface ProtectToolPolicy<T extends Tool> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate; omit (or return `[]`) for capture-only wrapping. */
  rules?: RuleWithInput[] | ((input: InferToolInput<T>) => RuleWithInput[]);
  /** Metadata merged over the context's (object, or per-call function of the tool input). */
  metadata?:
    | Record<string, string>
    | ((input: InferToolInput<T>) => Record<string, string>);
  /** Explicit correlation ID; overrides the context's when set. */
  correlationId?: string;
  /** Reshape the denial payload the model sees. */
  onDeny?: (decision: DecisionDeny) => unknown;
}

const contextSchema = jsonSchema<ArcjetAiContext | undefined>(
  {
    type: "object",
    properties: {
      correlationId: { type: "string" },
      metadata: { type: "object", additionalProperties: { type: "string" } },
    },
    required: ["correlationId"],
  },
  {
    validate(value) {
      if (
        value === undefined ||
        (typeof value === "object" &&
          value !== null &&
          typeof (value as ArcjetAiContext).correlationId === "string")
      ) {
        return { success: true, value: value as ArcjetAiContext | undefined };
      }
      return {
        success: false,
        error: new Error(
          "@arcjet/ai: toolsContext entry is not an ArcjetAiContext",
        ),
      };
    },
  },
);

export function protectTool<T extends Tool>(
  client: ArcjetAiClient,
  tool: T,
  policy: ProtectToolPolicy<T>,
): T {
  if (typeof tool.execute !== "function") {
    throw new Error(
      "@arcjet/ai: protectTool() requires a tool with an execute function",
    );
  }
  if (tool.contextSchema !== undefined) {
    throw new Error(
      "@arcjet/ai: protectTool() cannot wrap a tool that declares its own contextSchema (pilot limitation)",
    );
  }
  const originalExecute = tool.execute.bind(tool);

  return {
    ...tool,
    [arcjetProtectedTool]: true,
    contextSchema,
    async execute(input: InferToolInput<T>, options: never) {
      // `options.context` was validated by contextSchema above.
      const opts = options as {
        context?: ArcjetAiContext;
        [key: string]: unknown;
      };
      const ctx = opts.context;
      if (ctx === undefined && shouldWarn()) {
        console.warn(
          `@arcjet/ai: tool call "${policy.action}" has no ArcjetAiContext; ` +
            "guard checks run uncorrelated. Pass toolsContext: aiToolsContext(ctx, tools).",
        );
      }
      const correlationId = policy.correlationId ?? ctx?.correlationId;
      const metadata = {
        ...ctx?.metadata,
        ...(typeof policy.metadata === "function"
          ? policy.metadata(input)
          : policy.metadata),
      };
      const rules =
        typeof policy.rules === "function" ? policy.rules(input) : policy.rules;

      let decisionId: string | undefined;
      if (rules !== undefined && rules.length > 0) {
        let decision;
        try {
          decision = await client.guard({
            label: policy.action,
            rules,
            correlationId,
            metadata,
          });
        } catch (error) {
          // Defense in depth: the guard client itself converts transport
          // failures into ALLOW decisions with hasFailedOpen() === true, so
          // this path means something unexpected broke. Fail open.
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
            if (policy.onDeny !== undefined) {
              return policy.onDeny(decision);
            }
            return denialResult(decision);
          }
        }
      }

      let result;
      try {
        result = await originalExecute(input, options);
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
    },
  } as T;
}

function denialResult(decision: DecisionDeny): ArcjetDenialResult {
  const retryable = decision.reason === "RATE_LIMIT";
  let retryAfterSeconds: number | undefined;
  for (const result of decision.results) {
    if ("resetAtUnixSeconds" in result && typeof result.resetAtUnixSeconds === "number") {
      retryAfterSeconds = Math.max(
        0,
        Math.ceil(result.resetAtUnixSeconds - Date.now() / 1000),
      );
      break;
    }
  }
  return {
    arcjetDenied: true,
    reason: decision.reason,
    message: retryable
      ? `Arcjet denied this tool call (${decision.reason}). It may be retried` +
        (retryAfterSeconds === undefined
          ? " later."
          : ` after ${retryAfterSeconds} seconds.`)
      : `Arcjet denied this tool call (${decision.reason}). Do not retry; explain the denial to the user or try a different approach.`,
    retryable,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
}
```

Implementation notes:

- The `execute` signature uses a cast-based approach because `T extends Tool`
  is a union type whose `execute` options generic can't be re-derived
  precisely inside the wrapper. Keep the public signature `(client, tool,
  policy) => T` exactly; internal casts (`options as ...`, `as T`) are
  expected and acceptable here. If `tsgo` (with `isolatedDeclarations`)
  demands explicit annotations, annotate the wrapped `execute` as
  `Tool["execute"]` compatible and keep the casts local to this module.
- JSDoc on `protectTool` must document: execution order (context → guard →
  deny-or-execute → capture), the capture-only mode, fail-open posture, the
  contextSchema pilot limitation, and an `@example` wrapping a `tool()` with
  a `tokenBucket` rule.
- Add exports to `src/index.ts`:

```ts
export { protectTool } from "./protect-tool.js";
export type { ArcjetDenialResult, ProtectToolPolicy } from "./protect-tool.js";
export type { ArcjetAiClient, CaptureOptions } from "./client.js";
```
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: `protectTool` unit tests (stubbed client, direct execute calls)

**Verifies:** pilot-framework-helper.AC1.7, AC2.1, AC2.2, AC2.3, AC2.4, AC2.5, AC2.6, AC2.7, AC2.8

**Files:**
- Create: `arcjet-ai/test/protect-tool.test.ts` (unit)

**Testing:** build a small stub-client factory inside the test file:

```ts
function stubClient(decision) {
  const guardCalls = [];
  const captureCalls = [];
  return {
    client: {
      async guard(opts) {
        guardCalls.push(opts);
        if (decision instanceof Error) throw decision;
        return decision;
      },
      experimental_capture(opts) {
        captureCalls.push(opts);
      },
    },
    guardCalls,
    captureCalls,
  };
}
```

Stub decisions are plain objects: ALLOW =
`{ conclusion: "ALLOW", id: "gdec_allow1", results: [], warnings: [], hasFailedOpen: () => false }`;
DENY (rate limit) =
`{ conclusion: "DENY", reason: "RATE_LIMIT", id: "gdec_deny1", results: [{ conclusion: "DENY", reason: "RATE_LIMIT", type: "TOKEN_BUCKET", resetAtUnixSeconds: <now + 30> }], warnings: [], hasFailedOpen: () => false }`;
fail-open ALLOW = ALLOW with `hasFailedOpen: () => true`.

Wrap a simple tool made with `tool()` from `ai` (`inputSchema` via
`jsonSchema`, `execute` recording its calls and returning a sentinel), then
invoke `wrapped.execute(input, { toolCallId: "t1", messages: [], context })`
directly. Rules: pass a fake `RuleWithInput` (opaque value — the stub client
never interprets it; cast as needed).

Tests must verify each AC listed above:

- **AC2.1:** ALLOW decision → original execute called once with the same
  input; wrapper returns the sentinel unchanged.
- **AC2.2:** DENY decision → execute never called; returned value has
  `arcjetDenied: true`, `reason: "RATE_LIMIT"`, non-empty `message`,
  `retryable: true`, `retryAfterSeconds` within [0, 30].
- **AC2.3:** context `{ correlationId, metadata: { user: "u1", workflow: "w" } }`,
  policy metadata `(input) => ({ workflow: "override", resource: input.id })` →
  the single `guardCalls[0]` has `label` === policy action and metadata
  `{ user: "u1", workflow: "override", resource: <input.id> }` (context ←
  policy per-call merge, later wins).
- **AC2.4:** ALLOW + successful execute → exactly one capture call with
  `action`, `correlationId` (context's), `decisionId` of the decision, and
  metadata including the merge plus `outcome: "success"`.
- **AC2.5:** DENY → capture called once with `decisionId: "gdec_deny1"` and
  metadata `outcome: "denied"`.
- **AC2.6 (two flavors):** (a) `guard` throws → execute still runs, a
  warning was emitted (set `process.env.ARCJET_LOG_LEVEL = "warn"` in the
  test and stub `console.warn` via `mock.method(console, "warn")` from
  node:test, restore after); (b) `guard` resolves fail-open ALLOW
  (`hasFailedOpen() === true`) → execute runs and a warning mentions failing
  open.
- **AC2.7:** DENY + `onDeny: (d) => ({ blocked: d.reason })` → tool result is
  `{ blocked: "RATE_LIMIT" }` (default denial shape absent).
- **AC2.8:** execute throws sentinel error → same error instance propagates
  (`assert.rejects` with equality check) and capture fired once with
  metadata `outcome: "error"`.
- **AC1.7:** policy `correlationId: "explicit-1"` + context correlationId
  `"ctx-1"` → `guardCalls[0].correlationId === "explicit-1"` and capture
  uses `"explicit-1"` too.
- **Capture-only mode (design decision 2):** policy without `rules` →
  `guardCalls` stays empty, execute runs, capture fires with
  `outcome: "success"` and no `decisionId`.
- **Missing capture support:** client object without `experimental_capture` →
  wrapped execute still completes; with `ARCJET_LOG_LEVEL=warn` a warning
  mentions capture unavailability.
- **Wrap-time errors:** wrapping a tool without `execute`, and a tool with
  its own `contextSchema`, both throw.

Reset `process.env.ARCJET_LOG_LEVEL` and console mocks in
`beforeEach`/`afterEach` (see `redact/test/index.test.ts` for the
`mock.method` + `mock.restoreAll()` pattern).

**Verification:**
Run: `npm test --workspace @arcjet/ai`
Expected: all tests pass.

**Commit:** `feat(ai): add protectTool() guard-gated tool wrapping`
<!-- END_TASK_3 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (task 4) -->
<!-- START_TASK_4 -->
### Task 4: `generateText` integration tests (mock model)

**Verifies:** pilot-framework-helper.AC1.5, AC1.6, AC2.9

**Files:**
- Create: `arcjet-ai/test/generate-text.test.ts` (integration — real
  `generateText` from `ai`, mock language model, stub guard client)

**Testing:**

Model setup: `MockLanguageModelV4` from `ai/test` with `doGenerate` as an
**array** of two results consumed sequentially (verified: the constructor
accepts `LanguageModelV4GenerateResult[]`):

1. First result: `content: [{ type: "tool-call", toolCallId: "call-1", toolName: "sendEmail", input: JSON.stringify({ to: "a@b.co" }) }]`, `finishReason: { unified: "tool-calls", raw: undefined }`, plus required `usage` (zeros) and any other required result fields (`warnings: []` — check the `LanguageModelV4GenerateResult` type for required members at implementation time).
2. Second result: `content: [{ type: "text", text: "done" }]`, `finishReason: { unified: "stop", raw: undefined }`, same boilerplate.

Call `generateText` with `stopWhen: stepCountIs(3)` (import `stepCountIs`
from `ai`) so the loop is permitted to continue past the tool call, tools
`{ sendEmail: protectTool(client, sendEmailTool, { action: "email.sent", rules: [fakeRule] }) }`,
and `toolsContext: aiToolsContext(ctx, tools)`.

Tests must verify each AC listed above:

- **AC1.5:** with an ALLOW stub client and
  `ctx = createAiContext({ correlationId: "corr-e2e-1" })`: the tool's inner
  execute ran, and `guardCalls[0].correlationId === "corr-e2e-1"` — proving
  context flowed route → `toolsContext` → wrapped execute → guard.
- **AC1.6:** same setup but NO `toolsContext` passed to `generateText`
  (build the tools object but omit the option; TS allows it because the
  context type includes `undefined`): inner execute still ran,
  `guardCalls[0].correlationId === undefined`, and with
  `ARCJET_LOG_LEVEL=warn` a `console.warn` mock captured a message matching
  `/no ArcjetAiContext/`.
- **AC2.9:** with a DENY stub client: `generateText` completes without
  throwing; the run has two steps (`result.steps.length === 2` — loop
  continued past the denial); the first step's content includes a
  tool-result part whose `output` deep-includes `{ arcjetDenied: true,
  reason: "RATE_LIMIT" }`; the mock model's second call
  (`mockModel.doGenerateCalls[1]`) received a prompt containing the denial
  payload (assert `JSON.stringify(mockModel.doGenerateCalls[1].prompt)`
  matches `/arcjetDenied/`); and the inner execute never ran.

Note for the implementor: exact result-part accessor names
(`result.steps[0].content`, tool-result `output` property) should be
confirmed against the installed `ai` typings when writing assertions — the
`doGenerateCalls[1].prompt` stringify assertion is the load-bearing one and
is accessor-stable.

**Verification:**
Run: `npm test --workspace @arcjet/ai`
Expected: all tests pass — including the full suite from Phases 1–2.

Also run: `npm run typecheck --workspace @arcjet/ai`, root `npm run lint`,
root `npm run format:check`.
Expected: all exit 0.

**Commit:** `test(ai): cover protectTool inside a generateText loop`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_B -->

---

## Phase completion checklist

- [ ] `npm test --workspace @arcjet/ai` passes (unit + integration)
- [ ] `npm run typecheck --workspace @arcjet/ai` passes
- [ ] Root `npm run lint` and `npm run format:check` pass
- [ ] Every AC above appears in a test description string (e.g. `"AC2.2: ..."`)
- [ ] Two commits as specified
