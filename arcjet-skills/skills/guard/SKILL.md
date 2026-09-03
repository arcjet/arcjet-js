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
`-langgraph`, `-langchain`, `-openai-agents`, `-genkit`, `-google-adk`,
`-strands-agents`, `-tanstack-ai`, `-claude-agent-sdk`).

## Client

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

One client at module scope. Get the key with `@arcjet/skills#cli` first.
Declare rules at module scope so `.deniedResult(decision)` works.

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
  const rateLimited = toolCallLimit.deniedResult(decision);
  if (rateLimited) {
    return { error: `rate limited, retry after ${rateLimited.resetAtUnixSeconds}` };
  }
  return { error: decision.reason };
}
if (decision.hasFailedOpen()) {
  // ALLOW only because a rule could not run — deny here if the site is sensitive
}
```

Core `guard()` fails open — check `hasFailedOpen()`. `warnings` never change
the conclusion. Rate-limit rules need `key` and `bucket`. Nested `metadata`
is Console-only; no secrets or PII. `decision.reason` is a flat string on
DENY and `undefined` on ALLOW.

`localDetectSensitiveInfo()` default backend matches card / email / phone /
IP only. Names and government IDs need `backend: rampart()`.
`moderateContent()` is Guard-only.

`capture()` is visibility, never a deny. `flush()` on shutdown.

## Versioned wrappers

Import `@arcjet/guard/<vendor>/v<major>` — unversioned paths do not resolve.
Wrappers fail closed by default. HITL (`needsApproval`, `interrupt()`,
`requireConfirmation`, `canUseTool`) is not a policy gate; Guard still runs
after a human yes.

Google ADK is `guardPlugin` (no `guardTool`). TanStack AI is
`guardMiddleware` (do not wrap `execute`). LangChain `createAgent` is
`/langchain/v1`, not LangGraph.

Load `@arcjet/skills#choose-protections` to pick rules. Exact signatures live
in the installed `@arcjet/guard` types.
