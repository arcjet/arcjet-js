# Arcjet CLI

The CLI is the preferred way to connect to the Arcjet platform from a terminal.

## Install

```bash
npx -y @arcjet/cli@latest <command>
```

For frequent use:

```bash
npm install -g @arcjet/cli
# or
brew install arcjet/tap/arcjet
```

Or download a release from https://github.com/arcjet/cli/releases.

Verify: `arcjet version`

## Authentication

Most users will not have `ARCJET_TOKEN` set. Use the browser device flow:

```bash
npx -y @arcjet/cli@latest auth status
npx -y @arcjet/cli@latest auth login
```

The CLI prints a one-time code and opens a URL. Do not prompt the user for a
token. Check `auth status` before continuing.

## Agent flags

- `--output json` — machine-readable JSON
- `--fields a,b,c` — limit output to listed top-level keys

## Bootstrap a project

```bash
npx -y @arcjet/cli@latest teams list --output json --fields id,name
npx -y @arcjet/cli@latest sites list --team-id <team_id> --output json --fields id,name
# if needed:
npx -y @arcjet/cli@latest sites create --team-id <team_id> --name "<project>"
npx -y @arcjet/cli@latest sites get-key --site-id <site_id> --output json --fields key
```

Write the `key` value to the project's env file as `ARCJET_KEY=ajkey_...`.
Match existing env-file conventions. Never hardcode the key in source.

## Investigate

- Requests: `requests list` → `requests details` → `requests explain`
- Guards: `guards list` → `guards explain`
- Briefing: `briefing --site-id <id>`
- Remote rules: `rules list` → `rules create` (DRY_RUN) → `analyze dry-run-impact` → `rules promote`

Mutating commands require `--confirm`. Confirm with the user before
write or delete operations.

Site IDs use `site_` TypeID format. Team IDs use `team_`.
