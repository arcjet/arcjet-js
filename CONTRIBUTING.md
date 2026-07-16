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
