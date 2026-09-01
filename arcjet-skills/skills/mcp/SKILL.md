---
name: mcp
description: Connect an AI coding client to the Arcjet MCP server at https://api.arcjet.com/mcp. Use when the client has built-in MCP support or the CLI is not available.
license: Apache-2.0
compatibility: AI clients that support remote MCP over HTTP / OAuth.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.11.0" # x-release-please-version
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

Bootstrap: `list-teams` → `list-sites` → `get-site-key` → write `ARCJET_KEY`.
Investigate: `analyze-traffic`, `list-requests`, `list-guards`,
`investigate-ip`. Remote rules: `create-rule` (DRY_RUN) →
`get-dry-run-impact` → `promote-rule`.
