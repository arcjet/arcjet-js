# Vercel Eve Namespace Implementation Plan — Phase 6: Example app, skill and documentation

**Goal:** A developer reading the README, or a coding agent following the skill, can integrate an Eve agent unaided — and the ADR stops contradicting the code.

**Architecture:** A runnable Eve agent under `examples/` is the only place in this repo where `eve` is a real runtime dependency, which makes it the only place the `defineTool`/`defineHook` interop is exercised for real. The skill teaches the decision rule that is genuinely different from the Vercel AI SDK's, and the README and ADR are corrected to say `v0`.

**Tech Stack:** Eve (Node ≥24), TypeScript, `@arcjet/guard` from the workspace.

**Scope:** Phase 6 of 8 from `docs/design-plans/2026-08-06-vercel-eve-namespace.md`.

**Codebase verified:** 2026-08-06

---

## Acceptance Criteria Coverage

This phase implements and tests:

### vercel-eve-namespace.AC7: Example, skill and documentation
- **vercel-eve-namespace.AC7.1 Success:** The example app builds in CI on Node 24 (Eve's floor — the examples workflow defaults to Node 22 and needs a per-example override) and exercises all four helpers.
- **vercel-eve-namespace.AC7.2 Success:** Every code example in the README, JSDoc, skill and example app compiles against the installed `eve` and `@arcjet/guard` typings.
- **vercel-eve-namespace.AC7.3 Success:** `arcjet-guard/README.md` documents the `vercel-eve/v0` path, the `eve` optional peer, the Node 24 floor, and why the segment is `v0` rather than `v1`.
- **vercel-eve-namespace.AC7.4 Success:** The subpath-namespaces ADR is updated: its three `vercel-eve/v1` references (decision 3, alternative 9, and the Related-decisions "future decision" entry) become `v0` with the pre-1.0 reasoning recorded, and the "future decision" entry is resolved rather than left open — recording which of its predictions held. No `vercel-ai` version string changes and no unrelated ADR text changes. The resolved entry also records that the sandbox-command-execution guard surface claimed by the superseded `2026-07-27-guard-sdk-namespaces` design plan did not hold; that claim is **not** in the ADR itself, so this is a new note rather than a correction to existing text.
- **vercel-eve-namespace.AC7.5 Success:** A fresh coding-agent session given only the skill and an Eve agent with one connection and one authored tool completes the integration with only clarifying questions (manual verification, one recorded transcript).

---

## Context an engineer needs before starting

- **Examples conventions:** `examples/nextjs-ai-agent/` is the reference — a framework-named directory with `README.md`, `.env.local.example`, `.gitignore`, `package.json`, its own `package-lock.json`, and a `typecheck` script. CI runs `npm ci && npm run build --if-present && npm run typecheck` in the example directory.
- **Examples CI:** `.github/workflows/reusable-examples.yml` has a `matrix.folder` list and an `include:` block for per-folder overrides. The Node version is `${{ matrix.node-version || '22' }}`, and `astro` already demonstrates the override pattern. The Eve example needs `node-version: 24`.
- **Dependency updates:** there is **no** per-example dependency-update wiring to add. `.github/dependabot.yml` sets `open-pull-requests-limit: 0` for the whole repo (security updates only) and Renovate handles version updates from `renovate.json`, which does not enumerate examples. Add nothing.
- **Skill conventions:** `arcjet-guard/skills/integrate-arcjet-guard-agents/SKILL.md` — YAML front matter with `name`, `description`, `license`, `compatibility`, `metadata.author`, then a decision rule, "Questions to ask the human first", numbered steps, and a verification section. `skills/` is already in the package's `files`, so a new skill directory ships automatically.
- **README:** the relevant sections are `## SDK namespaces: core and integrations` (line ~615) through `### Rules derived from tool input` (line ~790). `### Vendor SDK integration` currently opens with "Currently available:" and lists one path.
- **ADR:** `../arcjet/docs/adrs/2026-07-28-guard-sdk-subpath-namespaces.md`. It names the path `vercel-eve/v1` in **three** places — decision 3, alternative 9, and the Related-decisions "future decision" entry (lines 52, 175, 256 as of 2026-08-06). Two further passages mention Eve with **no** version path: alternative 3 and the glossary. It lives in a **different repository** — commit it there separately.

---

<!-- START_SUBCOMPONENT_A (tasks 1-3) -->
<!-- START_TASK_1 -->
### Task 1: Scaffold the example Eve agent

**Verifies:** None (infrastructure).

**Files:**
- Create: `examples/eve-agent/package.json`
- Create: `examples/eve-agent/tsconfig.json`
- Create: `examples/eve-agent/.gitignore`
- Create: `examples/eve-agent/.env.local.example`
- Create: `examples/eve-agent/README.md`
- Create: `examples/eve-agent/agent/agent.ts`

**Implementation:**

Model the scaffolding on `../arcjet/apps/toto`, which is a working Eve agent, rather than on the Next.js examples — the file layout is entirely different (`agent/` with path-derived capabilities, `eve build` / `eve dev` scripts). Read `../arcjet/apps/toto/package.json` and `tsconfig.json` first.

`package.json` needs: `"build": "eve build"`, `"typecheck": "tsc -p tsconfig.json"`, dependencies on `eve`, `ai`, `zod`, and `@arcjet/guard` (as a workspace-resolved version, matching how `examples/nextjs-ai-agent/package.json` references it — check whether that is a version range or `file:`, and match it).

`.env.local.example` documents `ARCJET_KEY` and whatever Eve needs for a model (`AI_GATEWAY_API_KEY` or equivalent — confirm from Eve's docs in `node_modules/eve/docs/`).

`agent/agent.ts` is `defineAgent({ model, modelContextWindowTokens })`. toto's comment explains why `modelContextWindowTokens` is set explicitly (the gateway catalog lacks context-window metadata for some slugs and `eve build` then fails in CI) — that failure mode will hit this example in CI too, so carry the same explicit value.

**Verification:**

```bash
cd examples/eve-agent
npm install
npm run typecheck
npm run build
```

Expected: all three succeed on Node 24. On Node 22, `npm install` will warn and `eve build` may fail — that is expected and is why Task 5 adds the CI override.

**Commit:** `docs(examples): scaffold an Eve agent example`
<!-- END_TASK_1 -->

<!-- START_TASK_2 -->
### Task 2: Exercise all four helpers in the example

**Verifies:** vercel-eve-namespace.AC7.1 (the coverage half), and it is the real end-to-end verification of the `defineTool`/`defineHook` interop that Phases 4 and 5 could only assert structurally.

**Files:**
- Create: `examples/eve-agent/agent/arcjet.ts`
- Create: `examples/eve-agent/agent/tools/lookup_order.ts`
- Create: `examples/eve-agent/agent/connections/orders.ts`
- Create: `examples/eve-agent/agent/channels/webhook.ts`
- Create: `examples/eve-agent/agent/hooks/arcjet.ts`

**Implementation:**

`agent/arcjet.ts` — launch the client once at module scope and declare the rules. Follow toto's shape: read `ARCJET_KEY` and an optional base URL from the environment, build the rule instances at module scope so they are not reconstructed per call.

`agent/tools/lookup_order.ts` — an authored tool wrapped with `guardTool`, demonstrating the `defineTool`-then-wrap order:

```ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/vercel-eve/v0";

import { arcjet, orderLookupLimit } from "../arcjet.js";

export default guardTool(
  arcjet,
  defineTool({
    description: "Look up an order by number",
    inputSchema: z.object({ orderNumber: z.string() }),
    async execute(input, ctx) {
      return { orderNumber: input.orderNumber, status: "shipped" };
    },
  }),
  {
    action: "order.looked-up",
    rules: (input) => [orderLookupLimit({ key: input.orderNumber, requested: 1 })],
  },
);
```

Note the import extension: an Eve agent's own source uses `.js` specifiers for relative imports (toto does), unlike `@arcjet/guard`'s `.ts`. Match the target framework, not this repo.

Deliberately give this tool **no** `outputSchema`, and say why in a comment referencing Phase 4 Task 1's finding.

`agent/connections/orders.ts` — an OpenAPI connection with a `guardApproval` gate, which is the surface `guardTool` cannot reach. A small inline spec against a public test API (or a local stub) is enough; the point is the gate:

```ts
export default defineOpenAPIConnection({
  spec,
  baseUrl: process.env.ORDERS_API_BASE_URL ?? "https://example.invalid",
  description: "…",
  operations: { allow: ["GetOrder"] },
  approval: guardApproval(arcjet, {
    action: "orders-api.read",
    rules: (ctx) => [apiLimit({ key: ctx.session.id, requested: 1 })],
  }),
});
```

`agent/channels/webhook.ts` — a channel route that screens inbound text with `guardInbound` before dispatching. Use the plain HTTP channel rather than Slack so the example needs no third-party credentials; read `node_modules/eve/dist/src/public/definitions/channel.d.ts` and Eve's docs for the authored-route shape (`POST`, `RouteContext`, `ctx.agent.run`). The correlation id passed to `guardInbound` is whatever identity the route has — a delivery id from the request body, or the continuation token it is about to use.

`agent/hooks/arcjet.ts`:

```ts
import { defineHook } from "eve/hooks";
import { arcjetHooks } from "@arcjet/guard/vercel-eve/v0";

import { arcjet } from "../arcjet.js";

export default defineHook(arcjetHooks(arcjet));
```

That one line is the `ExactDefinition` verification Phase 5 Task 3 deferred to this phase. If it does not typecheck, the fix is `arcjetHooks`'s return type — go back and change it rather than casting here.

**Verification:**

```bash
cd examples/eve-agent
npm run typecheck
npm run build
```

Expected: both pass. The build is what proves Eve's compiler accepts a wrapped `defineTool` as a tool file's default export — the single most load-bearing assumption in Phase 4, and the only place it is tested against the real toolchain.

If `eve build` rejects the wrapped default export, stop. That is a design-level finding, not an example bug: it would mean `guardTool` must be expressed differently (for instance as a `policy` argument threaded into `defineTool`'s own `execute`), and it needs surfacing before Phase 7 depends on it.

**Commit:** `docs(examples): guard an Eve agent's tool, connection, channel and hooks`
<!-- END_TASK_2 -->

<!-- START_TASK_3 -->
### Task 3: Write the example README

**Verifies:** None (documentation).

**Files:**
- Modify: `examples/eve-agent/README.md`

**Implementation:** follow `examples/nextjs-ai-agent/README.md`'s structure. Cover: what the example demonstrates, the Node 24 requirement and why (Eve's `engines`), how to get an `ARCJET_KEY`, `npm install && npm run dev`, and what to look for in the Arcjet Console afterwards — specifically that the inbound decision, the gate decisions and the result events share a correlation id, and that the inbound one joins through the `session.started` record.

State the two-hop join plainly. A reader who sees two correlation ids and no explanation will file it as a bug.

**Commit:** `docs(examples): document the Eve agent example`
<!-- END_TASK_3 -->
<!-- END_SUBCOMPONENT_A -->

<!-- START_TASK_4 -->
### Task 4: The integration skill

**Verifies:** vercel-eve-namespace.AC7.5, and AC7.2 for the skill's own code blocks.

**Files:**
- Create: `arcjet-guard/skills/integrate-arcjet-guard-eve/SKILL.md`

**Implementation:**

A sibling to `integrate-arcjet-guard-agents`, not a rewrite of it. Read that file first and match its front matter, voice and step structure.

Front matter: `name: integrate-arcjet-guard-eve`; a `description` that names Vercel Eve and the trigger phrases an agent would see ("add Arcjet to my Eve agent", "rate limit my agent's tools", "screen inbound messages"); `compatibility: Requires the target app to use Vercel Eve (eve >= 0.30 < 1) on Node.js >= 24.`

The decision rule is the part that must be right, because it is what a reader gets wrong by analogy with the AI SDK:

- **A connection's tools** (`defineOpenAPIConnection`, `defineMcpClientConnection`) → `guardApproval` on the connection. There is no local `execute`; nothing else can gate these.
- **An authored tool** (`agent/tools/*.ts`) → `guardApproval` if you only need to gate it; `guardTool` if you also want its execution outcome captured at the call site. `guardTool` is the only one of the two that can observe success or failure.
- **An inbound message** (`agent/channels/*.ts`) → `guardInbound`. This is the only place a turn can be declined before it starts.
- **Everything else** → `arcjetHooks`. Hooks are observe-only by design and cannot block.

Then the things a reader will otherwise get wrong, each stated once and plainly:

1. **Hooks cannot reject a turn.** Their handlers return `void`. If the request is "block prompt injection", the answer is `guardInbound` at the channel, not a hook.
2. **The import path is versioned and there is no alias.** `@arcjet/guard/vercel-eve/v0`. `@arcjet/guard/vercel-eve` does not resolve, and neither does `/v1`. The segment tracks Eve's major, and Eve is pre-1.0.
3. **Correlation is not passed; it is read.** Never call `createAgentContext` inside an Eve callback — the session id already is the run identity, and generating a second one splits the Sequence. `eveAgentContext` is exported for callers who need the context explicitly, and the four helpers call it themselves.
4. **`approval` is one function per tool or connection.** There is no composition with `always()`/`once()`/`never()` from `eve/tools/approval`. To require a human *in addition* to the guard check, use `onAllow: "user-approval"`.
5. **`defineDynamic` tools are not covered.** Eve's compiler hoists a dynamic tool's inline `execute` to a module-scope step function, so a wrapper is not visible to it. Gate those with `guardApproval` instead.
6. **A denial from `guardTool` throws** (Eve projects it as a failed `action.result`), whereas a denial from `guardApproval` is a `denied` status carrying a reason the model reads. Prefer the gate when you want the model to adapt.

"Questions to ask the human first", mirroring the existing skill: which operations are consequential; what limits; who the `user` is (the Eve principal id is the default and usually right); whether an Arcjet outage should block (default: yes for tools and connections, and ask explicitly for the channel, where blocking means the agent stops answering).

Numbered steps with complete code: find or create `agent/arcjet.ts`; add `guardApproval` to each connection; wrap or gate authored tools; add `guardInbound` to each channel handler; add `agent/hooks/arcjet.ts`. Then a verification section: `npm run build`, then what to look for in the Console.

**Verification:**

Every code block must compile against the installed typings. Extract each one into a scratch file under the example app and typecheck it — do not eyeball this. The repo rule is that every doc example is verified against the installed `.d.ts`, and a skill is the highest-leverage place to break it, because an agent will paste it verbatim.

Then the manual check (AC7.5): start a fresh coding-agent session with only this skill and a minimal Eve agent (one connection, one authored tool, one channel). Record the transcript. Success is "completed the integration with only clarifying questions"; if it invents a path, reaches for a hook to block something, or calls `createAgentContext`, the skill needs the corresponding warning made louder — that is a skill defect, not an agent defect.

**Commit:** `docs(guard): add the Eve integration skill`
<!-- END_TASK_4 -->

<!-- START_TASK_5 -->
### Task 5: Wire the example into CI

**Verifies:** vercel-eve-namespace.AC7.1 (the CI half).

**Files:**
- Modify: `.github/workflows/reusable-examples.yml`

**Implementation:**

Add `eve-agent` to `matrix.folder` (the list is alphabetical — `ev` sorts before `ex`, so it goes immediately after `astro` and **before** `express-bots`), and add an `include:` entry pinning Node 24:

```yaml
        include:
          - folder: astro
            node-version: 22
          - folder: eve-agent
            node-version: 24
```

Check the `include:` block's existing entries before editing. `astro` is the only one, and note that it pins `node-version: 22` — identical to the `${{ matrix.node-version || '22' }}` default — so the override mechanism has never actually changed a job's Node version in this repo. Treat it as syntax to copy, not as proof the mechanism works; Task 5's requirement to read the version out of the job log is what actually verifies it.

Also check the job's egress allowlist (`egress-policy: block` with an explicit host list). `eve build` may reach the AI Gateway model catalog to size compaction; if it does, the build will fail with a network error rather than a clear message. Either add the required host to the allowlist or set `modelContextWindowTokens` explicitly in the example so no catalog lookup happens — prefer the second, which is what toto does and needs no network at build time.

**Verification:**

```bash
# There is no root `lint-workflows` npm script — workflow linting runs in CI via
# .github/workflows/lint-workflows.yml. Read that file to see which linter it
# invokes and run that tool directly.
cat .github/workflows/lint-workflows.yml
```

Then push and confirm the `eve-agent` matrix job runs on Node 24 and passes. Confirm from the job log that the Node version is 24, not 22 — an `include` entry that does not match the folder name silently leaves the default in place, which is the failure mode here.

**Commit:** `ci: build the Eve agent example on Node 24`
<!-- END_TASK_5 -->

<!-- START_SUBCOMPONENT_B (tasks 6-7) -->
<!-- START_TASK_6 -->
### Task 6: Extend the guard README

**Verifies:** vercel-eve-namespace.AC7.2, AC7.3.

**Files:**
- Modify: `arcjet-guard/README.md`

**Implementation:**

Five edits, in the existing sections rather than a new top-level one:

1. `### Vendor SDK integration (@arcjet/guard/<vendor-sdk>/v<major>)` — "Currently available:" gains a second bullet for `@arcjet/guard/vercel-eve/v0`, naming its four helpers and their surfaces, with a compact worked example (a guarded connection and a mounted hook — the two shapes that have no AI SDK analogue).
2. `### Naming and versions` — add the pre-1.0 rule: when an SDK has not reached 1.0 the segment is `v0`, and `v1` is added when it ships. State plainly that `eve` is 0.x and that a 0.x minor may break, so `v0` is a range this package supports rather than a promise the SDK makes.
3. `### Optional peer dependencies` — add `eve` (`>=0.30 <1`) with **Eve's Node 24 floor called out**. The package's own `engines` says `>=22.21.0 <23 || >=24.5.0`, so a reader has every reason to assume Node 22 works, and it does not for this path. The pnpm caveat already documented applies to `eve` too.
4. `### Where the SDK-agnostic helpers live` — the paragraph "Once a second vendor namespace exists to prove the shape…" now describes something that exists. Update it to say the second namespace has landed and that promoting the agnostic helpers to the root export is the open follow-up. Do not promote them here.
5. `### onGuardError: handling evaluation failures` — add the Eve helpers to the list of what each mode does, including that `guardApproval` returns a `denied` status rather than throwing, and that `guardInbound` is the one call site where `"allow"` is a routine choice rather than an opt-out.

**Verification:** extract every new or edited code block into a scratch TypeScript file inside `examples/eve-agent` and typecheck it. Every import must be a real export of the installed typings and every config key must match the installed `.d.ts`.

**Then do the same for the namespace's JSDoc `@example` blocks**, which AC7.2 covers and nothing else in this plan extracts. The barrel's `@packageDocumentation` example is authored in Phase 5 Task 4; each exported helper's `@example` is authored alongside the helper (Phase 2 `context.ts`, Phase 3 `guard-approval.ts`, Phase 4 `guard-tool.ts` and `guard-inbound.ts`, Phase 5 `hooks.ts`), mirroring `vercel-ai/v7`, where `guard-tool.ts` and `tools-context.ts` each carry one. Phase 5's "every JSDoc example compiles" line is an informal instruction with no extraction step behind it — which is exactly how a leg gets dropped:

```bash
# list every @example block in the namespace so none is missed
grep -rn "@example" arcjet-guard/src/vercel-eve/v0/
```

Extract each one into the same scratch file set and typecheck it.

**Compare the count against the export count, do not just report it.** There must be at least one `@example` per exported helper (`eveAgentContext`, `guardApproval`, `guardTool`, `guardInbound`, `arcjetHooks`) plus the barrel's — six or more. A bare "found 1, checked 1" would pass a count-reporting instruction while five helpers ship undocumented, which is the same dropped leg one level up. If a helper has no `@example`, write one here rather than lowering the expected count.

Any block that does not compile is fixed in the source's JSDoc — not deleted, and not "simplified" until it happens to compile.

`examples/eve-agent/README.md` (Task 3) is also in scope if it carries TypeScript snippets: the example app's `npm run typecheck` covers its `agent/` sources, not prose in its README.

**Commit:** `docs(guard): document the vercel-eve/v0 namespace`
<!-- END_TASK_6 -->

<!-- START_TASK_7 -->
### Task 7: Correct the ADR

**Verifies:** vercel-eve-namespace.AC7.4.

**Files:**
- Modify: `../arcjet/docs/adrs/2026-07-28-guard-sdk-subpath-namespaces.md` (**different repository** — commit separately, in `../arcjet`)

**Implementation:**

**Three** `vercel-eve/v1` path references to reconcile — verified 2026-08-06 at lines 52, 175 and 256. Find them yourself first rather than trusting those numbers:

```bash
cd ../arcjet
grep -n "vercel-eve" docs/adrs/2026-07-28-guard-sdk-subpath-namespaces.md
```

Expected: exactly three hits. Two further passages mention Eve **without** a versioned path — alternative 3 (around line 138) and the Glossary entry (around line 289) — and they need different treatment.

Then, per reference:

- **Decision 3, line 52** ("`vercel-ai/v7` is the first; `vercel-eve/v1` is the next planned") → `vercel-eve/v0`, plus a short "pre-1.0 SDKs" clause stating the general rule: the segment names the SDK's major, so an SDK that has not reached 1.0 gets `v0` and `v1` is added additively at its GA. Put the rule in decision 3 so the next 0.x SDK does not re-litigate it.
- **Alternative 9, line 175** — argues *from* Eve as the counterexample that may change the shape. Only the path string changes; the argument stands.
- **Related decisions, line 256**, "Future decision: the `vercel-eve/v1` namespace…" → rewrite as a **resolved** entry pointing at this design plan, and record the verdict on each of its three predictions:
  1. *"a wrapper equivalent to `guardTool` may not be expressible the same way"* — **held**. There is no author-controlled call site and no `toolsContext` analogue; the equivalent is a gate on Eve's own `approval` field.
  2. *"correlation may have to be session-derived rather than passed"* — **held**. It is derived from `ctx.session`, preferring `parent.rootSessionId` for delegated sessions.
  3. *"This convention is intended to accommodate it, and is the first real test of that"* — **held, with a caveat worth recording**. The namespace needed no build-config change, no export-map machinery beyond one literal key, and no change to the agnostic layer's *shape* — but it did take two deliberate shared-layer extractions (`retryAfterSeconds`, and exporting `correlationIdProblem`) rather than the none the ADR's consequences section implies.

  Then add what the investigation found that the entry did not anticipate: `approval` is present on OpenAPI and MCP connections as well as authored tools, which makes it the widest gate; and hooks are observe-only and cannot enforce at all, so the channel handler is the only pre-turn gate.

  **Add the reciprocal cross-reference** to `2026-08-06-eve-guard-surfaces.md`, the ADR recording where an Eve agent can and cannot be guarded. It already links to this ADR and states that the link will be made from this side, so leaving it one-directional is the loose end.
- **Alternative 3, line 138** — mentions Eve as a counterexample to a feature-named `/ai` namespace, with **no** path string. Leave it unchanged.
- **Glossary, line 289**, "Vercel Eve" → keep the description, add that the integration ships at `vercel-eve/v0`.

**The sandbox correction goes here as a new note, not as an edit to existing text.** `grep -n sandbox` over this ADR returns **zero hits** — the "adds guard surfaces the AI SDK lacks (sandbox command execution, channel entry points, subagent delegation)" claim is in the *superseded* `docs/design-plans/2026-07-27-guard-sdk-namespaces.md`, which was deleted when that feature shipped (recoverable at `bd1d154e6^`). So there is nothing in the ADR to correct. Instead, add one sentence to the resolved Related-decisions entry recording that the superseded design plan claimed a sandbox-command-execution guard surface and that this investigation found none: `defineSandbox` exposes only `bootstrap` and `onSession`, which run outside the ALS-scoped context and receive domain-specific arguments rather than a `SessionContext`. Writing it into the ADR is the point — it is the document that survives.

**Do not** use a blanket find-and-replace of `v1` → `v0`. This document names both the convention and specific versions of other SDKs (`vercel-ai/v7`, a future `/v8`, `vercel-ai/v6` as an unsupported sibling), and a global substitution corrupts them. Edit each reference individually and then re-grep to confirm nothing else moved:

```bash
git -C ../arcjet diff --stat docs/adrs/2026-07-28-guard-sdk-subpath-namespaces.md
git -C ../arcjet diff docs/adrs/2026-07-28-guard-sdk-subpath-namespaces.md | grep -E "^[-+].*v[0-9]"
git -C ../arcjet diff docs/adrs/2026-07-28-guard-sdk-subpath-namespaces.md | grep -cE "^[-+].*vercel-ai"
```

Expected: four hunks — the three path references plus the Glossary addition (decision 3's rule clause lands in the same hunk as its path edit) — and the last command returns `0`. A non-zero count means a `vercel-ai` version string moved, which is the corruption this instruction exists to prevent.

**Verification:** read the whole diff. The ADR's status is `draft`; leave it as it is unless the decision-makers say otherwise — changing a status is their call, not an editorial one.

**Commit (in `../arcjet`):** `docs(adr): the Eve namespace ships at v0, not v1`
<!-- END_TASK_7 -->
<!-- END_SUBCOMPONENT_B -->

---

## Phase 6 done when

- `examples/eve-agent` typechecks and `eve build` succeeds on Node 24, with all four helpers exercised — including `defineHook(arcjetHooks(...))` and a `guardTool`-wrapped `defineTool` default export, which is the real test of Phases 4 and 5's interop assumptions.
- The `eve-agent` CI job runs on Node 24 (confirmed from the job log) and passes.
- Every code block in the README, the skill, the JSDoc and the example has been extracted and typechecked, not eyeballed — with the JSDoc `@example` count enumerated from `grep -rn "@example" arcjet-guard/src/vercel-eve/v0/` and **compared against the export count (six or more), not merely reported**. A bare number is how five undocumented helpers pass this gate.
- The ADR names `v0` at all three path references, records which of its Eve predictions held, and carries a new note that the superseded design plan's sandbox guard-surface claim did not hold — with a diff containing only the intended hunks and zero `vercel-ai` lines touched.
- One coding-agent transcript recorded for AC7.5, with any skill weaknesses it exposed fixed.
