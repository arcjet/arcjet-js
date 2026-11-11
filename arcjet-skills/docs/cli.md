# Arcjet CLI

The CLI is the preferred way to connect to the Arcjet platform from a terminal session. Verified against `@arcjet/cli` **1.2.0**. Full reference: https://docs.arcjet.com/cli

## Install

The usual way is `npx` (no install required):

```bash
npx -y @arcjet/cli@latest <command>
```

For frequent use, install the binary:

```bash
# npm
npm install -g @arcjet/cli

# Homebrew
brew install arcjet/tap/arcjet

# Install script (macOS Apple Silicon/Intel, Linux x86_64/arm64)
curl -sSfL https://arcjet.com/cli/install.sh | bash
```

Or download a release archive from https://github.com/arcjet/cli/releases and put the `arcjet` binary on your `PATH` (macOS, Linux, Windows; x86_64 and arm64).

Verify: `arcjet version`

## Authentication

The default path is the browser device flow (like `gh auth login`):

```bash
arcjet auth status                       # exit code 2 = not signed in
arcjet auth login                        # prints a one-time code and opens a URL
arcjet auth login --team-id team_abc123  # choose or switch team
arcjet auth logout
```

- A session acts in **one team**. `auth status` shows its `teamId`. If the user belongs to several teams, pass `--team-id` to `auth login`.
- Do not prompt the user for a token. Wait for the browser confirmation, then continue.
- Non-interactive (CI, containers): `arcjet auth token --shell posix` (or `fish`, `csh`, `powershell`, or `--output json`) exports `ARCJET_TOKEN`. The CLI never refreshes that token; when it expires, commands exit `2`. Never print or commit it.

## Agent usage

- `--output json` – machine-readable JSON (default when stdout is not a TTY). Errors go to stderr as `{error, code, remediation}`.
- `--fields a,b` – keeps **top-level keys only**. Keys inside list items are not filtered. `teams list` returns `{"teams":[…]}` and `sites list` returns `{"teamId", "sites":[…]}`, so `--fields id,name` on them prints `{}`. Use it on object responses (`sites get-key --fields key`, `briefing --fields traffic,rules`).
- `--timeout 30s` bounds a command. `--no-color` (or `NO_COLOR`) for plain text.

Exit codes: `0` success, `1` general, `2` auth (sign in again), `3` input validation, `4` confirmation required.

## Confirm before changing anything

`projects create`, `sites create`, and `rules create/update/delete/promote` change nothing without `--confirm`. Without it they print a JSON preview (`status: "confirmation_required"`, `changes`, `confirmCommand`) and exit `4`.

1. Run the command **without** `--confirm`.
2. Show the user `changes`.
3. Run `confirmCommand` only after the user agrees.

Do not add `--confirm` on the first run.

## Keys: actor (site) vs project

The Console calls a site an **actor**; the CLI and API call it a **site**.

| Key | Prefix | Get it with | Use for |
| --- | --- | --- | --- |
| Actor key | `ajkey_` | `sites get-key --site-id` | SDK `ARCJET_KEY` (`protect()`, `guard()`) |
| Project key | `aj_prj_key_` | `projects get-key --project-id` | Coding-agent hooks, OpenTelemetry export, capture-only clients |

Never write an `aj_prj_key_` value as the SDK's `ARCJET_KEY`. `protect()` and `guard()` need the actor key.

## Common workflows

**Bootstrap a project:**

```bash
arcjet auth status || arcjet auth login
arcjet teams list --output json
arcjet sites list --team-id <team_id> --output json
arcjet sites create --team-id <team_id> --name "<project>"   # preview; then run confirmCommand
arcjet sites get-key --site-id <site_id> --output json --fields key
```

The confirmed `sites create` output already includes `siteId` and `key`.

**Investigate a request:** `requests list --site-id <id>` (`--conclusion ALLOW|DENY|CHALLENGE|ERROR`, `--filter "PATH:/api"`, `--limit`, `--cursor`) → `requests details --site-id <id> --request-id req_…` → `requests explain --site-id <id> --request-id req_…`

**Inspect Guard decisions:** `guards list --site-id <id>` (`--conclusion ALLOW|DENY`) → `guards details --site-id <id> --decision-id gdec_…`. Live stream: `guards watch --site-id <id>`. There is no `guards explain` and no `--guard-id`.

**Live traffic:** `watch --site-id <id>` (`--conclusion`, `--filter`, `--interval`).

**Analysis:** `briefing --site-id <id>`, `analyze traffic`, `analyze anomalies`, `analyze ip`, `analyze dry-run-impact` (`--days`).

**Manage remote rules:** `rules list` → `rules create` (DRY_RUN; confirm) → `analyze dry-run-impact` → `rules promote` (LIVE; confirm). `rules update --mode MODE_LIVE|MODE_DRY_RUN`.

**Guard policies:** the CLI has no policy commands. Use the Console or MCP (`@arcjet/skills#mcp`).

## Command reference

`arcjet --help` and `arcjet <command> --help`. The help text is the source of truth for flags.

## Invariants

- IDs are TypeIDs: `team_`, `prj_`, `site_`, `req_`, `gdec_`, `remote_rule_`.
- Commands and parameters are a stable API contract; they change only additively.
