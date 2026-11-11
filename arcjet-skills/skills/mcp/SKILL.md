---
name: mcp
description: Connect an AI coding client to the Arcjet MCP server at https://api.arcjet.com/mcp. Use when the client has built-in MCP support or the CLI is not available.
license: Apache-2.0
compatibility: AI clients that support remote MCP over HTTP / OAuth.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.15.0" # x-release-please-version
sources:
  - docs/mcp.md
---

# Arcjet MCP server

Endpoint: `https://api.arcjet.com/mcp` only. OAuth on first connect. Enable
write confirmations. Prefer `@arcjet/skills#cli` when a terminal is available.

**Cursor** — `.cursor/mcp.json`:

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

**VS Code** — `.vscode/mcp.json` with `"type": "http"` and the same URL.

**Claude Code:**

```bash
claude mcp add arcjet --transport http https://api.arcjet.com/mcp
```

**Codex CLI:** `codex mcp add arcjet --url https://api.arcjet.com/mcp`

Bootstrap: `list-teams` → `list-sites` → `get-site-key` → write the actor key
(`ajkey_`) as `ARCJET_KEY`. Agent identity (not human browser OAuth): follow
https://arcjet.com/auth.md.

Investigate: `analyze-traffic`, `list-requests`, `investigate-ip`,
`list-guards` (filter by `correlationId` for one session), `get-guard`.
Remote rules: `create-rule` (DRY_RUN) → `get-dry-run-impact` → `promote-rule`.

Guard policies (Console editor, or MCP; no CLI commands):
`get-guard-policy` (read the input contract) → `describe-guard-policy` →
`validate-guard-policy` → `put-guard-policy`.

Do not:

- Treat a save as a draft. Saving is publishing; there is no rollback.
- Save a live expression rule without a stored test (`AJV2015`).
- Declare coding-agent policy inputs by hand or copy the session-analysis
  Rego. Start from a Console starter. Coding-agent policies attach by
  **Execute on** (Tool call, Prompt, Model switch), not by label.
- Tell a user `submit-error-report` unlocks a tainted session. Only a
  Console **Clear taint** does.
