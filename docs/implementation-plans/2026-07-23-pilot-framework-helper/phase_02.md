# Pilot Framework Helper (`@arcjet/ai`) Implementation Plan — Phase 2: Security context and metadata vocabulary

**Goal:** The correlation and metadata primitives every other component consumes: `ArcjetAiContext`, `createAiContext()` (with inline ULID generation and correlation-ID validation), `securityMetadata()`, and the `aiToolsContext()` fan-out helper.

**Architecture:** Plain JSON-serializable context object threaded explicitly (no classes, no AsyncLocalStorage). ULID generation is implemented inline (~25 lines; no `ulid` npm dependency exists anywhere in this repo and the repo convention is minimal dependencies). `aiToolsContext()` fans one context out to a `toolsContext` map keyed by tool name — only for tools carrying the internal "protected by Arcjet" brand, because the AI SDK's `InferToolSetContext` type omits tools without a `contextSchema`, and handing context entries to unbranded tools would be a type error at `generateText` call sites.

**Tech Stack:** TypeScript 6.0.3, `ai@7.0.36` types (`ToolSet`, `InferToolSetContext`), node:test + node:assert/strict, tests in `test/*.test.ts` importing built `dist/`.

**Scope:** Phase 2 of 6 from `docs/design-plans/2026-07-23-pilot-framework-helper.md`.

**Codebase verified:** 2026-07-23 (guard investigator: correlation-ID server rule is "max 256 bytes printable ASCII, dropped not truncated" per `arcjet-guard/src/types.ts:1703-1705`; no ULID utility exists in the repo — `arcjet-guard/src/rules.ts:59-62` uses `crypto.randomUUID()`. AI SDK typings verified directly from published `ai@7.0.36` package: `toolsContext` is keyed by tool name; `InferToolSetContext` omits tools without concrete context.)

---

## Acceptance Criteria Coverage

This phase implements and tests:

### pilot-framework-helper.AC1: Correlation context propagates end to end
- **pilot-framework-helper.AC1.1 Success:** `createAiContext()` with no
  arguments generates a valid correlation ID (ULID, ≤256 bytes printable
  ASCII).
- **pilot-framework-helper.AC1.2 Success:** a caller-supplied `correlationId`
  (e.g. `reviewId`) is preserved verbatim.
- **pilot-framework-helper.AC1.3 Failure:** an invalid correlation ID
  (>256 bytes or non-printable characters) is rejected at creation with a
  clear error — not truncated.
- **pilot-framework-helper.AC1.4 Success:** a context survives JSON
  serialization round-trip unchanged (the workflow-boundary case).

### pilot-framework-helper.AC4: Metadata vocabulary
- **pilot-framework-helper.AC4.1 Success:** `securityMetadata()` maps each
  field to its documented wire key (`user`, `agent`, `workflow`, `data-class`,
  `destination`, `reversibility`, `resource`).
- **pilot-framework-helper.AC4.2 Success:** custom string values outside the
  suggested vocabularies pass through unchanged.
- **pilot-framework-helper.AC4.3 Edge:** undefined fields are omitted entirely
  (no empty-string keys).

