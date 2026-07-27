# Guard SDK Namespaces Design

## Summary

This design moves two AI-agent-security helpers out of a standalone `@arcjet/ai`
package and folds them into `@arcjet/guard` as subpath exports, split across
three layers by dependency coupling: an unchanged root (`@arcjet/guard`), a
framework-agnostic layer (`@arcjet/guard/agents`) with zero AI SDK imports, and
an SDK-coupled layer (`@arcjet/guard/vercel-ai/v7`) that proxies the agnostic
layer's exports so a consumer needs only one import path. The split exists
because ESM resolves a module's entire import graph eagerly — anything that
re-exports `guardTool` also pulls in the `ai` package — so a code path that
only needs `guardAction` (e.g. a queue worker) must have an import route that
never touches an AI SDK at all. Subpaths are versioned per vendor SDK major
(`<vendor-sdk>/v<major>`, no unversioned alias) so future SDKs, such as the
planned Vercel Eve integration, can get their own namespace without forcing
changes to the shared layer or re-litigating the directory structure.

The implementation is sequenced as six phases: scaffold the new `package.json`
exports and peer dependencies first, migrate the shared agent code (with a rename
from `createAiContext`/`ArcjetAiContext` to
`createAgentContext`/`ArcjetAgentContext`), migrate the Vercel-AI-SDK-specific
code as a thin proxying layer, delete the old `arcjet-ai/` workspace and its
release/publish wiring, update the example app and documentation to the new
import paths, and finish with full verification across guard's build, typecheck,
lint, and multi-runtime test suites. Throughout, code moves into
`@arcjet/guard`'s existing conventions (relative import extensions, co-located
`src/**/*.test.ts` tests importing source, and a stricter `tsconfig.json`) rather
than carrying over `@arcjet/ai`'s looser ones.

## Definition of Done

- The `arcjet-ai/` workspace no longer exists. Nothing publishes `@arcjet/ai`.
- `@arcjet/guard` root exports are unchanged for existing users.
- `@arcjet/guard/agents` exports the framework-agnostic helpers and is importable
  with no AI SDK installed.
- `@arcjet/guard/vercel-ai/v7` exports the Vercel-AI-SDK-coupled helpers plus
  proxy re-exports of the shared layer.
- `ai` and `@ai-sdk/provider-utils` are optional peer dependencies, so users who
  never touch an AI SDK are unaffected.
- Every behaviour the `@arcjet/ai` test suite covered still passes, under
  `@arcjet/guard`'s stricter compiler and test conventions.
- `examples/nextjs-ai-agent` runs on the new import paths with no `@arcjet/ai`
  dependency.
- The subpath convention is documented well enough that
  `@arcjet/guard/vercel-eve/v1` can be added without re-litigating structure.

## Acceptance Criteria

### guard-sdk-namespaces.AC1: Subpaths resolve as specified
- **guard-sdk-namespaces.AC1.1 Success:** `import { launchArcjet, tokenBucket } from "@arcjet/guard"` resolves, and the root export surface is unchanged from `main` (no additions, no removals).
- **guard-sdk-namespaces.AC1.2 Success:** `import { createAgentContext, securityMetadata, guardAction, captureAction, ArcjetDeniedError } from "@arcjet/guard/agents"` resolves.
- **guard-sdk-namespaces.AC1.3 Success:** `import { guardTool, aiToolsContext } from "@arcjet/guard/vercel-ai/v7"` resolves.
- **guard-sdk-namespaces.AC1.4 Success:** The v7 namespace re-exports the shared layer, and each proxied export is the *same function identity* as the one from `@arcjet/guard/agents`.
- **guard-sdk-namespaces.AC1.5 Failure:** `@arcjet/guard/vercel-ai` (unversioned) does not resolve.
- **guard-sdk-namespaces.AC1.6 Failure:** `@arcjet/guard/vercel-ai/v6` (unsupported major) does not resolve.

### guard-sdk-namespaces.AC2: The shared layer has no AI SDK coupling
- **guard-sdk-namespaces.AC2.1 Success:** No module reachable from `dist/agents/index.js` imports `ai` or any `@ai-sdk/*` package.
- **guard-sdk-namespaces.AC2.2 Success:** `@arcjet/guard/agents` imports successfully with `ai` and `@ai-sdk/provider-utils` absent from `node_modules`.
- **guard-sdk-namespaces.AC2.3 Failure:** `@arcjet/guard/vercel-ai/v7` fails to import when `ai` is absent — documenting the peer requirement rather than failing silently.

