# Guard non-HTTP JavaScript with Arcjet

Source documentation for the `guard` Agent Skill. JavaScript and TypeScript
only. For HTTP routes, see `docs/protect.md`.

## When to use Guard

Use `@arcjet/guard` when there is no HTTP request object: agent tool calls,
MCP server handlers, queue workers, and background jobs.

The word "server" on MCP is misleading. MCP tools are invoked over stdio or
SSE and do not receive an HTTP request.

## Client

```ts
import { launchArcjet } from "@arcjet/guard";

export const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
```

Create the client once at module scope. Prefer passing the client explicitly.
`registerArcjet` enables free `guard()` / `capture()` / `flush()` when you
cannot thread a client. Free `guard()` fail-opens if nothing is registered —
check `hasFailedOpen()` and do not treat that ALLOW as a pass.

## One `guard()` per operation

Call `guard()` where you already know the operation. Hardcode the `label`.
Do not interpolate names in a generic dispatcher.

Labels are slugs: lowercase letters, digits, dash, and dot only; must start
and end with a letter or digit; max 256 bytes. Use `tools.get-weather`, not
`tools.get_weather`.

```ts
const decision = await arcjet.guard("tools.get-weather", {
  rules: [/* ... */],
  metadata: { user: { id: userId } },
});

if (decision.conclusion === "DENY") {
  return { error: decision.reason };
}
```

`metadata` is nested JSON for the Console. It does not affect the decision.
Do not put secrets or PII in it.

Every rate-limit rule needs a `key` and a `bucket`. Use a user or session id
when you have one; otherwise a stable identifier you control.

A denial by one rule still spends the others' budget in the same `guard()`
call. Split rules across two calls if a PII false positive must not drain a
rate-limit bucket.

## Framework wrappers

Prefer the versioned Guard namespaces over hand-wrapping every tool:

| SDK | Import |
| --- | ------ |
| Vercel AI SDK v7 | `@arcjet/guard/vercel-ai/v7` |
| Vercel Eve | `@arcjet/guard/vercel-eve/v0` |
| Mastra | `@arcjet/guard/mastra/v1` |
| Claude Agent SDK | `@arcjet/guard/claude-agent-sdk/v0` |
| Claude Managed Agents | `@arcjet/guard/claude-managed-agents/v0` |
| LangGraph JS | `@arcjet/guard/langgraph/v1` |
| LangChain JS `createAgent` | `@arcjet/guard/langchain/v1` |
| OpenAI Agents | `@arcjet/guard/openai-agents/v0` |
| Genkit JS | `@arcjet/guard/genkit/v1` |
| Strands Agents JS | `@arcjet/guard/strands-agents/v1` |
| TanStack AI | `@arcjet/guard/tanstack-ai/v0` |

Unversioned aliases do not resolve. Load the matching
`@arcjet/guard#integrate-arcjet-guard-*` skill for the integration you are
implementing. Those skills ship in the `@arcjet/guard` package.

Framework wrappers fail closed by default when Guard is unavailable. Core
`guard()` fails open — check `hasFailedOpen()`.

Human-in-the-loop APIs (`needsApproval`, `interrupt()`, `requireApproval`)
are not policy gates. After a human yes, Guard still runs.

## Capture and flush

`capture()` records that something happened. It never denies. Call `flush()`
on shutdown. On serverless, pass a platform `waitUntil`.

## Verify

Invoke the protected function directly. Do not `curl` an HTTP route to test
Guard. Confirm with `npx @arcjet/cli@latest guards list --site-id <id>`.
