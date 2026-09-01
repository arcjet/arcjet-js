---
name: guard
description: "Add Arcjet Guard to non-HTTP JavaScript: agent tool calls, MCP handlers, queue workers, and background jobs. Use when there is no HTTP request object, or when the user asks to guard tools, rate-limit agent actions, or block prompt injection on tool arguments."
license: Apache-2.0
compatibility: JavaScript and TypeScript apps using @arcjet/guard on Node.js >= 22.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.11.0" # x-release-please-version
sources:
  - docs/guard.md
---

# Guard non-HTTP JavaScript

Use `@arcjet/guard` when there is no HTTP request. MCP tools, queue workers,
and agent tool calls are Guard. HTTP routes are `@arcjet/skills#protect`.

For a specific vendor SDK, load the matching skill from `@arcjet/guard`
(`@arcjet/guard#integrate-arcjet-guard-agents`, `-eve`, `-mastra`,
`-langgraph`, `-langchain`, `-openai-agents`, `-genkit`, `-strands-agents`,
`-tanstack-ai`, `-claude-agent-sdk`).

## Client

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

One client at module scope. Get the key with `@arcjet/skills#cli` first.

## One `guard()` per operation

Hardcode the `label`. Do not interpolate in a generic dispatcher.

Labels: lowercase letters, digits, `-`, `.` only; start and end with a letter
or digit. `tools.get-weather`, not `tools.get_weather`.

```ts
const decision = await arcjet.guard("tools.get-weather", {
  rules: [/* ... */],
  metadata: { user: { id: userId } },
});

if (decision.conclusion === "DENY") {
  return { error: decision.reason };
}
```

Core `guard()` fails open — check `hasFailedOpen()`. Rate-limit rules need
`key` and `bucket`. Nested `metadata` is Console-only; no secrets or PII.

`capture()` is visibility, never a deny. `flush()` on shutdown.

## Versioned wrappers

Import `@arcjet/guard/<vendor>/v<major>` — unversioned paths do not resolve.
Wrappers fail closed by default. HITL (`needsApproval`, `interrupt()`) is not
a policy gate; Guard still runs after a human yes.

Load `@arcjet/skills#choose-protections` to pick rules. Exact signatures live
in the installed `@arcjet/guard` types.
