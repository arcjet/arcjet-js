# Mastra + `@arcjet/guard/mastra/v1`

Example agent that uses the Mastra adapter inside `@arcjet/guard`:

- **Inbound prompt injection** — `guardProcessor` on `inputProcessors` /
  `outputProcessors`. DENY calls `abort()` and Mastra raises a tripwire.
- **Tool deny / rate limit / PII on args** — `guardTool` wraps
  `createTool({ execute })`. DENY is a structured tool result (no throw).
- **Unwrapped tools** — `guardHooks` for MCP / workspace / toolsets.
- **Fail-closed** — every helper uses the default `onGuardError: "deny"`.
- **Correlation** — `RequestContext` sets `MASTRA_THREAD_ID_KEY` and
  `MASTRA_RESOURCE_ID_KEY`. `mastraAgentContext` never mints a new id.

## Setup

```sh
npm install
cp .env.example .env
# set ARCJET_KEY (and a model key if you want to run the agent)
npm run typecheck
```

Manual E2E with a real `ARCJET_KEY` is still-to-verify.

## Import path

Use `@arcjet/guard/mastra/v1`. `@arcjet/guard/mastra` does not resolve.
Do not also wrap these tools with `@arcjet/guard/vercel-ai/v7`.
