---
name: guard
description: "Add Arcjet Guard to non-HTTP JavaScript: agent tool calls, MCP handlers, queue workers, and background jobs. Use when there is no HTTP request object, or when the user asks to guard tools, rate-limit agent actions, or block prompt injection on tool arguments."
license: Apache-2.0
compatibility: JavaScript and TypeScript apps using @arcjet/guard on Node.js >=22.21.0 <23 || >=24.5.0.
metadata:
  author: arcjet
  type: core
  library: "@arcjet/skills"
  library_version: "1.15.1" # x-release-please-version
sources:
  - docs/guard.md
---

# Guard non-HTTP JavaScript

Use `@arcjet/guard` when there is no HTTP request. MCP tools, queue workers,
and agent tool calls are Guard. HTTP routes are `@arcjet/skills#protect`.

For a specific vendor SDK, load the matching skill from `@arcjet/guard`
(`@arcjet/guard#integrate-arcjet-guard-agents`, `-eve`, `-mastra`,
`-langgraph`, `-langchain`, `-openai-agents`, `-genkit`, `-google-adk`,
`-strands-agents`, `-tanstack-ai`, `-cloudflare-think`,
`-claude-agent-sdk`, `-claude-managed-agents`).

Coding-agent hooks (Claude Code, Copilot, Codex, Cursor, Muse Code) are not
this package. Publish a coding-agent policy from a Console starter
(**Execute on**: Tool call, Prompt, or Model switch) and install the hooks
from the vendor's page under https://docs.arcjet.com/coding-agents. Don't add
a `matcher`, `label`, or `?surface=`. Claude Code and Copilot HTTP hooks fail
open on any non-2xx, including `401`.

## Client

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

One client at module scope. Get the key with `@arcjet/skills#cli` first.
Declare rules at module scope so `.deniedResult(decision)` works.

## One `guard()` per operation

Hardcode the `label`. Do not interpolate in a generic dispatcher.

Hardcode labels as slugs: ASCII letters of either case, digits, `-`, `.`, and
`_` (`tools.get-weather`). Start and end with a letter or digit; max 256 bytes.
Labels match case-sensitively.
Prefer dash/dot in new labels. Check a label you build yourself with
`validateGuardLabel`.

```ts
async function getWeather(userId: string) {
  const decision = await arcjet.guard({
    label: "tools.get-weather",
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
    // ALLOW only because a rule could not run — deny for content scans
    return { error: "unavailable" };
  }
  // ... run the tool
}
```

Core `guard()` fails open — check `hasFailedOpen()`. `warnings` never change
the conclusion. Rate-limit rules need `key` and `bucket`. Nested `metadata`
is Console-only; no secrets or PII. `decision.reason` is a flat string on
DENY and `undefined` on ALLOW.

Use `localDetectSensitiveInfo({ backend: rampart() })` from
`@arcjet/sensitive-info-rampart` for PII (names, addresses, government IDs,
card, email, phone, IP). Always pass the backend on the rule – it doesn't
inherit the client's `sensitiveInfoBackend`, so share one instance. On
Cloudflare Workers or edge runtimes, pass `rampart()` a `classify` function.
`moderateContent()` is Guard-only.

Rampart denies input longer than `maxInputChars` (default `100_000`)
without scanning it: the rule returns DENY with no detected entities, and a
`LOCAL` policy input is denied the same way. For longer text or PHI, send a
`SERVER` input to the server-side detector (~100 KB per value; at most two
values over 2 KB per call; pass `timeoutSeconds` above `3` and deny on
`hasFailedOpen()`).

`capture()` is visibility, never a deny. `flush()` on shutdown.

## Versioned wrappers

Import `@arcjet/guard/<vendor>/v<major>` — unversioned paths do not resolve.
Wrappers fail closed by default. HITL (`needsApproval`, `interrupt()`,
`requireConfirmation`, `canUseTool`) is not a policy gate; Guard still runs
after a human yes.

Every wrapper policy accepts optional `actor` and `inputs` (static or a
resolver over that adapter's native call — parsed input plus trusted
runtime/context) so a remote policy that declares those names can evaluate. Build
each input with `policyInput`.

`rules`, `metadata`, `action`, and `sessionId` callbacks must be
synchronous; `actor` and `inputs` may be async. A callback that throws,
returns an unusable value, or (for the synchronous ones) returns a Promise is
treated as failed: Guard still runs without that value, a
remote DENY stands, then `onGuardError` (`"deny"` by default) decides.

A required policy input that is missing or has the wrong kind is `AJP1003`
(actor `AJP1002`): wrappers deny, core `guard()` returns ALLOW with
`hasFailedOpen()`. An input the policy does not declare is dropped with
warning `AJ1060`. Copy **Generate the SDK call** from the Console policy so
names match.

Limits per call: 50 rules (`AJ1003`), 64 inputs, ~100 KB per server string,
256 items per list. Prompt injection and moderation deny text over 128 KiB;
moderation evaluates the first 60 KB (`AJ1142`). Empty text is allowed
unscreened (`AJ1062`). Gate moderation and prompt injection on
`DENY || hasFailedOpen()`. Warnings reach only the SDK, never the Console —
log `decision.warnings`.

Google ADK is `guardPlugin` (no `guardTool`). TanStack AI is
`guardMiddleware` (do not wrap `execute`). LangChain `createAgent` is
`/langchain/v1`, not LangGraph.

Load `@arcjet/skills#choose-protections` to pick rules. Exact signatures live
in the installed `@arcjet/guard` types.
