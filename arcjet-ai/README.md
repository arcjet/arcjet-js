<!-- trunk-ignore-all(markdownlint/MD001) -->

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/ai`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/ai">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fai?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fai?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] security helpers for the [Vercel AI SDK][ai-sdk] (v7):
guard checks and audit events around model-invoked tool calls and
app-invoked actions, correlated end to end.

**Experimental.** This package is a pilot; the API may change without a
major version bump while we dogfood it.

## Install

```sh
npm install @arcjet/ai @arcjet/guard ai
```

## Use

End-to-end example: launch a guard client, create a security context, protect a model-invoked tool and an app-invoked action.

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard";
import { tool, jsonSchema, generateText } from "ai";
import {
  createAiContext,
  aiToolsContext,
  protectTool,
  protectAction,
  captureAction,
  securityMetadata,
} from "@arcjet/ai";

// 1. Launch the guard client once (at module scope)
const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

// 2. Create security context (at request entry point)
const ctx = createAiContext({
  correlationId: existingRunId, // omit to auto-generate
  metadata: securityMetadata({ agent: "support", user: userId }),
});

// 3. Wrap a tool with rate limiting
const emailLimit = tokenBucket({
  bucket: "emails",
  refillRate: 5,
  intervalSeconds: 60,
  maxTokens: 10,
});

const sendEmail = protectTool(
  arcjet,
  tool({
    description: "Send an email",
    inputSchema: jsonSchema<{ to: string; subject: string }>({
      type: "object",
      properties: { to: { type: "string" }, subject: { type: "string" } },
      required: ["to", "subject"],
    }),
    execute: async ({ to, subject }) => ({ sent: true }),
  }),
  {
    action: "email.sent",
    rules: () => [emailLimit({ key: userId, requested: 1 })],
  },
);

// 4. Pass context to AI SDK tools
const tools = { sendEmail };
const result = await generateText({
  model: languageModel, // Use a real language model, e.g., from @ai-sdk/openai
  instructions:
    "If a tool is denied by Arcjet, explain to the user instead of retrying.",
  tools,
  toolsContext: aiToolsContext(ctx, tools),
  prompt: userMessage, // User input or conversation context
});

// 5. Protect an app-invoked action (e.g., external API call)
const commentLimit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 20,
});

await protectAction(
  arcjet,
  ctx,
  {
    action: "github.pr-commented",
    rules: [commentLimit({ key: userId })],
  },
  () => github.createComment({ body: result.text }),
);

// 6. Capture observational events
captureAction(arcjet, ctx, {
  action: "notification.sent",
  metadata: { destination: "slack" },
});
```

The `action` is the guard label: use `resource.verb` past tense (e.g. `order.looked-up`). Labels are validated server-side as slugs — lowercase letters, digits, dash, and dot only, starting and ending with a letter or digit. Underscores and uppercase are rejected.

## Which helper?

| Scenario | Helper | Guard | Model Sees |
|----------|--------|-------|-----------|
| LLM decided to call a tool | `protectTool()` | Yes (if rules provided) | `ArcjetDenialResult` on DENY |
| Your app invokes an action | `protectAction()` | Yes (if rules provided) | Throws `ArcjetDeniedError` on DENY |
| Record that something happened | `captureAction()` | No | — (fire-and-forget) |

## Correlation

The context is a plain JSON-serializable object: thread it explicitly through function calls and workflow/queue inputs (never use module state or `AsyncLocalStorage`). Each correlation ID is 1–256 printable ASCII characters; auto-generated ones are ULIDs.

Thread an existing run identifier (request/job/review ID) so Arcjet data joins your own systems:

```ts
const ctx = createAiContext({ correlationId: requestId });
await workflow({ question, arcjet: ctx });
```

Or omit `correlationId` to auto-generate a ULID:

