---
name: integrate-arcjet-guard-claude-agent-sdk
description: Integrate Arcjet security into a Claude Agent SDK agent using @arcjet/guard — wrap tool() handlers, screen inbound prompts with UserPromptSubmit, and deny unwrapped built-in/MCP tools with PreToolUse. Use when asked to add Arcjet to a Claude Agent SDK or Claude Code agent, rate limit its tools, screen inbound messages, or block prompt injection / PII.
license: Apache-2.0
compatibility: Requires the target app to use the Claude Agent SDK (@anthropic-ai/claude-agent-sdk >=0.1.0 <1) on Node.js >= 22.
metadata:
  author: arcjet
---

# Integrate Arcjet Guard into a Claude Agent SDK agent

`@arcjet/guard`'s Claude Agent SDK v0 namespace wraps the agent's existing
Arcjet client. It never talks to the Arcjet API itself. Three surfaces, one
decision rule:

- **An authored tool** (`tool()` + `createSdkMcpServer()`) → `guardTool()`.
  DENY is a `CallToolResult` with `isError: true`. Do not throw.
- **Inbound text** → `guardHooks()` `UserPromptSubmit`. DENY is
  `{ decision: "block" }`. Timeout already fail-closes the prompt
  (Claude Code v2.1.208+).
- **Built-ins / unwrapped MCP** → `guardHooks()` `PreToolUse` with
  `permissionDecision: "deny"`. Timeout already fail-closes (the tool does
  not run). `PostToolUse` is capture only.
- **Correlation** → `claudeAgentContext()` reads `session_id` from hook
  input or `options.sessionId`. Subagents have `agent_id` (metadata only).
  It never mints a new id.

## Screen inbound with UserPromptSubmit

This is the only place a turn can be declined before the model sees the
prompt. There is no `guardInbound`. Put `detectPromptInjection` on
`guardHooks({ inbound })`. A DENY returns `{ decision: "block", reason }`
and Claude Code erases the prompt.

## canUseTool is not a policy gate

Claude's docs say `canUseTool` is skipped by `allowedTools`, allow rules,
and `bypassPermissions` / `acceptEdits`. Same trap as Eve approval and
Mastra `requireApproval`. There is no `guardCanUseTool`. Do not put Arcjet
policy on `canUseTool`.

## PreToolUse is the only deny for unwrapped tools

Built-ins (Bash, Write, …) and MCP tools you did not pass through
`guardTool` are gated here. Annotations (`readOnlyHint`, …) and sandbox
settings are not enforcement. `PostToolUse` cannot undo a tool that already
ran.

## Questions to ask the human first

Ask only what you cannot infer from the code; suggest defaults.

1. Which tools are **risky** (external side effects, irreversible, spends
   money, sends messages)? Those get `guardTool`. Built-ins and unwrapped
   MCP get `guardHooks` PreToolUse.
2. What **limits**? (e.g. "10 lookups/min per order" → `tokenBucket`.)
3. Who is the **user** for metadata — an opaque user/tenant ID (never PII)?
   Default: none. Pass it via `metadata` on the policy. Session id is the
   correlation id, not the user.
4. Is an Arcjet outage unacceptable? Every helper defaults to
   `onGuardError: "deny"`. Ask explicitly about inbound
   `UserPromptSubmit`: failing closed there means the agent stops answering
   for the duration of the outage, so `"allow"` is a routine and legitimate
   choice at that one call site.

## The six things readers get wrong

1. **There is no `guardInbound`.** Screen prompt injection on
   `guardHooks({ inbound })` via `UserPromptSubmit`.
2. **`canUseTool` is not a policy gate.** It is skipped by `allowedTools`,
   allow rules, and `bypassPermissions` / `acceptEdits`. Use `guardTool` or
   `PreToolUse`.
3. **The import path is versioned and there is no alias.**
   `@arcjet/guard/claude-agent-sdk/v0`. `@arcjet/guard/claude-agent-sdk`
   does not resolve.
4. **Correlation is read, never minted.** Do not call `createAgentContext`
   inside a Claude callback — that generates a second id and splits the
   Sequence. `claudeAgentContext` reads `session_id` / `options.sessionId`
   and omits `correlationId` when neither is a valid id. Subagent
   `agent_id` is metadata, not the correlation id.
5. **Do not double-wrap with `@arcjet/guard/vercel-ai/v7` or
   `@arcjet/guard/agents`.** Claude tools are `tool()`, not AI SDK
   `tool()`. `guardTool` throws if the tool already carries the Arcjet
   protection brand. Applying `guardTool` and `guardHooks` PreToolUse to
   the same authored tool double-calls the guard.
6. **A denial from `guardTool` is a `CallToolResult` with `isError: true`**,
   not a throw. If `onDeny` throws, the handler still does not run and the
   model still receives the default denial result.

## Step 1: Install and find the guard client

