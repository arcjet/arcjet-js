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

### Claude Desktop / ChatGPT

Add a custom connector named `Arcjet` with URL `https://api.arcjet.com/mcp`.

## Authentication

OAuth. The first connection redirects to sign in with an Arcjet account.

## Common workflows

- Bootstrap: `list-teams` → `list-sites` → `get-site-key` → write `ARCJET_KEY`
- Investigate: `analyze-traffic` → `list-requests` → `investigate-ip`
- Remote rules: `create-rule` (DRY_RUN) → `get-dry-run-impact` → `promote-rule`
- Guard policies: `list-guard-policies` → `describe-guard-policy` → `validate-guard-policy` → `put-guard-policy`. Authoring is MCP-only; the CLI has no policy commands. Application policies select by `label` / wrapper `action`. Coding-agent policies attach by **Execute on** (Tool call or Prompt), not by label. Install Claude Code / Copilot HTTP hooks from https://docs.arcjet.com/coding-agents — copy the templates. The hook URL must not name a policy and must omit `?surface=` (managed settings reach CLI, IDE, Desktop, and cloud; a hard-coded `cli` mislabels most traffic).
- Briefing: `get-security-briefing`
