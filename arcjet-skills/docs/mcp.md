# Arcjet MCP server

Connect an AI coding client to the Arcjet API over HTTP with OAuth. Use this
when the CLI is not available or the client has built-in MCP support.

**Endpoint:** `https://api.arcjet.com/mcp`

Verify that URL before connecting. Only connect from trusted clients. Enable
confirmation prompts for write operations.

## Client setup

### VS Code

`.vscode/mcp.json`:

```json
{
  "servers": {
    "arcjet": {
      "type": "http",
      "url": "https://api.arcjet.com/mcp"
    }
  }
}
```

### Claude Code

```bash
claude mcp add arcjet --transport http https://api.arcjet.com/mcp
```

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "arcjet": {
      "type": "streamable-http",
      "url": "https://api.arcjet.com/mcp"
    }
  }
}
```

### Windsurf

```json
{
  "mcpServers": {
    "arcjet": {
      "serverUrl": "https://api.arcjet.com/mcp"
    }
  }
}
```

### Codex CLI

```bash
codex mcp add arcjet --url https://api.arcjet.com/mcp
```

### Claude Desktop

Settings → Connectors → Add custom connector → Name: `Arcjet`, URL: `https://api.arcjet.com/mcp`

### ChatGPT

Settings → Connectors → Add connection → URL: `https://api.arcjet.com/mcp` → OAuth

## Authentication

OAuth for a human sign-in: the first connection redirects to the Arcjet sign-in.

**Agent registration** (the agent registers its own identity): follow https://arcjet.com/auth.md exactly. Do not invent registration, claim, or token-exchange flows, and do not print secrets.

## Available tools

Discover tools through the MCP protocol. Reference: https://docs.arcjet.com/mcp-server

| Area | Tools |
| --- | --- |
| Teams, sites, keys | `list-teams`, `list-sites`, `create-site`, `get-site-key`, `get-site-quota` |
| Requests | `list-requests` (`ALLOW`/`DENY`/`ERROR`), `get-request-details`, `explain-decision` |
| Guard decisions | `list-guards` (filter by `correlationId` for one session), `get-guard` (per-rule results, matched policy, detector results) |
| Analysis | `analyze-traffic`, `get-anomalies`, `investigate-ip`, `get-security-briefing` |
| Remote rules | `list-rules`, `create-rule`, `update-rule`, `delete-rule`, `get-dry-run-impact`, `promote-rule` |
| Guard policies | `list-guard-policies`, `get-guard-policy`, `describe-guard-policy`, `validate-guard-policy`, `evaluate-guard-policy`, `put-guard-policy`, `suggest-guard-policies`, `retry-guard-policy`, `delete-guard-policy` |
| Coding-agent sessions | `get-session-taint` (read-only) |
| Feedback | `submit-error-report`, `submit-feedback` |

MCP-only (not in the CLI): Guard policies, session analysis, error reports. CLI-only: projects and project keys, live `watch`.

## Common workflows

**Bootstrap a project:** `list-teams` → `list-sites` → `get-site-key` → write the actor key (`ajkey_`) to `.env` as `ARCJET_KEY`.

**Investigate suspicious traffic:** `analyze-traffic` → `list-requests` (DENY) → `investigate-ip` → `create-rule` (DRY_RUN) → `get-dry-run-impact` → `promote-rule`

**Add protection without redeploying:** `create-rule` (bot/filter in DRY_RUN) → `get-dry-run-impact` → `promote-rule`

## Author a Guard policy

The Console policy editor is the main authoring surface. MCP is the agent path to the same service.

1. `get-guard-policy` – read the contract (label, each input's kind and exposure). Write the `guard()` call from it, or copy **Generate the SDK call** from the Console, so input names don't drift.
2. `describe-guard-policy` – label plus an English description. Returns builder conditions (never Rego) and compiles them.
3. `validate-guard-policy` – compiles and runs stored tests. Use it to read why a save was rejected.
4. `put-guard-policy` – publishes.

Rules:

- **Saving is publishing.** There is no draft and no rollback; to revert, edit and save again. A label is unique per site.
- New and Describe-generated rules start in `DRY_RUN`. A live expression rule needs at least one stored test (`AJV2015`). Tests use `inputJson` and `expectRuleIds` (empty list = expect allow).
- Application policies select by `label` / wrapper `action`. Coding-agent policies attach by **Execute on** (Tool call, Prompt, Model switch), stored as `codingAgentMoments` (for example `["tool-call"]`); publishing turns them on.
- Coding-agent policies: start from a Console starter (`coding-agent.*`). Don't declare inputs by hand and don't copy the session-analysis Rego into a fresh policy – the starter's detector declarations are what turn on its screens. A coding-agent policy can't use a detector that runs in the SDK.
- A detector that lists PHI types must stay server-side.
- Session-analysis flags are cleared only by a Console user (**Clear taint**). `submit-error-report` and the denial's "Report an error" link do not unlock a session.

## Security notes

- Verify the endpoint is `https://api.arcjet.com/mcp`
- Enable confirmation prompts in your AI client for write operations
- Only connect from trusted AI clients
