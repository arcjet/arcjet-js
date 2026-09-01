<!-- trunk-ignore-all(markdownlint/MD024) -->
<!-- trunk-ignore-all(markdownlint/MD001) -->

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/skills`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/skills">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fskills?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fskills?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Versioned [Agent Skills](https://agentskills.io) for the Arcjet JavaScript SDK,
shipped with [TanStack Intent](https://tanstack.com/intent).

- [npm package (`@arcjet/skills`)](https://www.npmjs.com/package/@arcjet/skills)
- [GitHub source code (`arcjet-skills/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-skills)

Skills travel with the installed package version. They are not a copy-pasted
rules file and they are not the model's training cutoff.

The standalone marketplace install (`npx skills add arcjet/skills`) still
works from [`arcjet/skills`](https://github.com/arcjet/skills). Prefer this
package when you want skills that match the SDK version in `node_modules`.

## What is this?

A TypeScript package that publishes:

- `skills/*/SKILL.md` — agent guidance, one skill per task
- `docs/*.md` — the source documentation those skills were derived from
- a small typed manifest (`skills`, `skillIdentity`) for the shipped leaf names

TanStack Intent discovers the `SKILL.md` files as static files. It does not
import or execute this package (or any other package) to find them.

## Install

This package is ESM only.

```sh
npm install @arcjet/skills
```

Framework adapters that depend on `arcjet` also install this package
transitively, so a typical `@arcjet/next` app already has the files on disk.

Guard integration skills ship in [`@arcjet/guard`](../arcjet-guard/README.md)
next to that package's README. Allow both packages if you use Guard.

## Use with TanStack Intent

Intent scans installed dependencies for `skills/**/SKILL.md`. Discovery is
not trust. Put an explicit allowlist in the **application** `package.json`:

```json
{
  "intent": {
    "skills": ["@arcjet/skills", "@arcjet/guard"],
    "exclude": []
  }
}
```

`intent.skills` permits packages, not individual skills. Use `intent.exclude`
to drop a package or one skill (`@arcjet/guard#integrate-arcjet-guard-eve`).

An omitted `intent.skills` key currently surfaces every discovered package
and prints a deprecation notice. Do not use `"skills": ["*"]` unless you
accept unvetted skills from the whole tree.

```sh
npx @tanstack/intent@latest install
npx @tanstack/intent@latest list
npx @tanstack/intent@latest load @arcjet/skills#protect
```

`install` writes loading guidance to `AGENTS.md` (or an existing agent
config). `list` shows what the allowlist permits. `load` prints one
`SKILL.md` — load only the skill the current task needs.

| Task | Load |
| --- | --- |
| HTTP routes, APIs, middleware | `@arcjet/skills#protect` |
| Which rules to apply | `@arcjet/skills#choose-protections` |
| Sign in and write `ARCJET_KEY` | `@arcjet/skills#cli` |
| MCP server setup | `@arcjet/skills#mcp` |
| Tool calls, MCP handlers, jobs | `@arcjet/skills#guard` |
| A specific Guard vendor SDK | `@arcjet/guard#integrate-arcjet-guard-*` |

### Trust model

- Intent reads package metadata and skill files. It does not execute package
  code to discover or load a skill.
- The allowlist and exclusions are the trust decision.
- `intent load` returning content means the file resolved under current
  policy. It does not mean the skill was relevant or that the model followed
  it.
- `npx @tanstack/intent@latest hooks install` can add session catalogs and
  edit gates for some agents. Treat those hooks as convenience, not a
  security boundary. They can observe a load command; they cannot prove the
  agent used the guidance.

## Typed manifest

```ts
import {
  PACKAGE_NAME,
  VERSION,
  getSkill,
  skillIdentity,
  skills,
} from "@arcjet/skills";

skillIdentity("protect"); // "@arcjet/skills#protect"
getSkill("cli")?.file; // "skills/cli/SKILL.md"
```

This list is for this package only. It does not scan other dependencies.

## Maintainers

Skill files live beside the docs they were derived from (`docs/` in this
package; `README.md` for `@arcjet/guard` skills). Each `SKILL.md` declares
those paths in `sources`.

```sh
npx @tanstack/intent@latest validate
npx @tanstack/intent@latest stale --json
```

`validate` is required in CI. `stale` is conservative: a changed source is a
review signal, not proof the skill is wrong. CI fails a pull request when a
declared source changes and the matching `SKILL.md` does not.

The `tanstack-intent` keyword and the `skills/` `files` entry put the skills
in the npm tarball so the registry can index them.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
