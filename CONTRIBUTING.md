# Contributing

Welcome to the Arcjet JavaScript SDK! We're excited to have you contribute.

Please review the guidelines we have below to help us in accepting your
contribution.

# Setup

We'll use Dev Containers to provide fully configured development enviroment.

1. Prerequisites
  - Docker
  - VS Code or a compatible editor.
  - [Dev Container extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

2. Open in Dev Container
 - Clone the repository
 - Open the project in VS Code.
 - When prompted, click "Reopen in Container" or run "Dev Containers: Open Folder in Container"       command
 - VS Code will build and start the dev container (this may take a few minutes the first time)
 
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
