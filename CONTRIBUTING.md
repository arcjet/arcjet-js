# Contributing

Welcome to the Arcjet JavaScript SDK! We're excited to have you contribute.

Please review the guidelines we have below to help us in accepting your
contribution.

## Setup

We recommend using [Dev
Containers](https://code.visualstudio.com/docs/devcontainers/containers) to
provide a fully configured development environment.

1. Prerequisites
   1. Docker
   2. VS Code or a compatible editor.
   3. [Dev Container
      extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Open in Dev Container
   1. Clone the repository
   2. Open the project in VS Code.
   3. When prompted, click "Reopen in Container" or run "Dev Containers: Open
      Folder in Container" command
   4. VS Code will build and start the dev container (this may take a few
      minutes the first time)
3. Ensure you have [signed commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits) enabled. We recommend 1Password's [Sign Git commits with SSH](https://developer.1password.com/docs/ssh/git-commit-signing/).

That's it! You're all set to start making changes.

## Adapters

New adapters are added to the root of this monorepo in the format of
`arcjet-NAME_OF_ADAPTER` and the package name is `@arcjet/NAME_OF_ADAPTER`.

For example, `arcjet-sveltekit` is the directory for the `@arcjet/sveltekit`
package.

Each new adapter should come with an example application in
[`arcjet/examples`](https://github.com/arcjet/examples), not in this
repository. See [Examples](#examples).

New adapters (and any other new package) must also be wired into our release and
publish pipeline before they can ship. See [Adding a new
package](#adding-a-new-package) for the full checklist. We can help you make
these changes if you need it.

## SDK integration namespaces

`@arcjet/guard` integrates with third-party SDKs through subpath exports rather
than separate packages, one per vendor SDK major:
`@arcjet/guard/<vendor-sdk>/v<major>`. `vercel-ai/v7` is the first.

Three properties of that shape are deliberate, and worth knowing before you
change them:

- **Vendor-prefixed**, naming the SDK being integrated rather than the feature.
  A feature-named namespace such as `/ai` assumes there is only ever one AI SDK
  worth integrating, and leaves nowhere to put a second vendor whose model of
  the same feature differs. `vercel-eve/v0` bears this out: Eve is
  filesystem-first, with one `defineTool` per file and no author-controlled call
  site, so its enforcement points are a channel-boundary screen and a
  connection-level approval gate that `vercel-ai/v7` has no equivalent of.
  `mastra/v1` is the same idea on a different SDK: Mastra already runs
  channels through `processInput` and treats `requireApproval` as human HITL,
  so its helpers are `guardTool`, `guardProcessor`, and `guardHooks`.
  `claude-agent-sdk/v0` is the same idea again: authored tools are `tool()`
  handlers, inbound is `UserPromptSubmit`, and unwrapped built-ins are
  `PreToolUse` — `canUseTool` is not a policy gate.
  `langgraph/v1` is Graph API (`StateGraph` + `ToolNode`): authored tools
  are `guardTool`, unwrapped / MCP tools go through `guardToolNode`, and
  `interrupt()` is HITL not policy. `createReactAgent` is deprecated; do not
  build on it. LangChain `createAgent` / `wrapToolCall` is
  `langchain/v1`.
  `langchain/v1` is JS `createAgent` + `createMiddleware({ wrapToolCall })`:
  the authored deny point is `guardTool` (plain `ArcjetDenialResult`;
  `baseHandler` wraps it in a success `ToolMessage`), MCP / unwrapped /
  runtime-discovered tools go through `guardMiddleware`'s `wrapToolCall`
  (it MUST return a real `ToolMessage` — a bare object is the
  reducer-crash case; do not set `status: "error"`; do not throw),
  inbound is screened before `agent.invoke` (SDK middleware that is not
  `wrapToolCall` is not Guard), and `humanInTheLoopMiddleware` /
  `interrupt()` is HITL not policy. Policy sits on `wrapToolCall` only —
  do not deny in `afterModel`. There is no `guardInbound` and no
  `guardApproval`. Correlation is `configurable.thread_id` (what
  wrapToolCall sees as of langchain 1.2.34), then caller-owned
  `sessionId` / `conversationId`. Server-side provider tools and
  headless `.implement()` tools are out of scope. Do not add
  `@langchain/langgraph` as a new peer. There is no unversioned
  `@arcjet/guard/langchain` alias. Docs slug is `/guards/langchain-js/`,
  not `/guards/langchain/` (the live Python page).
  `openai-agents/v0` is text `Agent` + `run()` / `Runner` + authored
  `tool({ execute })`: the runner-facing deny point is `FunctionTool.invoke`
  (the SDK closes over `execute`), inbound is screened before `run()`
  (SDK `inputGuardrails` are not Arcjet), and `needsApproval` is HITL not
  policy. There is no ToolNode, no `guardInbound`, no `guardApproval`, and
  no `guardHooks` — hosted tools, MCP, handoffs, and `agent.asTool()` skip
  the authored-`execute` path. `RunContext` has no session / conversation
  id; correlation is a field the integrator puts on `runContext.context`.
  `genkit/v1` is JS `genkit()` + `ai.defineTool` + `ai.generate`: the
  authored deny point is the `defineTool` handler (wrap the returned
  `ToolAction`; `generate()` calls it as a function), unwrapped / MCP /
  filesystem-injected tools go through `guardMiddleware`'s `tool` hook
  (it denies by returning a completed `ToolResponsePart` without calling
  `next()` — not `ToolInterruptError`), inbound is screened before
  `generate()` (middleware `model` is not Guard), and `interrupt()` /
  `defineInterrupt` / `toolApproval` is HITL not policy. There is no
  `guardInbound` and no `guardApproval`. Correlation is a field the
  integrator puts on `generate({ context })`. Do not wrap Go / Python
  Genkit. Do not double-wrap with `@arcjet/guard/vercel-ai/v7`.
  `strands-agents/v1` is JS `@strands-agents/sdk` `Agent` +
  `tool({ callback })` + Plugin / `addHook`: the authored deny point is
  `_callback` (wrap both `_callback` and ZodTool's
  `_functionTool._callback`; `stream()` is what the executor calls),
  unwrapped / MCP / vended tools go through `guardHooks`'
  `BeforeToolCallEvent` (deny by setting `event.cancel` to
  `JSON.stringify(ArcjetDenialResult)` — do not use
  `BeforeToolsEvent.cancel`, which skips per-tool hooks), inbound is
  screened before `invoke()` / `stream()` (there is no inbound hook),
  and `event.interrupt()` is HITL not policy. There is no
  `guardInbound` and no `guardApproval` / `guardInterrupt`. Correlation
  is a field the integrator puts on `invocationState` (`correlationId`,
  then `sessionId`, then `requestId`). Never mint. Never read
  `traceId`. Never use `SessionManager` or `agent.id`. Do not wrap the
  Python SDK. Do not double-wrap with `@arcjet/guard/vercel-ai/v7` or
  `@arcjet/guard/langgraph/v1`. There is no unversioned
  `@arcjet/guard/strands-agents` alias. Docs slug is
  `/guards/strands-agents/`.
- **Flat** — a single level under `@arcjet/guard`, no further nesting.
- **Explicitly versioned, with no unversioned alias.** `@arcjet/guard/vercel-ai`
  does not resolve, and neither does a wildcard `./vercel-ai/*`. An alias would
  change meaning under a consumer the moment a new major ships, which is the
  exact failure the version segment exists to prevent. Its absence is asserted
  by a test, not left to convention.

Two more constraints hold the layout together. The helpers that are not tied to
any AI SDK live in `src/agents/` and must stay that way: ESM resolves the whole
reachable import graph, so anything re-exporting a vendor-coupled function pulls
that vendor's SDK in even if it is never called. A test walks the transitive
import graph to enforce it. That layer has no `exports` entry of its own — it
reaches users only re-exported from a vendor namespace — because a public path
is a compatibility commitment and one integration is not enough evidence to make
it. Vendor SDKs are declared as **optional** peer dependencies, so guard users
who never touch an AI SDK are unaffected.

### Adding a new integration namespace

1. Create `arcjet-guard/src/<vendor-sdk>/v<major>/` (e.g. `src/acme-sdk/v2/`).
   The version segment names the SDK's own major, so an SDK that has not
   reached 1.0 gets `v0` — that is why the Eve namespace is `vercel-eve/v0`,
   and why `v1` is added additively at its GA rather than assumed now.
2. Export the integration helpers — at minimum a wrapper equivalent to
   `guardTool` and a way to get context to it.
3. Re-export the shared layer with `export * from "../../agents/index.ts"`.
   Re-export it rather than wrapping it: wrappers break `===` identity across
   namespaces and give every shared symbol a second implementation to keep in
   sync.
4. Add an `exports` entry in `arcjet-guard/package.json`:

   ```json
   "./acme-sdk/v2": {
     "types": "./dist/acme-sdk/v2/index.d.ts",
     "import": "./dist/acme-sdk/v2/index.js"
   }
   ```

5. If the SDK is a new dependency, declare it in `peerDependencies` and mark it
   optional in `peerDependenciesMeta`.
6. If the namespace imports its SDK for types only, add a check to
   `arcjet-guard/scripts/test-peers-absent.mjs` (and a `type-only.test.ts`).
   CI runs that script after unit tests and fails if a `type-only.test.ts`
   exists with no matching check, or the other way around. Skip this when
   `src/` tests value-import the SDK — `vercel-ai/v7` does, and has no
   type-only scan.

No changes to the shared layer, the build config, or the root export are
required — `tsdown` runs with `unbundle: true`, so a new directory under `src/`
is picked up with its structure preserved.

> [!NOTE]
> pnpm does not reliably honour `peerDependenciesMeta.*.optional`
> ([pnpm#5152](https://github.com/pnpm/pnpm/issues/5152),
> [pnpm#8142](https://github.com/pnpm/pnpm/issues/8142)), particularly under
> `--strict-peer-dependencies`. This is documented for users in the
> `@arcjet/guard` README rather than worked around, because the workaround
> would mean giving up optional peers for everyone.

## Examples

Do not add application examples under `examples/` in this repository. They
live in [`arcjet/examples`](https://github.com/arcjet/examples) (moved in
[#6217](https://github.com/arcjet/arcjet-js/pull/6217); remaining examples
are landing in [arcjet/examples#193](https://github.com/arcjet/examples/pull/193)).
Agents: see the root [AGENTS.md](./AGENTS.md) for the same rule.

Scaffold new examples in that repo with the framework's recommended tool,
following its CONTRIBUTING.md and the canonical example pattern. Do not
restore `.github/workflows/reusable-examples.yml` here.

## Publish

Publishing to npm is mostly automated, gated behind a manual approval, and
requires two people. Packages authenticate to npm with
[trusted publishing](#npm-trusted-publishing) (OIDC) rather than long-lived
tokens, and every package is published with provenance.

The workflow is defined in
[publish.yml](./.github/workflows/publish.yml). It runs in two jobs: a
`preflight` job that validates the request (no approval needed) and a gated
`publish` job that runs only after a second person approves the `npm-publish`
GitHub environment.

### Publishing a stable release

1. [Release Please](https://github.com/googleapis/release-please) keeps a
   release pull request up to date with changelogs and version bumps. Some
   landed PRs, notably dependency updates, do not trigger it to run, so make
   sure to land something real after those.
2. A person approves and merges that release PR. When it lands, Release Please
   creates the `vX.Y.Z` tag and GitHub release notes.
3. A person goes to Actions -> Publish -> Run workflow, selects the release tag,
   and chooses the `latest` dist-tag.
4. The `preflight` job runs immediately (no approval) and writes a summary of
   exactly what will be published. It fails the run early if the tag is not a
   release tag, the package versions do not all match the tag, or a non-stable
   version is being sent to `latest`.
5. Another team member is asked by GitHub to approve the gated `publish` job,
   and one person does, optionally with a comment.
6. GitHub publishes to npm, which takes about 5 minutes.

### Publishing a release candidate (rc)

Release candidates are published to the `rc` dist-tag (never `latest`) so they
can be validated in production without becoming the default install. Unlike a
stable release, an rc is cut manually:

1. Create a release branch, e.g. `release/1.10.0-rc`.
2. On that branch, bump every workspace package to the rc version (e.g.
   `1.10.0-rc.0`), keeping them in lockstep — all package versions, the internal
   exact-pin dependencies, and the `x-release-please-version` constants tracked
   as `extra-files` in
   [release-please-config.json](./.github/release-please-config.json). The
   `preflight` job asserts every package version equals the tag, so any package
   left behind will fail the run.
3. Tag the release commit `v1.10.0-rc.0` and push the branch and tag.
4. Go to Actions -> Publish -> Run workflow, select the rc tag, and be sure to
   choose the `rc` dist-tag.
5. Approve the gated `publish` job as with a stable release.

The release branch is throwaway — the stable release still comes from Release
Please on `main`.

### npm trusted publishing

Each package trusts the GitHub Actions workflow to publish it via OIDC, so no
npm tokens are stored anywhere. This is configured once per package on npm, at
`https://www.npmjs.com/package/<package-name>/access` -> Trusted Publisher ->
edit, with these values:

- **Publisher:** GitHub Actions
- **Organization or user:** `arcjet`
- **Repository:** `arcjet-js`
- **Workflow filename:** `publish.yml`
- **Environment name:** `npm-publish`
- **Allowed actions:** Allow `npm publish`

The quickest way to get these right is to open an already-configured package
(e.g. [arcjet](https://www.npmjs.com/package/arcjet/access)), hit edit, and copy
the same values.

> [!IMPORTANT]
> A package must already exist on npm before a trusted publisher can be added to
> it. A brand-new package therefore needs one **manual** first publish before
> trusted publishing works — see [Adding a new
> package](#adding-a-new-package).

### Adding a new package

When you add a new package (an adapter or otherwise), wire it into the release
and publish pipeline. Miss one of these and the package will silently not be
released, or a release run will fail:

1. **Release Please config.** Add the package to both:
   - [.release-please-manifest.json](./.github/.release-please-manifest.json) —
     an entry with the current release version, so it stays in lockstep.
   - [release-please-config.json](./.github/release-please-config.json) — a
     `packages` entry (`component` set to the npm name, `skip-github-release:
     true`, plus `extra-files` for any in-source version constants) **and** the
     package's npm name in the `linked-versions` `components` list.
2. **Publish workflow.** Add `--workspace @arcjet/<name>` to the correct
   dependency level in [publish.yml](./.github/workflows/publish.yml). Levels
   publish in dependency order, so the package must sit in a level after all of
   its internal dependencies.
3. **First publish is manual.** Because trusted publishing cannot be configured
   until the package exists on npm, build the package and publish it once by
   hand (`npm publish --workspace @arcjet/<name>`), then configure
   [trusted publishing](#npm-trusted-publishing) for it.
4. After that, it publishes automatically alongside everything else.
