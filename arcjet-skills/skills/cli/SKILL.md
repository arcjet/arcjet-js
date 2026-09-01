---
name: cli
description: "Connect a project to Arcjet with the CLI: sign in, pick a team and site, and write ARCJET_KEY. Use when bootstrapping Arcjet, listing requests or guards, or managing remote rules from a terminal."
license: Apache-2.0
compatibility: Any project that can run npx or the arcjet binary.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.11.0" # x-release-please-version
sources:
  - docs/cli.md
---

# Arcjet CLI

Preferred way to get a real `ARCJET_KEY` before writing Arcjet code. Do not
leave the key as a TODO.

```bash
npx -y @arcjet/cli@latest auth status
# if not signed in:
npx -y @arcjet/cli@latest auth login

npx -y @arcjet/cli@latest teams list --output json --fields id,name
npx -y @arcjet/cli@latest sites list --team-id <team_id> --output json --fields id,name
npx -y @arcjet/cli@latest sites get-key --site-id <site_id> --output json --fields key
```

Write `key` to the project's env file as `ARCJET_KEY=ajkey_...`. Match
existing env-file conventions and `.gitignore`. Never hardcode the key.

`--output json` and `--fields` keep agent context small. Confirm with the
user before write or delete operations (`--confirm`).

Investigate: `requests list` / `guards list` / `requests explain` /
`guards explain` / `briefing`. Remote rules: `rules create` (DRY_RUN) →
`analyze dry-run-impact` → `rules promote`.

If the CLI cannot run, load `@arcjet/skills#mcp` or send the user to
https://console.arcjet.com.
