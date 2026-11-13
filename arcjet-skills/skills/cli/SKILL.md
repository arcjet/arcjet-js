---
name: cli
description: "Connect a project to Arcjet with the CLI: sign in, pick a team and site, and write ARCJET_KEY. Use when bootstrapping Arcjet, listing requests or guards, or managing remote rules from a terminal."
license: Apache-2.0
compatibility: Any project that can run npx or the arcjet binary.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.15.1" # x-release-please-version
sources:
  - docs/cli.md
---

# Arcjet CLI

Preferred way to get a real `ARCJET_KEY` before writing Arcjet code. Do not
leave the key as a TODO.

```bash
npx -y @arcjet/cli@latest auth status        # exit 2 = not signed in
npx -y @arcjet/cli@latest auth login         # add --team-id team_… to pick a team

npx -y @arcjet/cli@latest teams list --output json
npx -y @arcjet/cli@latest sites list --team-id <team_id> --output json
# if no suitable site: previews and exits 4 – show the user `changes`, then run `confirmCommand`
npx -y @arcjet/cli@latest sites create --team-id <team_id> --name "<project>"
npx -y @arcjet/cli@latest sites get-key --site-id <site_id> --output json --fields key
```

Write `key` to the project's env file as `ARCJET_KEY=ajkey_...`. Match
existing env-file conventions and `.gitignore`. Never hardcode the key.

Do not:

- Use `--fields` on list commands. It keeps top-level keys only, so
  `teams list --fields id,name` prints `{}`.
- Pass `--confirm` on the first run of `sites create`, `projects create`, or
  `rules create/update/delete/promote`. Preview, show `changes`, then confirm.
- Use a project key (`aj_prj_key_`) as `ARCJET_KEY`. The SDK needs the actor
  (site) key `ajkey_`. Project keys are for coding-agent hooks and OTel.
- Look for `guards explain` or `--guard-id`. Use
  `guards details --site-id <id> --decision-id gdec_…`.

Exit codes: 0 ok, 1 general, 2 auth, 3 validation, 4 confirmation required.

Investigate: `requests list` → `requests details` → `requests explain`;
`guards list` → `guards details`; `watch` / `guards watch`; `briefing`.
Remote rules: `rules create` (DRY_RUN) → `analyze dry-run-impact` →
`rules promote`. The CLI has no Guard policy commands.

If the CLI cannot run, load `@arcjet/skills#mcp`. Manual: in
https://console.arcjet.com select **New actor** and copy the **Actor key**.