**Deviation from the design's phase list:** the design also assigns
**pilot-framework-helper.AC1.7** (explicit `correlationId` in a tool policy
overrides the context's) to this phase, but that behavior lives in
`protectTool`'s policy handling, which does not exist until Phase 3. AC1.7 is
covered in Phase 3 (`phase_03.md`), where the override is implemented and
tested. Nothing in this phase blocks it: `createAiContext` treats the
context's `correlationId` as data; the override is a consumer decision.

---

## API contracts this phase delivers

```ts
export interface ArcjetAiContext {
  correlationId: string;
  metadata?: Record<string, string>;
}

export function createAiContext(init?: {
  correlationId?: string;
  metadata?: Record<string, string>;
}): ArcjetAiContext;

export function aiToolsContext<TOOLS extends ToolSet>(
  ctx: ArcjetAiContext,
  tools: TOOLS,
): InferToolSetContext<TOOLS>;

export interface SecurityMetadataFields {
  user?: string;
  agent?: string;
  workflow?: string;
  dataClass?: "public" | "internal" | "confidential" | "regulated" | (string & {});
  destination?: string;
  reversibility?: "reversible" | "compensable" | "irreversible";
  resource?: string;
}

export function securityMetadata(fields: SecurityMetadataFields): Record<string, string>;
```

Validation rule (client-side mirror of the server rule): a caller-supplied
`correlationId` must match `/^[\x20-\x7e]{1,256}$/` — 1–256 characters, every
character printable ASCII (0x20 space through 0x7E tilde). Because only ASCII
is accepted, character count equals byte count. Anything else throws a plain
`Error` whose message names the field, states the rule, and does NOT truncate
(the server behavior is "dropped, not truncated" — failing loudly at creation
is the whole point of AC1.3). The repo has no custom error-class convention
(arcjet-guard defines none), so a plain `Error` is correct here.

---

<!-- START_SUBCOMPONENT_A (tasks 1-2) -->
<!-- START_TASK_1 -->
### Task 1: ULID generator and context module

**Files:**
- Create: `arcjet-ai/src/ulid.ts`
- Create: `arcjet-ai/src/internal.ts`
- Create: `arcjet-ai/src/context.ts`
- Modify: `arcjet-ai/src/index.ts` (replace the Phase 1 placeholder)

**Step 1: Create `arcjet-ai/src/ulid.ts`**

ULID per the spec at <https://github.com/ulid/spec>: 26 characters of
Crockford base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ` — no I, L, O, U),
10 chars encoding a 48-bit millisecond timestamp, 16 chars encoding 80 bits
of randomness. Monotonicity within the same millisecond is an optional spec
feature that correlation IDs do not need — do not implement it.

```ts
/**
 * Crockford base32 alphabet used by ULID (no I, L, O, U).
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generate a ULID: 26 characters of Crockford base32 — a 48-bit millisecond
 * timestamp (10 chars) followed by 80 bits of randomness (16 chars).
 *
 * Sortable by creation time and safely within guard's correlation-ID rules
 * (≤256 bytes of printable ASCII).
 */
export function ulid(): string {
  let timestamp = Date.now();
  let time = "";
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[timestamp % 32] + time;
    timestamp = Math.floor(timestamp / 32);
  }
  // 16 random bytes; `byte % 32` keeps 5 uniform bits per byte (256 is
  // divisible by 32, so no modulo bias).
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let random = "";
  for (const byte of bytes) {
    random += ALPHABET[byte % 32];
  }
  return time + random;
}
```

(`crypto` is the global Web Crypto object — available un-imported on
Node ≥19, matching this package's `engines`. `arcjet-guard/src/rules.ts`
already uses global `crypto` the same way.)

**Step 2: Create `arcjet-ai/src/internal.ts`**

The brand that `protectTool` (Phase 3) stamps on wrapped tools and
`aiToolsContext` filters by. `Symbol.for` (registry symbol) so two copies of
`@arcjet/ai` in one process still recognize each other's tools:

```ts
/**
 * Brand stamped on tools wrapped by `protectTool()` so context helpers can
 * recognize them. Registry-scoped so duplicate copies of this package
 * interoperate.
 */
