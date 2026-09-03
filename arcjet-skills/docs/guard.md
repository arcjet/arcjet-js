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

Declare rules at module scope so `.deniedResult(decision)` and
`.errorResult(decision)` have a stable reference.

## One `guard()` per operation

Call `guard()` where you already know the operation. Hardcode the `label`.
Do not interpolate names in a generic dispatcher.

Labels are slugs: lowercase letters, digits, dash, and dot only; must start
and end with a letter or digit; max 256 bytes. Use `tools.get-weather`, not
`tools.get_weather`. Metadata keys may contain underscores; labels and
rate-limit `bucket` names may not.

```ts
const decision = await arcjet.guard("tools.get-weather", {
  rules: [/* ... */],
  metadata: { user: { id: userId } },
});

if (decision.conclusion === "DENY") {
  const rateLimited = toolCallLimit.deniedResult(decision);
  if (rateLimited) {
    throw new Error(`rate limited – retry after unix ${rateLimited.resetAtUnixSeconds}`);
  }
  if (decision.reason === "PROMPT_INJECTION") {
    throw new Error("input flagged as prompt injection");
  }
  return { error: decision.reason };
}
```

`decision.reason` is a flat string on DENY (`"RATE_LIMIT"`,
`"PROMPT_INJECTION"`, `"SENSITIVE_INFO"`, `"MODERATE_CONTENT"`, …) and
`undefined` on ALLOW. Branch on which rule denied, not only on `DENY`.

`metadata` is nested JSON for the Console. It does not affect the decision.
Do not put secrets or PII in it.

Every rate-limit rule needs a `key` and a `bucket`. Use a user or session id
when you have one; otherwise a stable identifier you control (`"default"`,
deployment name). Do not pass an empty string.

A denial by one rule still spends the others' budget in the same `guard()`
call. Split rules across two calls if a PII false positive must not drain a
rate-limit bucket.

`guard()` never throws for runtime degradation. `hasFailedOpen()` is true
when ALLOW means a rule or the decision could not be processed — that is
the fail-closed gate. `warnings` are request-validation diagnostics; they
never change the conclusion. Prefer `hasFailedOpen()` over deprecated
`hasError()`.

Pass `correlationId` to join a guard decision with a request or agent
trace. It is a dedicated field, not metadata.

`localDetectSensitiveInfo()` defaults to WASM and matches four types:
card, email, phone, IP. Names, addresses, and government / financial
identifiers need `@arcjet/sensitive-info-rampart` (`backend: rampart()`).
Listing a Rampart-only entity without that backend never matches.
`moderateContent()` is Guard-only.

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
| Google ADK JS | `@arcjet/guard/google-adk/v2` |
| Strands Agents JS | `@arcjet/guard/strands-agents/v1` |
| TanStack AI | `@arcjet/guard/tanstack-ai/v0` |

Unversioned aliases do not resolve. Load the matching
`@arcjet/guard#integrate-arcjet-guard-*` skill for the integration you are
implementing. Those skills ship in the `@arcjet/guard` package.

Framework wrappers fail closed by default when Guard is unavailable. Core
`guard()` fails open — check `hasFailedOpen()`.

JS LangChain `createAgent` is `@arcjet/guard/langchain/v1`, not LangGraph.
JS Google ADK is `guardPlugin` on the Runner — there is no `guardTool`.
TanStack AI is `guardMiddleware` — do not use `guardTool` (an `execute`
throw is swallowed). JS Strands Agents is official `@strands-agents/sdk`,
not Python `strands`.

Every adapter uses one `ArcjetDenialResult` payload
(`{ arcjetDenied: true, reason, message, retryable }`). Delivery is
per-framework: return the object (AI SDK, Mastra, OpenAI Agents, Genkit
`toolResponse.output`, LangGraph, LangChain `guardTool`, Google ADK plugin
dict, Strands `guardTool`); wrap it (Claude Agent SDK `isError: true`,
LangChain `guardMiddleware` `ToolMessage`, Strands `guardHooks` cancel
string, TanStack `onBeforeToolCall` skip); or throw `ArcjetDeniedError`
(Eve, unless `onDeny: "result"`). A throw from a return-style adapter
drops the fields.

Human-in-the-loop APIs (`needsApproval`, `interrupt()`, `requireApproval`,
`requireConfirmation`, `canUseTool`) are not policy gates. After a human
yes, Guard still runs.

## Capture and flush

`capture()` records that something happened. It never denies. Call `flush()`
on shutdown. On serverless, pass a platform `waitUntil`.

## Verify

Invoke the protected function directly. Do not `curl` an HTTP route to test
Guard. Confirm with `npx @arcjet/cli@latest guards list --site-id <id>`.