### guard-sdk-namespaces.AC3: AI SDK peers are optional
- **guard-sdk-namespaces.AC3.1 Success:** `ai` and `@ai-sdk/provider-utils` appear in `peerDependencies` and are marked optional in `peerDependenciesMeta`.
- **guard-sdk-namespaces.AC3.2 Success:** Installing a project that depends on `@arcjet/guard` without any AI SDK produces no peer-dependency warning or error.

### guard-sdk-namespaces.AC4: Migrated behaviour is preserved
- **guard-sdk-namespaces.AC4.1 Success:** Guard ALLOW → the wrapped tool executes once and an event is captured with `outcome: "success"`.
- **guard-sdk-namespaces.AC4.2 Failure:** Guard DENY → the tool never executes and the model receives an `ArcjetDenialResult` carrying `reason` and `retryable`.
- **guard-sdk-namespaces.AC4.3 Edge:** A `RATE_LIMIT` denial carries `retryAfterSeconds`; a non-rate-limit denial omits it even when a co-occurring rule result has a reset time.
- **guard-sdk-namespaces.AC4.4 Failure:** With `onGuardError: "allow"` set explicitly (opting out of the default), either guard-unavailable signal → the tool still executes (fail open) and a warning is emitted, gated on `ARCJET_LOG_LEVEL`. Both signals are covered: the guard call throwing, and a returned decision whose `hasFailedOpen()` is `true`.
- **guard-sdk-namespaces.AC4.5 Success:** A context's `correlationId` reaches both the guard call and the capture call.
- **guard-sdk-namespaces.AC4.6 Edge:** A protected tool invoked with no context warns on the first occurrence even with logging off, and stays silent afterwards unless `ARCJET_LOG_LEVEL` is set.
- **guard-sdk-namespaces.AC4.7 Failure:** The injected `contextSchema` rejects a non-string `correlationId`, and rejects `metadata` that is not a plain object. It **accepts** any plain-object metadata regardless of value types — nested objects, arrays, numbers, booleans, `null` — matching `ArcjetMetadata` (arcjet-js#6171). Validating value types here would be stricter than `guard()` itself, which drops what it cannot encode with an `AJ1017` warning rather than failing.
- **guard-sdk-namespaces.AC4.8 Success:** `guardAction` returns the function's value on ALLOW; on DENY it throws `ArcjetDeniedError` carrying the decision and never runs the function.
- **guard-sdk-namespaces.AC4.9 Success:** `captureAction` emits an event with the context's correlation id and merged metadata, with no `decisionId` and no `outcome` key.
- **guard-sdk-namespaces.AC4.10 Edge:** A client lacking `experimental_capture()` causes no throw; capture no-ops with a gated warning.
- **guard-sdk-namespaces.AC4.11 Failure:** With the default `onGuardError: "deny"`, **either** guard-unavailable signal → the wrapped tool or action does NOT execute and the outcome is captured as `denied`. `guardTool` returns an `ArcjetDenialResult` with `reason: "ERROR"` and `retryable: true`, and no `retryAfterSeconds` (the model only ever sees tool results, so the shape stays uniform). `guardAction` throws `ArcjetGuardUnavailableError` — distinct from `ArcjetDeniedError` (see AC4.12 for how the two signals are carried on it). `policy.onDeny` is not invoked on either signal.
- **guard-sdk-namespaces.AC4.12 Failure:** The two guard-unavailable signals stay distinguishable to the caller. When the guard call **threw**, `ArcjetGuardUnavailableError.cause` is that error by reference and `.decision` is absent. When a decision **failed open**, `.decision` is that `DecisionAllow` (so `errorResults()` yields the `TRANSPORT_ERROR` result) and `.cause` is `undefined`. The failed-open signal also captures the `decisionId`, which the thrown signal cannot.

### guard-sdk-namespaces.AC5: The renames are complete
- **guard-sdk-namespaces.AC5.1 Success:** `createAgentContext` and `ArcjetAgentContext` are the exported names.
- **guard-sdk-namespaces.AC5.2 Success:** No `createAiContext` or `ArcjetAiContext` identifier remains anywhere in source, tests, docs, the skill, or the example.
- **guard-sdk-namespaces.AC5.3 Failure:** `createAgentContext` rejects a caller-supplied `correlationId` that is not a string, is empty, exceeds 256 characters, or contains non-printable characters — naming the offending problem in the error and never truncating.
- **guard-sdk-namespaces.AC5.4 Success:** The enforcing helpers are exported as `guardTool` and `guardAction` (with `GuardToolPolicy` / `GuardActionPolicy`); no `protectTool`, `protectAction`, `ProtectToolPolicy` or `ProtectActionPolicy` identifier remains anywhere in source, tests, docs, the skill, or the example.

### guard-sdk-namespaces.AC6: The separate package is gone
- **guard-sdk-namespaces.AC6.1 Success:** `arcjet-ai/` does not exist and no workspace named `@arcjet/ai` resolves.
- **guard-sdk-namespaces.AC6.2 Success:** `git diff main` is empty for `.github/.release-please-manifest.json`, `.github/release-please-config.json`, and `.github/workflows/publish.yml`.
- **guard-sdk-namespaces.AC6.3 Success:** `.github/workflows/reusable-examples.yml` still lists `nextjs-ai-agent`.

### guard-sdk-namespaces.AC7: The example runs on the new paths
- **guard-sdk-namespaces.AC7.1 Success:** The example imports only from `@arcjet/guard`, `@arcjet/guard/agents`, and `@arcjet/guard/vercel-ai/v7`, and its `package.json` has no `@arcjet/ai` dependency.
- **guard-sdk-namespaces.AC7.2 Success:** The example builds.

### guard-sdk-namespaces.AC8: Documentation carries the convention
- **guard-sdk-namespaces.AC8.1 Success:** The integration skill lives under `arcjet-guard/skills/`, and `skills/` is included in the package's `files`.
- **guard-sdk-namespaces.AC8.2 Success:** Every code example in the README, JSDoc, and skill compiles against the installed typings.
- **guard-sdk-namespaces.AC8.3 Success:** The README states the `<vendor-sdk>/v<major>` convention, the optional-peer requirement, and the no-unversioned-alias rule, and names `vercel-eve/v1` as the next target.

### guard-sdk-namespaces.AC9: Guard's own verification stays green
- **guard-sdk-namespaces.AC9.1 Success:** Build, `tsconfig.json` and `tsconfig.lint.json` typechecks, lint, and unit tests with coverage all pass.
- **guard-sdk-namespaces.AC9.2 Success:** The node, fetch, bun, deno, and cloudflare runtime suites all pass.

## Glossary

- **Subpath export**: A package.json `exports` map entry that lets one npm
  package expose multiple independent entry points (e.g. `@arcjet/guard/agents`)
  instead of publishing separate packages.
- **Peer dependency (optional)**: A dependency a package expects the consumer to
  install themselves; marking it optional via `peerDependenciesMeta` suppresses
  install-time warnings/errors for consumers who don't need it — here, `ai` and
  `@ai-sdk/provider-utils`.
- **ESM eager import graph resolution**: ECMAScript Modules resolve every module
  reachable from an entry point at load time, so importing any file that
  re-exports an AI-SDK-coupled function transitively loads the AI SDK itself,
  even if that function is never called.
- **Vercel AI SDK**: The third-party `ai` npm package (plus `@ai-sdk/*` helpers)
  providing `Tool`, `ToolSet`, and `generateText`-style APIs for building LLM
  tool-calling applications; the source of the "SDK-coupled" layer's types.
- **Vercel Eve**: A newer, filesystem-first agent framework from Vercel (one
  `defineTool` per file, no author-controlled call site, session-derived
  correlation ids) cited as the next namespace this convention must accommodate.
- **Proxy re-export**: `export * from "../../agents/index.ts"` inside the
  SDK-coupled layer — re-exporting the shared layer's functions so they keep the
  same function identity, rather than wrapping or duplicating them.
- **`ArcjetAgentContext` / correlation id**: The context object (a
  `correlationId` plus optional string metadata) threaded through a guard call
  and its corresponding capture call to associate them; renamed from
  `ArcjetAiContext`.
- **`runGuarded` engine**: The internal sequencing logic (guard → deny → execute
  → capture) that both `guardAction` and `guardTool` build on.
- **`guardAction` / `captureAction`**: Framework-agnostic helpers for non-tool
  code paths — `guardAction` runs a guarded function and throws on deny;
  `captureAction` emits a post-hoc event without a guard decision.
- **`guardTool` / `aiToolsContext`**: Vercel-AI-SDK-specific helpers —
  `guardTool` wraps a `Tool` with guard enforcement; `aiToolsContext` fans a
  single context out across a `ToolSet` so each tool call carries it.
- **`ArcjetDeniedError` / `ArcjetDenialResult`**: The two ways a denial surfaces
  — a thrown error (agnostic layer, for direct function calls) versus a
  structured result object returned to the model (SDK layer, since a tool call
  can't simply throw into the model's control flow).
- **`MockLanguageModelV4`**: A Vercel AI SDK test double for simulating model
  responses, used in this design's `generateText` integration tests for
  `guardTool`.
- **Guard unavailable**: Either of the two signals that a policy could not be
  evaluated — (a) the `guard()` call throwing, or (b) `guard()` returning a
  decision whose `hasFailedOpen()` is `true`. (b) is the *normal* signal during
  an Arcjet outage: the guard client converts transport failures into a
  synthesized ALLOW carrying a `TRANSPORT_ERROR` error result
  (`arcjet-guard/src/client.ts`), so (a) means something unexpected broke.
  `onGuardError` governs both.
- **Fail open**: Executing the wrapped tool anyway when the guard is
  unavailable, with a gated warning logged instead of blocking. Selected with
  `onGuardError: "allow"`; the helpers default to `"deny"` (fail closed).
- **`ARCJET_LOG_LEVEL` / warning gate**: An environment-controlled logging
  threshold used to suppress repeated or default-off warnings (e.g. missing
  context, fail-open, missing capture support), except for a one-time
  first-occurrence warning.
- **oxlint**: The lint tool `@arcjet/guard` runs
  (`oxlint --tsconfig=tsconfig.lint.json`), which the migrated code must satisfy
  even though `@arcjet/ai` had no package-level lint script.
- **tsdown**: The build tool config (`tsdown.config.ts`) that globs
  `src/**/*.ts` (excluding tests) with `unbundle: true`, meaning new
  `src/agents/` and `src/vercel-ai/v7/` files are picked up without config
  changes.
- **Release Please**: The automation behind `.github/release-please-config.json`
  and `.release-please-manifest.json`, which tracks per-package
  versions/changelogs for publishing; this design requires its `@arcjet/ai`
  entries to be removed with no diff left against `main`.

## Architecture

Framework helpers ship as subpath exports of the existing `@arcjet/guard`
package rather than as separate packages, namespaced by SDK **and** major
version: `@arcjet/guard/<vendor-sdk>/v<major>`.

Three layers:

**Core — `@arcjet/guard`.** Unchanged. `launchArcjet`, rule builders, and the
existing runtime-conditional exports (`node`/`bun`/`fetch`). No new exports.

**Shared agent layer — `@arcjet/guard/agents`.** Everything that does not depend
on an AI SDK: correlation context creation, the security metadata vocabulary,
`guardAction`/`captureAction` for non-tool code paths, and the internal
`runGuarded` engine that sequences guard → deny → execute → capture.

**SDK-coupled layer — `@arcjet/guard/vercel-ai/v7`.** Only what touches the
Vercel AI SDK's types: `guardTool` and `aiToolsContext`. It also re-exports the
shared layer, so an AI SDK application can use one import path.

The layering is forced by module resolution, not preference. ESM eagerly
resolves a module's whole import graph, so any entry point that re-exports
`guardTool` also loads `ai`. A queue worker that only wants `guardAction`
must therefore have a path that never reaches an AI SDK import — hence
`/agents` existing separately, and hence the peers being optional.

Proxy re-exports (rather than requiring two imports) exist to give each
`<vendor-sdk>/v<major>` namespace room to diverge. Investigation of Vercel's Eve
framework — the next intended target — shows the divergence is larger than a
changed signature: Eve is filesystem-first (`agent/tools/*.ts`, one
default-exported `defineTool` per file), has no author-controlled call site, so
`toolsContext` fan-out has no analogue at all, derives correlation from a durable
session id rather than a caller-generated ULID, and adds guard surfaces the AI
SDK lacks (sandbox command execution, channel entry points, subagent
delegation). A namespace must be able to replace, rename, or omit any part of
the surface; proxying the parts that happen to be identical keeps that option
open without duplicating logic.

No unversioned aliases. `@arcjet/guard/vercel-ai` does not resolve — an import's
meaning must not change when a new SDK major is supported.

### Contract: `@arcjet/guard/agents`

```typescript
interface ArcjetAgentContext {
  correlationId: string;
  // ArcjetMetadata = Record<string, unknown> — any JSON-serializable value,
  // nested objects and arrays included (arcjet-js#6171).
  metadata?: ArcjetMetadata;
}

function createAgentContext(init?: {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}): ArcjetAgentContext;

// Field values stay string-typed — the vocabulary is a fixed set of
// enum-like strings. Only the RETURN widens, so it composes by spread with
// richer caller metadata.
function securityMetadata(fields: SecurityMetadataFields): ArcjetMetadata;

function guardAction<T>(
  client: ArcjetAgentClient,
  ctx: ArcjetAgentContext,
  policy: GuardActionPolicy,   // includes onGuardError?: OnGuardError
  fn: () => Promise<T>,
): Promise<T>;

function captureAction(
  client: ArcjetAgentClient,
  ctx: ArcjetAgentContext,
  options: CaptureActionOptions,
): void;

class ArcjetDeniedError extends Error {
  readonly decision: DecisionDeny;
}

// Shared by both policies (GuardToolPolicy and GuardActionPolicy). Defaults to
// "deny": these helpers wrap consequential effects, so an unevaluable policy
// blocks the call. "allow" opts back into the platform's fail-open convention.
type OnGuardError = "allow" | "deny";

// Thrown by guardAction when the guard is unavailable and onGuardError is
// "deny". Deliberately NOT ArcjetDeniedError: "a rule denied you" and "the policy
// could not be evaluated" are operationally different, and only the latter is
// usually worth alerting on. Keeps ArcjetDeniedError.decision non-optional.
//
// Exactly one of `cause` / `decision` is populated, which is how a caller tells
// the two guard-unavailable signals apart.
class ArcjetGuardUnavailableError extends Error {
  readonly action: string;
  // The thrown error, by reference. Absent when a decision failed open.
  readonly cause?: unknown;
  // The fail-open ALLOW decision; call errorResults() for the TRANSPORT_ERROR
  // detail. Absent when the guard call threw.
  readonly decision?: DecisionAllow;
}
```

### Contract: `@arcjet/guard/vercel-ai/v7`

```typescript
function guardTool<T extends Tool>(
  client: ArcjetAgentClient,
  tool: T,
  policy: GuardToolPolicy<T>,  // includes onGuardError?: OnGuardError
): Tool<InferToolInput<T>, InferToolOutput<T>, ArcjetAgentContext | undefined>;


function aiToolsContext<TOOLS extends ToolSet>(
  ctx: ArcjetAgentContext,
  tools: TOOLS,
): InferToolSetContext<TOOLS>;

interface ArcjetDenialResult {
  arcjetDenied: true;
  reason: string;
  message: string;
  retryable: boolean;
  retryAfterSeconds?: number;
}

// plus `export * from "../../agents/index.ts"`
```

### Naming

`createAiContext`/`ArcjetAiContext` are renamed to
`createAgentContext`/`ArcjetAgentContext`. The context is provider-agnostic and
now lives on an `/agents` path; Eve would reuse the same type with a
session-derived id. Renaming is free while nothing is published.

## Existing Patterns

This design adopts `@arcjet/guard`'s conventions rather than carrying
`@arcjet/ai`'s, which differ in four ways that affect every moved file:

- **Relative imports.** Guard's `src/` imports siblings as `./foo.ts`
  (`rewriteRelativeImportExtensions` rewrites them on emit). `@arcjet/ai` used
  `./foo.js`. Every moved import specifier changes.
- **Test placement.** Guard co-locates tests as `src/**/*.test.ts` and imports
  **source** (`from "./convert.ts"`). `@arcjet/ai` used a separate `test/`
  directory importing built output (`from "../dist/index.js"`). Tests move
  next to their subjects and retarget source.
- **Compiler strictness.** `arcjet-guard/tsconfig.json` is standalone and
  stricter than the `tsconfig.base.json` that `arcjet-ai/tsconfig.json`
  extended, adding `noUncheckedIndexedAccess`,
  `noPropertyAccessFromIndexSignature`, `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `erasableSyntaxOnly`, `isolatedModules`, and `moduleDetection: force`. Moved
  code must satisfy all of them, and also `tsconfig.lint.json`.
- **Lint.** Guard runs `oxlint --tsconfig=tsconfig.lint.json`; `arcjet-ai` had
  no package-level lint script.

`securityMetadata()` lands at `arcjet-guard/src/agents/vocabulary.ts`, **not**
`metadata.ts`: arcjet-js#6171 added `arcjet-guard/src/metadata.ts` (356 lines of
JSON encoding, budget enforcement and `AJ1017` handling), and two same-named files
doing unrelated jobs in one package invites the wrong import. Same reasoning as
`client.ts` → `capture.ts`.

Build configuration needs no change: `arcjet-guard/tsdown.config.ts` already
globs `entry: ["src/**/*.ts", "!src/**/*.test.ts"]` with `unbundle: true`, so
`src/agents/` and `src/vercel-ai/v7/` emit to matching `dist/` paths.

Subpath exports follow the existing pattern in `arcjet-guard/package.json`
(`./node`, `./bun`, `./fetch`), extended to two segments. Unlike the root
export, the agent subpaths need no runtime-conditional variants: they receive a
client as a parameter, and only `launchArcjet` varies by runtime.

## Implementation Phases

<!-- START_PHASE_1 -->
### Phase 1: Guard package scaffolding

**Goal:** `@arcjet/guard` can host and resolve the new subpaths before any logic
moves.

**Components:**
- `arcjet-guard/package.json` — add `./agents` and `./vercel-ai/v7` to
  `exports`; add `ai` and `@ai-sdk/provider-utils` to `peerDependencies` with
  `peerDependenciesMeta` marking both optional; add both to `devDependencies`;
  add `skills/` to `files`.
- `arcjet-guard/src/agents/index.ts` and
  `arcjet-guard/src/vercel-ai/v7/index.ts` — placeholder barrels.
- Root `package-lock.json` — refreshed for the new devDependencies.

**Dependencies:** None.

**Covers:** `guard-sdk-namespaces.AC3.1`, `.AC3.2`.

**Done when:** `npm install` succeeds; `npm run build --workspace @arcjet/guard`
emits `dist/agents/index.js` and `dist/vercel-ai/v7/index.js`; both typechecks
and lint pass; a nested `src/**/*.test.ts` file is confirmed to be picked up by
the existing `test-unit` script glob.
<!-- END_PHASE_1 -->

<!-- START_PHASE_2 -->
### Phase 2: Shared agent layer

**Goal:** The framework-agnostic helpers live at `@arcjet/guard/agents`, renamed,
with no AI SDK in their import graph.

**Components:**
- `arcjet-guard/src/agents/context.ts` — `createAgentContext`,
  `ArcjetAgentContext` (renamed from `createAiContext`/`ArcjetAiContext`).
- `arcjet-guard/src/agents/metadata.ts` — `securityMetadata`.
- `arcjet-guard/src/agents/capture.ts` — `CaptureOptions`, the structural
  `ArcjetAgentClient` type, capture feature detection, warning gate.
- `arcjet-guard/src/agents/guarded.ts` — internal `runGuarded` engine.
- `arcjet-guard/src/agents/guard-action.ts` — `guardAction`,
  `captureAction`, `ArcjetDeniedError`.
- `arcjet-guard/src/agents/ulid.ts`, `arcjet-guard/src/agents/internal.ts` —
  correlation id generation and the protected-tool brand symbol.
- `arcjet-guard/src/agents/index.ts` — public barrel.
- Co-located tests for each, migrated from `arcjet-ai/test/` and retargeted at
  source.

**Dependencies:** Phase 1.

**Covers:** `guard-sdk-namespaces.AC2.1`, `.AC2.2`, `.AC4.8`, `.AC4.9`,
`.AC4.10`, `.AC5.1`, `.AC5.2`, `.AC5.3`.

**Done when:** Tests for the above ACs pass; a static check confirms nothing
reachable from `dist/agents/` imports `ai` or `@ai-sdk/*`; guard's build,
typechecks, and lint pass.
<!-- END_PHASE_2 -->

<!-- START_PHASE_3 -->
### Phase 3: Vercel AI SDK v7 namespace

**Goal:** The SDK-coupled helpers live at `@arcjet/guard/vercel-ai/v7` and proxy
the shared layer.

**Components:**
- `arcjet-guard/src/vercel-ai/v7/guard-tool.ts` — `guardTool`,
  `ArcjetDenialResult`, `GuardToolPolicy`, the injected `contextSchema` and its
  validation.
- `arcjet-guard/src/vercel-ai/v7/tools-context.ts` — `aiToolsContext`.
- `arcjet-guard/src/vercel-ai/v7/index.ts` — own exports plus
  `export * from "../../agents/index.ts"`.
- Co-located tests, including the `generateText` integration tests using
  `MockLanguageModelV4`.

**Dependencies:** Phase 2.

**Covers:** `guard-sdk-namespaces.AC1.1`–`.AC1.6`, `.AC2.3`, `.AC4.1`–`.AC4.7`.

**Done when:** Tests for the above ACs pass, including that the proxied shared
exports are the same function identities as those from `@arcjet/guard/agents`,
and that unversioned/unknown-version subpaths do not resolve.
<!-- END_PHASE_3 -->

<!-- START_PHASE_4 -->
### Phase 4: Remove the `@arcjet/ai` workspace

**Goal:** No trace of a separate package remains.

**Components:**
- Delete `arcjet-ai/` entirely.
- `.github/.release-please-manifest.json`, `.github/release-please-config.json`,
  `.github/workflows/publish.yml` — remove the `arcjet-ai` / `@arcjet/ai`
  entries added on this branch.
- `.github/workflows/reusable-examples.yml` — **keep** the `nextjs-ai-agent`
  entry.
- Root `package-lock.json` — drop the workspace.

**Dependencies:** Phases 2 and 3 (source must already be moved).

**Covers:** `guard-sdk-namespaces.AC6.1`, `.AC6.2`, `.AC6.3`.

**Done when:** `arcjet-ai/` is absent; no workspace named `@arcjet/ai` resolves;
`git diff main` is empty for the three release/publish files; the examples
workflow still lists `nextjs-ai-agent`.
<!-- END_PHASE_4 -->

<!-- START_PHASE_5 -->
### Phase 5: Example and documentation migration

**Goal:** The example and all prose demonstrate the new import paths.

**Components:**
- `examples/nextjs-ai-agent/package.json` — drop the `@arcjet/ai` dependency.
- `examples/nextjs-ai-agent/lib/arcjet.ts`,
  `examples/nextjs-ai-agent/app/api/agent/route.ts`,
  `examples/nextjs-ai-agent/workflows/support-agent.ts` — import core from
  `@arcjet/guard`, agnostic helpers from `@arcjet/guard/agents`, and
  `guardTool`/`aiToolsContext` from `@arcjet/guard/vercel-ai/v7`.
- `arcjet-guard/skills/` — the integration skill moved from
  `arcjet-ai/skills/integrate-arcjet-ai/`, renamed and rewritten for the new
  paths.
- `arcjet-guard/README.md` — document the three layers, the
  `<vendor-sdk>/v<major>` convention, the optional peers, and the
  no-unversioned-alias rule, naming `vercel-eve/v1` as the next target.

**Dependencies:** Phases 3 and 4.

**Covers:** `guard-sdk-namespaces.AC7.1`, `.AC7.2`, `.AC8.1`, `.AC8.2`,
`.AC8.3`.

**Done when:** The example builds; every code example in the README, JSDoc, and
skill compiles against the installed typings.
<!-- END_PHASE_5 -->

<!-- START_PHASE_6 -->
### Phase 6: Full verification and delivery

**Goal:** The branch is green and the change is described accurately.

**Components:**
- Full `@arcjet/guard` verification including the runtime suites.
- PR #6164 title and body rewritten to describe the subpath structure.
- Linear ENG-987 retitled and rewritten — it no longer ships a package.
- Remove this design plan and its implementation plan as the final commit.

**Dependencies:** All previous phases.

**Covers:** `guard-sdk-namespaces.AC9.1`, `.AC9.2`.

**Done when:** Build, both typechecks, lint, unit tests with coverage, and the
node/fetch/bun/deno/cloudflare runtime suites all pass; the example builds; PR
and Linear text match the delivered structure.
<!-- END_PHASE_6 -->

## Additional Considerations

**Capture availability.** `experimental_capture()` is not on `main` — it exists
only on `origin/quinn/experimental-capture`. The structural client type and
runtime feature detection carry over unchanged so this work stays independent of
that branch. Once capture lands, `ArcjetAgentClient` collapses into guard's real
client type and the detection can be deleted; the code should carry a comment
saying so. Feature-detecting a method on the same package's own client is a
known, temporary oddity.

**Peer-dependency verification.** Optional peers are only meaningfully verified
by installing without them. Phase 2's static import-graph check is the practical
substitute for a full clean-install matrix in CI.

**Fail-open vs fail-closed.** Both policies take `onGuardError: "allow" | "deny"`,
**defaulting to `"deny"`**. Review (davidmytton) raised that an agent tool call
which sends mail or updates a ticket carries different risk from a page view, and
asked for the default to be fail-closed. It is safe to choose that here: these
subpaths have never shipped, so there is no installed base to change under, and
picking `"allow"` now would make `"deny"` a breaking change later. The risk
asymmetry also favours it — a blocked tool call returns a *retryable*
`reason: "ERROR"` result the model can back off on, whereas a blocked page view
has no such recovery path.

**`onGuardError` governs both guard-unavailable signals, which is what makes the
default meaningful.** The distinction matters more than the default value:

- (a) `guard()` **throws**. Rare — the client converts transport failures into
  decisions rather than throwing, so this means something unexpected broke.
- (b) `guard()` returns an ALLOW decision whose **`hasFailedOpen()` is `true`**.
  This is the normal signal during an Arcjet outage
  (`arcjet-guard/src/client.ts` synthesizes an ALLOW carrying a
  `TRANSPORT_ERROR` error result; `convert.ts` derives
  `hasFailedOpen: () => conclusion === "ALLOW" && errored.length > 0`).

Scoping `onGuardError` to (a) alone — as the first draft of this design did —
would have produced a fail-closed default that almost never fires during the
incident it exists for. `@arcjet/guard` already documents the intended idiom on
`hasFailedOpen()`: *"Gate a fail-closed policy on this: `if
(decision.hasFailedOpen()) return deny()`"* (`arcjet-guard/src/types.ts`).

Two costs are accepted deliberately. First, `@arcjet/guard` now carries opposite
defaults at two layers: the client fails open by construction, its `/agents`
helpers fail closed. The docs resolve this in one line — the client *reports* that
it failed open, the helper *decides* what to do about it. Second,
`guardAction`'s fail-closed surface is a throw, the harder of the two failure
modes, and it is now the default: a background job wrapped in `guardAction` fails
during an Arcjet incident instead of degrading. That is the trade-off being chosen,
and it is documented loudly rather than left to be discovered.

The fail-closed path deliberately does **not** reuse `ArcjetDeniedError`. Being
denied by a rule and being unable to evaluate a rule are different operational
events — the second usually warrants an alert — so `guardAction` throws
`ArcjetGuardUnavailableError`, and `ArcjetDeniedError.decision` stays
non-optional. Confirmed by davidmytton on the PR: *"Agreed on splitting
`ArcjetGuardUnavailableError` and `ArcjetDenialResult` because it gives visibility
to decide what to do."* The error keeps the two signals apart — `cause` for (a),
`decision` for (b) — so an operator can tell an SDK bug from an Arcjet outage.
`guardTool` keeps the single `ArcjetDenialResult` shape with `reason: "ERROR"` for
both, because a model only ever observes tool results and a second result type
would just be harder to prompt against.

**`runtimeContext` is not a substitute for `toolsContext`.** Verified against the
installed typings (`@ai-sdk/provider-utils@5.0.12`): `ToolExecutionOptions`
contains only `toolCallId`, `messages`, `abortSignal?`, `context` and
`experimental_sandbox?`. `runtimeContext` is exposed to orchestration hooks
(`prepareStep`, step/result objects, approval functions, telemetry's `enrichSpan`)
but **not** to a tool's `execute`. Correlation must therefore ride on
`toolsContext` + the injected `contextSchema`; `aiToolsContext` is necessary rather
than redundant. `runtimeContext` remains the right carrier if capture later moves
onto AI SDK telemetry, which is tracked separately.

**Depends on arcjet-js#6171 (merged 2026-07-27).** That PR widened `metadata` from
flat strings to any JSON-serializable value and exported
`ArcjetMetadata = Record<string, unknown>` from `@arcjet/guard`. The branch is
rebased onto it. Three consequences: the helpers' metadata types widen to
`ArcjetMetadata`; the injected `contextSchema` must stop validating value types
(see AC4.7); and the skill's metadata-caps guidance is replaced by #6171's
server-enforced limits — 128 top-level keys, 4 KiB per serialized value, depth 10,
key names limited to letters/digits/`-`/`.`/`_`, with every dropped key reported on
`decision.warnings`. Nothing about metadata can fail a call or change a decision,
and metadata is excluded from fingerprinting. This resolves the "no longer
accurate" review comment on the skill without needing to ask — #6171's
`arcjet-guard/README.md` section is the authoritative source.

**Extensibility.** Adding a namespace means a new `src/<vendor-sdk>/v<major>/`
directory, a new `exports` entry, and any new optional peer — no changes to the
shared layer or the build config. If a future SDK needs a helper the shared layer
cannot express, that helper lives in the namespace rather than being generalised
prematurely.