export const arcjetProtectedTool: symbol = Symbol.for(
  "arcjet:ai:protected-tool",
);
```

(The explicit `: symbol` annotation satisfies `isolatedDeclarations`.)

**Step 3: Create `arcjet-ai/src/context.ts`**

Implement `ArcjetAiContext`, `createAiContext`, and `aiToolsContext` per the
contracts above. Implementation notes:

- Validate with a module-level `const CORRELATION_ID_RE = /^[\x20-\x7e]{1,256}$/;`.
  Error message format:
  `"@arcjet/ai: correlationId must be 1-256 characters of printable ASCII (got <describe the problem: length N / non-printable characters>); it was rejected, not truncated."`
  Word it so a developer reading a stack trace knows the rule and that
  nothing was sent.
- `createAiContext()` with no `correlationId` uses `ulid()`. Generated IDs
  are not re-validated (they are correct by construction).
- Copy `metadata` into a fresh object (`{ ...init.metadata }`) so the
  returned context is a plain, owned, JSON-serializable value; omit the
  `metadata` key entirely when the caller passed none.
- `aiToolsContext(ctx, tools)` iterates `Object.entries(tools)` and includes
  `name → ctx` only for tools where `arcjetProtectedTool in tool` is true.
  Return with a cast (`as InferToolSetContext<TOOLS>`; use
  `as unknown as InferToolSetContext<TOOLS>` if tsgo rejects the direct
  cast) — the runtime shape is a plain object keyed by tool name, which is
  exactly what `generateText({ toolsContext })` takes. Import
  `type { InferToolSetContext, ToolSet } from "ai"`.
- Every export gets JSDoc following the repo style (`@example` on
  `createAiContext` showing route-handler usage with an existing
  `reviewId`; see `arcjet-guard/src/index.ts` for tone).

**Step 4: Replace `arcjet-ai/src/index.ts`**

Delete the Phase 1 placeholder export. Re-export the public surface:

```ts
export { createAiContext, aiToolsContext } from "./context.js";
export type { ArcjetAiContext } from "./context.js";
```

(Keep a module-level `@packageDocumentation` JSDoc block briefly describing
the package, patterned on `arcjet-guard/src/index.ts:1-75`. `securityMetadata`
is added to these exports in Task 3. Do not export `ulid` or
`arcjetProtectedTool` from the package entry point — `ulid` is an internal
detail and the brand is shared between modules via `./internal.js` only.)

<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Context tests

**Verifies:** pilot-framework-helper.AC1.1, AC1.2, AC1.3, AC1.4

**Files:**
- Create: `arcjet-ai/test/context.test.ts` (unit)
- Modify: `arcjet-ai/test/index.test.ts` (update the Phase 1 smoke test —
  `experimental_placeholder` no longer exists; assert instead that
  `createAiContext`, `aiToolsContext`, and — after Task 3 — `securityMetadata`
  are exported functions)

**Testing:** import from `../dist/index.js` (repo convention — tests run
against the built output; the `test` script builds first). `aiToolsContext`
needs the brand symbol: recreate it in the test via
`Symbol.for("arcjet:ai:protected-tool")` — using the registry key is
intentional; it also pins the key as public-ish contract.

Tests must verify each AC listed above:

- **AC1.1:** `createAiContext()` returns `correlationId` matching
  `/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/`; two consecutive calls return
  different IDs; the ID also satisfies the printable-ASCII ≤256 rule.
- **AC1.2:** `createAiContext({ correlationId: "review_2026-07-23_00042" })`
  returns exactly that string, unmodified.
- **AC1.3:** each of these throws (use `assert.throws` with a message
  matcher, e.g. `/correlationId/`): a 257-character string (`"x".repeat(257)`),
  a string containing `\n`, a string containing a non-ASCII character
  (`"café"`), and the empty string. Assert the 257-char case throws rather
  than returning a truncated 256-char context.
- **AC1.4:** for a context created with both a custom `correlationId` and
  `metadata`, `JSON.parse(JSON.stringify(ctx))` is `assert.deepEqual` to the
  original.
- **`aiToolsContext` fan-out (plumbing for AC1.5, fully verified in
  Phase 3):** given a tools object containing one fake branded tool
  (`{ [Symbol.for("arcjet:ai:protected-tool")]: true, description: "a" }`)
  and one unbranded tool, the result has the context under the branded
  tool's name only, and the value is (`assert.equal`, reference-equal) the
  context passed in.

**Verification:**
Run: `npm test --workspace @arcjet/ai`
Expected: build succeeds, all tests pass.

**Commit:** `feat(ai): add security context with ULID correlation IDs`
<!-- END_TASK_2 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_SUBCOMPONENT_B (tasks 3-4) -->
<!-- START_TASK_3 -->
### Task 3: `securityMetadata()` builder

**Files:**
- Create: `arcjet-ai/src/metadata.ts`
- Modify: `arcjet-ai/src/index.ts` (add exports)

**Implementation:**

`securityMetadata(fields)` returns a `Record<string, string>` with this exact
field → wire-key mapping (the design's documented vocabulary; key names are
subject to reviewer approval at PR time, so keep the mapping in one obvious
table-like block):

| Field           | Wire key        |
| --------------- | --------------- |
| `user`          | `user`          |
| `agent`         | `agent`         |
| `workflow`      | `workflow`      |
| `dataClass`     | `data-class`    |
| `destination`   | `destination`   |
| `reversibility` | `reversibility` |
| `resource`      | `resource`      |

- A field that is `undefined` contributes no key at all (no empty strings).
- Values are passed through unchanged — the unions on `dataClass` and
  `reversibility` are suggestions, not runtime validation; any string is
  accepted at runtime (`dataClass` is typed `... | (string & {})` to keep
  editor suggestions while admitting any string — if oxlint objects to the
  `{}` type, use `(string & Record<never, never>)` instead).
- `reversibility` stays a closed union in the type (the design calls it the
  one dimension policies will branch on) but, being just a string at runtime,
  still passes through.
- Add JSDoc on the interface fields explaining each dimension in one line
  (crib the design: `user` = "whose authority the agent acts under (opaque
  ID, not PII)", etc.), and note on the function that guard enforces
  server-side caps (max 20 pairs, key ≤64 bytes, value ≤512 bytes) so large
  maps may be dropped server-side.
- Export from `src/index.ts`:
  `export { securityMetadata } from "./metadata.js";`
  `export type { SecurityMetadataFields } from "./metadata.js";`

<!-- END_TASK_3 -->

<!-- START_TASK_4 -->
### Task 4: Metadata tests

**Verifies:** pilot-framework-helper.AC4.1, AC4.2, AC4.3

**Files:**
- Create: `arcjet-ai/test/metadata.test.ts` (unit)

**Testing:** tests must verify each AC listed above:

- **AC4.1:** calling `securityMetadata` with all seven fields set returns
  exactly (`assert.deepEqual`) the seven documented wire keys with the given
  values — in particular `dataClass: "internal"` arrives as
  `{ "data-class": "internal" }`.
- **AC4.2:** `securityMetadata({ dataClass: "customer-pii", destination: "our-internal-billing-thing" })`
  passes both custom strings through unchanged.
- **AC4.3:** `securityMetadata({ user: "user_123" })` deep-equals
  `{ user: "user_123" }` — no other keys present; `securityMetadata({})`
  deep-equals `{}`.

**Verification:**
Run: `npm test --workspace @arcjet/ai`
Expected: all tests pass.

Also run: `npm run typecheck --workspace @arcjet/ai`, `npm run lint`, and
`npm run format:check` from the root.
Expected: all exit 0.

**Commit:** `feat(ai): add securityMetadata() vocabulary builder`
<!-- END_TASK_4 -->
<!-- END_SUBCOMPONENT_B -->

---

## Phase completion checklist

- [ ] `npm test --workspace @arcjet/ai` passes (context + metadata + updated smoke tests)
- [ ] `npm run typecheck --workspace @arcjet/ai` passes
- [ ] Root `npm run lint` and `npm run format:check` pass
- [ ] AC1.1–AC1.4, AC4.1–AC4.3 each have a test that names them (test description strings should mention the AC id, e.g. `"AC1.3: rejects oversize correlationId"`)
- [ ] AC1.7 deferral note stands (covered in Phase 3)
- [ ] Two commits as specified