```ts
const ctx = createAiContext();
console.log(ctx.correlationId); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

`protectAction` and `captureAction` take the context directly. Tools can't — the model calls them, so their context arrives through the AI SDK's `toolsContext` channel instead: `aiToolsContext(ctx, tools)` builds that map, which is why `protectTool` itself never takes `ctx`.

> **Don't forget `toolsContext`.** The injected context type includes `undefined`, so the compiler will not flag a missing `toolsContext: aiToolsContext(ctx, tools)` at the `generateText` call. Omit it and guard checks run uncorrelated, signalled only by a `console.warn` (gated on `ARCJET_LOG_LEVEL`). Run once with `ARCJET_LOG_LEVEL=warn` and confirm the correlation ID reaches the dashboard.

## Denials

When a guard check denies a tool call, `protectTool` returns an `ArcjetDenialResult` object:

```ts
{
  arcjetDenied: true,
  reason: "RATE_LIMIT",
  message: "Arcjet denied this tool call (RATE_LIMIT). It may be retried after 30 seconds.",
  retryable: true,
  retryAfterSeconds: 30,
}
```

To reshape what the model sees on denial, pass `onDeny` in the tool policy — it receives the `DecisionDeny` and its return value replaces the default `ArcjetDenialResult`:

```ts
protectTool(arcjet, tool, {
  action: "order.looked-up",
  rules: () => [limit({ key: userId })],
  onDeny: (decision) => ({ error: `blocked: ${decision.reason}` }),
});
```

When a guard check denies an action, `protectAction` throws `ArcjetDeniedError` carrying the decision. Recommended system prompt line for tools:

> If a tool call is denied by security policy, do not retry it; explain the denial to the user or try a different approach.

## Metadata vocabulary

Use `securityMetadata()` keys consistently across your app:

| Key | Meaning | Example |
|-----|---------|---------|
| `user` | Whose authority (opaque ID, not PII) | `"user_alice"`, `"org_123"` |
| `agent` | Type or identity of the AI actor | `"support-agent"`, `"code-reviewer"` |
| `workflow` | Process name this request belongs to | `"support-request"`, `"pr-review"` |
| `dataClass` | Data sensitivity level | `"public"`, `"confidential"`, `"regulated"` |
| `destination` | Where effects are sent | `"github"`, `"slack"`, `"email"` |
| `reversibility` | Whether the action can be undone | `"reversible"`, `"compensable"`, `"irreversible"` |
| `resource` | What's being acted on | `"order:12345"`, `"repo:owner/name"` |

Guard caps metadata server-side (max 20 pairs, key ≤64 bytes, value ≤512 bytes). Merging `ctx.metadata` with per-call `securityMetadata()` can quietly exceed 20 pairs — the extras are dropped server-side, so keep maps small.

## Failure posture

- **Guard errors** (API timeouts, network failures): Fail open — the tool or action still runs. A warning is logged when `ARCJET_LOG_LEVEL` is `debug`, `info`, or `warn`.
- **Capture events**: Fire-and-forget; never throw. If the guard client lacks `experimental_capture()`, events silently skip with a gated warning.
- **Missing correlation ID**: A warning is logged, but guard checks still run (uncorrelated).

## Agent skill

For integration help in Claude Code or other coding agents, install the skill:

1. Copy or symlink `node_modules/@arcjet/ai/skills/integrate-arcjet-ai/` to `~/.claude/skills/`:

```bash
cp -r node_modules/@arcjet/ai/skills/integrate-arcjet-ai ~/.claude/skills/
# or symlink instead
ln -s /path/to/node_modules/@arcjet/ai/skills/integrate-arcjet-ai ~/.claude/skills/
```

2. In Claude Code, `/integrate-arcjet-ai` to start an integration session.

## Example

See [examples/nextjs-ai-agent](https://github.com/arcjet/arcjet-js/tree/main/examples/nextjs-ai-agent) for a working Next.js app with Arcjet-protected tools and actions.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[ai-sdk]: https://ai-sdk.dev
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
