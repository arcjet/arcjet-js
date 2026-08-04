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

Each new adapter should come with an example application in this repository. See
[Examples](#examples) for guidance on creating an example.

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
  the same feature differs. Vercel EVE is the next planned namespace
  (`vercel-eve/v1`) and is already a counterexample: it is filesystem-first,
  with one `defineTool` per file and no author-controlled call site, so a
  wrapper equivalent to `guardTool` may not even be expressible the same way.
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

1. Create `arcjet-guard/src/<vendor-sdk>/v<major>/` (e.g. `src/vercel-eve/v1/`).
2. Export the integration helpers — at minimum a wrapper equivalent to
   `guardTool` and a way to get context to it.
3. Re-export the shared layer with `export * from "../../agents/index.ts"`.
   Re-export it rather than wrapping it: wrappers break `===` identity across
   namespaces and give every shared symbol a second implementation to keep in
   sync.
4. Add an `exports` entry in `arcjet-guard/package.json`:

   ```json
   "./vercel-eve/v1": {
     "types": "./dist/vercel-eve/v1/index.d.ts",
     "import": "./dist/vercel-eve/v1/index.js"
   }
   ```

5. If the SDK is a new dependency, declare it in `peerDependencies` and mark it
   optional in `peerDependenciesMeta`.

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

## Public API

Every published package keeps its public API in `src/exports/`. One file per
published entrypoint, naming every export. Everything else under `src/` is
implementation.

```
arcjet-node/
  src/
    exports/
      index.ts     <- the public API of `@arcjet/node`
    index.ts       <- implementation
    request.ts     <- implementation
```

The export map points at the built form of those files and nothing else.

A module that says `export * from "arcjet"` publishes whatever that package
happens to export, today and in every future version. Nobody decided to publish
those names, and nothing fails when the set changes. Naming them instead means
the public API is a list somebody wrote, a reviewer can read in one file, and a
test can compare against.

There are no `export *` re-exports left in this repository's sources. Add one
under `src/exports/` and the package's export test fails the moment it widens
the surface, because the test compares the built declarations against the list
rather than against the star.

### Adding an export

1. Add it to the relevant `src/exports/*.ts` file.
2. Add it to `test/api-surface/*.ts`, which `tsc` checks and never runs. That is
   the only place a type-only export is visible to a test, because types are
   erased before anything executes.
3. Run the package's tests. `test/exports.test.ts` compares the built
   declarations against that list and reports what is missing.

Per-runtime entrypoints (`edge-light`, `workerd`, `bun`, `deno`) each get their
own file under `src/exports/`. They are not obliged to publish the same names —
`@arcjet/redact-wasm` does not — but any difference should be deliberate and
written down in the file that causes it.

### Sharing implementation between packages

Sometimes a package here needs something another package does not publish. **Do
not widen the public API to make that work.** A name added for one internal
caller is a name every consumer can then depend on, and removing it later is a
breaking change nobody meant to make.

Declare a separate entrypoint instead — `"./internal"`, built from
`src/exports/internal.ts` — and give it the guarantee it does not have:

```ts
/**
 * Implementation shared with other Arcjet packages.
 *
 * Not part of the public API. Anything here may change or disappear in any
 * release, including a patch. Nothing outside this repository should import
 * it, and nothing under a public entrypoint may re-export from it.
 *
 * @internal
 * @packageDocumentation
 */
```

Mark the individual exports `@internal` as well, so the tag survives into
generated documentation.

Two rules hold this together, both enforced by each package's
`test/exports.test.ts`:

- A public entrypoint may not re-export from another package's `/internal`
  entrypoint. Internals do not become public by being passed along.
- An `/internal` entrypoint is still pinned by the export tests, so its surface
  cannot drift unnoticed. It simply is not promised to anyone.

No package needs one yet. The pattern is written down so that the first one that
does has somewhere to go other than the public API.

`@arcjet/astro` and `@arcjet/nuxt` are a known exception: they serve
`src/internal.ts` as a framework virtual module (`#arcjet`) rather than through
the export map, reading `dist/internal.js` and `dist/internal.d.ts` off disk and
injecting them into the user's project. Despite the name, that surface is
public. It lists its exports explicitly for the same reason everything else
does, but it does not live under `src/exports/` and the export tests do not
cover it. Moving it is worth doing separately, since the integration's file
lookup and the injected declaration path both depend on where it sits.

## Examples

Examples should be scaffolded using the scaffolding tool recommended by the
framework. Generally, we choose all defaults for the example applications in
this repository, but that is not a strict rule.

When adding an example, it needs to be added to the
[dependabot.yml](./.github/dependabot.yml) file and the
[reusable-examples.yml](./.github/workflows/reusable-examples.yml) workflow. If
the example does not have a build process to run in CI, it can be excluded from
the workflow file.

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

Give it a `src/exports/` entrypoint and the tests that pin it, as described in
[Public API](#public-api).