Install `@arcjet/guard` (required), plus `@anthropic-ai/claude-agent-sdk`
(optional peer, needed for `@arcjet/guard/claude-agent-sdk/v0`). Always
use the versioned path: `@arcjet/guard/claude-agent-sdk/v0` resolves;
`@arcjet/guard/claude-agent-sdk` throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.

```sh
npm install @arcjet/guard @anthropic-ai/claude-agent-sdk
```

If the agent has no guard client yet, launch one **once at module scope**:

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

## Step 2: Gate authored tools

```ts
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { guardTool } from "@arcjet/guard/claude-agent-sdk/v0";
import { tokenBucket, localDetectSensitiveInfo } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const lookupLimit = tokenBucket({
  bucket: "lookups",
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 10,
});
const detectPii = localDetectSensitiveInfo();

export const lookupOrder = guardTool(
  arcjet,
  tool(
    "lookup_order",
    "Look up an order by ID",
    {
      orderId: z.string(),
      note: z.string(),
    },
    async ({ orderId, note }) => ({
      content: [{ type: "text", text: `${orderId}: shipped (${note})` }],
    }),
  ),
  {
    action: "order.looked-up",
    rules: (input) => [lookupLimit({ key: input.orderId, requested: 1 }), detectPii(input.note)],
  },
);
```

- Omit `rules` to submit none. The guard call still happens.
- On DENY the tool's handler never runs. The model receives
  `{ content, structuredContent: { arcjetDenied, reason, message, retryable }, isError: true }`.
- Default `onGuardError: "deny"` blocks the tool if Arcjet is unreachable.
- Pass the same `sessionId` you give `query({ options.sessionId })` on the
  policy when the handler `extra` does not carry `session_id`.

## Step 3: Screen inbound with UserPromptSubmit

```ts
import { query } from "@anthropic-ai/claude-agent-sdk";
import { guardHooks } from "@arcjet/guard/claude-agent-sdk/v0";
import { detectPromptInjection } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const sessionId = conversationId;

for await (const message of query({
  prompt: userText,
  options: {
    sessionId,
    hooks: guardHooks(arcjet, {
      sessionId,
      inbound: {
        action: "message.received",
        rules: ({ prompt }) => [detectPromptInjection()(prompt)],
      },
    }),
  },
})) {
  void message;
}
```

- On DENY, `UserPromptSubmit` returns `{ decision: "block", reason }` and
  the prompt is erased. The model never sees it.
- Default `onGuardError: "deny"` — if the guard cannot be evaluated, the
  prompt is blocked. Use `"allow"` on `inbound` when the human cost of
  rejecting a legitimate message exceeds the security cost of an outage.

## Step 4: Gate tools you did not wrap

```ts
import { guardHooks } from "@arcjet/guard/claude-agent-sdk/v0";
import { detectPromptInjection, tokenBucket } from "@arcjet/guard";

import { arcjet } from "./arcjet.js";

const mcpLimit = tokenBucket({
  bucket: "mcp-access",
  refillRate: 20,
  intervalSeconds: 60,
  maxTokens: 20,
});

export const hooks = guardHooks(arcjet, {
  sessionId: conversationId,
  action: ({ toolName }) => `${toolName}.invoked`,
  rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
  inbound: {
    action: "message.received",
    rules: ({ prompt }) => [detectPromptInjection()(prompt)],
  },
});
```

Pass `hooks` to `query({ options.hooks })`. `PreToolUse` returns
`permissionDecision: "deny"` so Bash / Write / unwrapped MCP never
execute. `PostToolUse` is observe-only.

Use this for tools you did **not** pass through `guardTool`. Applying both
to the same authored tool double-calls the guard.

## Step 5: Correlation

Set `options.sessionId` on `query()` to a conversation identity you already
have. `claudeAgentContext` reads hook `session_id` first, then
`options.sessionId`. It never calls `createAgentContext`.

```ts
const sessionId = conversationId;

for await (const message of query({
  prompt: userText,
  options: { sessionId, hooks: guardHooks(arcjet, { sessionId }) },
})) {
  void message;
}
```

If neither is a valid 1–256 printable-ASCII string, the call is
uncorrelated rather than joined to a generated id nobody has. Subagent
`agent_id` is recorded as `claude.agent` metadata only.

## Verify the integration

1. `npm run typecheck` passes.
2. Exercise inbound PI, a tool deny, PII on args, a rate limit, a built-in
   deny (Bash / Write), and fail-closed (an unreachable guard).
3. Confirm in the Arcjet dashboard that decisions share the session id as
   their correlation id.
4. Manual E2E with a real `ARCJET_KEY` is still-to-verify until you run it.

A full working demo belongs in
[`arcjet/examples`](https://github.com/arcjet/examples)
(follow-up; do not add an example under `examples/` in the JS SDK repo).

Note: capture events are fire-and-forget and batched, so events can lag the
decisions they accompany by a few seconds. A dropped event is diagnosed,
never thrown.
