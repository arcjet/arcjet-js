# Agent guidance

## Examples live in `arcjet/examples`

Do not add application examples under `examples/` in this repository.

Examples were removed from this SDK in
[#6217](https://github.com/arcjet/arcjet-js/pull/6217). New and remaining
examples belong in [`arcjet/examples`](https://github.com/arcjet/examples).
The current migration PR is
[arcjet/examples#193](https://github.com/arcjet/examples/pull/193) — add
Guard / adapter demos there (or a follow-up on that repo), not here.

That includes:

- Framework apps (`nextjs-*`, `express-*`, …)
- Guard integration demos (`nextjs-ai-agent`, `eve-agent`, `mastra-agent`)

Follow `arcjet/examples` CONTRIBUTING.md and its canonical example pattern
(`package.json` metadata, templated README, Dockerfile, `compose.yaml`,
devcontainer, LICENSE). Pin Arcjet packages to published versions. Standalone
AI examples that need a model key stay out of the default compose/CI matrix.

Do not restore `.github/workflows/reusable-examples.yml` or re-add an
`examples` CI job in this repo for new work.

README and skill links should point at
`https://github.com/arcjet/examples/tree/main/examples/<name>`, not at a
path under this repository.

## Agent Skills

JS/TS Agent Skills ship in npm packages via TanStack Intent, not in
`arcjet/skills`. Keep `SKILL.md` files beside their source docs
(`arcjet-skills/docs/`, `arcjet-guard/README.md`). Validate with
`intent validate`. Conservative stale checks fail a PR when a declared
source changes and the skill does not. Consumers allowlist packages and
load one skill per task; editor hooks are not a security boundary.

## Integration work: review before a PR

For Guard vendor integrations and other integration work, keep going on a
branch and push it. Do not open a pull request until David confirms after
reviewing the code. The final report must include the exact branch name,
commit SHA, and a concise diff summary.
