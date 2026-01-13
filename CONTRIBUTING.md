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

New adapters must also be added to our Release Please configuration files so it
can be included in the next release. The two files that must be updated are
[.release-please-manifest.json](./.github/.release-please-manifest.json) and
[release-please-config.json](./.github/release-please-config.json). We can help
you make changes to these files if you need help.

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

Publishing to npm is mostly automated but involves two bots and requires two
people.

It looks like this:

1. Release Please keeps a PR up to date with changelogs;
   some landed PRs, notably dependency updates, do not trigger it to run,
   so make sure to land something real after those.
2. Person approves that PR and requests Trunk to merge it
   When it lands, Release Please creates a tag and GitHub release notes.
3. Person goes to Actions -> Publish -> Run workflow -> Tags, then selects
   the tag to publish.
4. Other team members are asked by GitHub to approve that run,
   one person does, optionally with a comment.
5. GitHub publishes to npm, which takes about 5 minutes.
