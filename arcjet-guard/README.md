<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/guard`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/guard">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fguard?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fguard?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] is the runtime security platform that ships in your AI code. Detect prompt injection, authorize agent tool calls, redact sensitive data, and block bots and abuse. Real-time security building blocks you call inside your app, before an action happens.

This is the [Arcjet][arcjet] Guards SDK for **non-request protection** — use it
for AI agent tool calls, MCP server handlers, queue workers, background jobs,
and anything else that doesn't have an HTTP request object. If you're protecting
HTTP routes, use a [framework SDK](https://github.com/arcjet/arcjet-js#sdks)
like `@arcjet/next` or `@arcjet/node` instead.

## Why Arcjet?

Your app's AI features and agents take real actions, calling tools, reading data, hitting APIs. Arcjet runs inside that code and lets you enforce security on each action in real time, then audit what happened

## Getting started

### Quick setup with an AI agent

1. Log in with the CLI:
   ```sh
   npx @arcjet/cli auth login
   ```
2. Install the Arcjet skill to give your coding agent the docs it needs:
   ```sh
   npx skills add arcjet/skills
   ```
3. Tell your agent what to protect — it handles the rest.

### Manual setup

1. **Log in** with the CLI (or at [`app.arcjet.com`](https://app.arcjet.com?utm_campaign=arcjet-js)):
   ```sh
   npx @arcjet/cli auth login
   ```
2. `npm install @arcjet/guard`
3. Pass your key to `launchArcjet({ key: process.env.ARCJET_KEY! })`
4. Add a guard to your code — see the [quick start](#quick-start) below

[npm package](https://www.npmjs.com/package/@arcjet/guard) |
[GitHub source](https://github.com/arcjet/arcjet-js/tree/main/arcjet-guard) |
[Other SDKs][sdks-github]

## Features

Guards share some features with the request SDKs but are designed for
non-HTTP contexts. Here's what's available where:

| Feature                         | Request SDKs | `@arcjet/guard` |
| ------------------------------- | :----------: | :-------------: |
| Rate Limiting                   |      ✅      |       ✅        |
| Prompt Injection Detection      |      ✅      |       ✅        |
| Sensitive Information Detection |      ✅      |       ✅        |
| Custom Rules                    |      —       |       ✅        |
| Bot Protection                  |      ✅      |        —        |
| Shield WAF                      |      ✅      |        —        |
| Email Validation                |      ✅      |        —        |
| Request Filters                 |      ✅      |        —        |
| IP Analysis                     |      ✅      |        —        |

- 🪣 [Rate Limiting](#rate-limiting) — token bucket, fixed window, and sliding
  window algorithms; model AI token budgets per user.
- 🛡️ [Prompt Injection Detection](#prompt-injection-detection) — detect and
  block prompt injection attacks before they reach your LLM.
- 🕵️ [Sensitive Information Detection](#sensitive-information-detection) —
  block PII, credit cards, and custom patterns from entering your AI pipeline.
- 🔧 [Custom Rules](#custom-rules) — define your own local evaluation logic
  with arbitrary data.

## Quick start

This example protects an AI tool call with token bucket rate limiting and
prompt injection detection.

```ts
import { launchArcjet, tokenBucket, detectPromptInjection } from "@arcjet/guard";

// Create the Arcjet client once at module scope
const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

// Configure reusable rules
const limitRule = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
const piRule = detectPromptInjection();

// Per request — create rule inputs each time
const rl = limitRule({ key: userId, requested: tokenCount });
const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [rl, piRule(userMessage)],
});

// Overall decision
if (decision.conclusion === "DENY") {
  if (decision.reason === "RATE_LIMIT") {
    throw new Error("Rate limited — try again later");
  }
  if (decision.reason === "PROMPT_INJECTION") {
    throw new Error("Prompt injection detected — please rephrase");
  }
  throw new Error("Request denied");
}

// Check for failures (fail-open — errors don't cause denials). hasFailedOpen()
// is true only when the conclusion is ALLOW because a rule or the decision
// could not be processed — gate a fail-closed policy on it.
if (decision.hasFailedOpen()) {
  console.warn("Allowed only because evaluation failed open", decision.errorResults());
}

// Decision-level diagnostics (e.g. an invalid metadata key that was stripped).
// Warnings never change the conclusion.
for (const warning of decision.warnings) {
  console.warn(`${warning.code}: ${warning.message}`);
}

// From a RuleWithInput — result for this specific submission
const r = rl.result(decision);
if (r) {
  console.log(r.remainingTokens, r.maxTokens);
}

// From a RuleWithConfig — first denied result across all submissions
const denied = limitRule.deniedResult(decision);
if (denied) {
  console.log(denied.remainingTokens); // 0
}

// Proceed with your AI tool call...
```

## Rate limiting

### Token bucket

Use this when requests have variable cost — for example, an LLM endpoint
where each call consumes a different number of tokens. The bucket refills at
a steady rate and allows bursts up to `maxTokens`.

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = tokenBucket({
  bucket: "user-tokens", // Optional — defaults to "default-token-bucket"
  refillRate: 2_000, // Refill 2,000 tokens per interval
  intervalSeconds: 3600, // Refill every hour
  maxTokens: 5_000, // Maximum 5,000 tokens in the bucket
});

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [limitRule({ key: userId, requested: tokenEstimate })],
});

if (decision.conclusion === "DENY" && decision.reason === "RATE_LIMIT") {
  throw new Error("Rate limit exceeded");
}
```

### Fixed window

Use this when you need a hard cap per time period — the counter resets at
the end of each window. Simple to reason about, but allows bursts at
window boundaries. If that matters, use sliding window instead.

```ts
import { launchArcjet, fixedWindow } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = fixedWindow({
  bucket: "page-views", // Optional — defaults to "default-fixed-window"
  maxRequests: 1000, // Maximum requests per window
  windowSeconds: 3600, // 1-hour window
});

const decision = await arcjet.guard({
  label: "api.search",
  rules: [limitRule({ key: teamId })],
});
```

### Sliding window

Use this when you need smooth rate limiting without the burst-at-boundary
problem of fixed windows. The server interpolates between the previous and
current window, so limits are enforced across any rolling time span. Good
default choice for API rate limits.

```ts
import { launchArcjet, slidingWindow } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = slidingWindow({
  bucket: "event-writes", // Optional — defaults to "default-sliding-window"
  maxRequests: 500, // Maximum requests per interval
  intervalSeconds: 60, // 1-minute rolling window
});

const decision = await arcjet.guard({
  label: "api.events",
  rules: [limitRule({ key: userId })],
});
```

## Prompt injection detection

Detect and block prompt injection attacks — attempts to override your AI
model's instructions — before they reach your model. Also useful for
scanning tool call results that contain untrusted input (e.g. a "fetch"
tool that loads a webpage which could embed injected instructions).

```ts
import { launchArcjet, detectPromptInjection } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const piRule = detectPromptInjection();

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [piRule(userMessage)],
});

if (decision.conclusion === "DENY" && decision.reason === "PROMPT_INJECTION") {
  throw new Error("Prompt injection detected — please rephrase your message");
}

// Forward to your AI model...
```

## Sensitive information detection

Detect and block PII in text content. Use `allow` / `deny` to filter which
entity types trigger a denial. Built-in entity types are
`CREDIT_CARD_NUMBER`, `EMAIL`, `PHONE_NUMBER`, and `IP_ADDRESS`.

```ts
import { launchArcjet, localDetectSensitiveInfo } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const si = localDetectSensitiveInfo({
  deny: ["CREDIT_CARD_NUMBER", "PHONE_NUMBER"],
});

const decision = await arcjet.guard({
  label: "tools.summary",
  rules: [si(userMessage)],
});

if (decision.conclusion === "DENY" && decision.reason === "SENSITIVE_INFO") {
  throw new Error("Sensitive information detected");
}
```

### On-device detection with additional entity types

The default backend detects the four built-in types locally with pattern
matching. To detect additional types — names, addresses, and government or
financial identifiers — pass a `backend` such as
[`@arcjet/sensitive-info-rampart`](https://www.npmjs.com/package/@arcjet/sensitive-info-rampart),
which runs an on-device NER model. Detection still happens entirely locally;
only a SHA-256 hash of the text is sent to Arcjet.

```ts
import { launchArcjet, localDetectSensitiveInfo } from "@arcjet/guard";
import { rampart } from "@arcjet/sensitive-info-rampart";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const si = localDetectSensitiveInfo({
  deny: ["GIVEN_NAME", "SURNAME", "EMAIL", "SSN"],
  backend: rampart(),
});

const decision = await arcjet.guard({
  label: "tools.summary",
  rules: [si(userMessage)],
});
```

## Custom rules

Define your own local evaluation logic with arbitrary key-value data. When
`evaluate` is provided, the SDK calls it locally before sending the request.
The function receives `(config, input, { signal })` and must return
`{ conclusion: "ALLOW" | "DENY" }`.

```ts
import { launchArcjet, defineCustomRule } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const topicBlock = defineCustomRule<
  { blockedTopic: string },
  { topic: string },
  { matched: string }
>({
  evaluate: (config, input) => {
    if (input.topic === config.blockedTopic) {
      return { conclusion: "DENY", data: { matched: input.topic } };
    }
    return { conclusion: "ALLOW" };
  },
});

const rule = topicBlock({ data: { blockedTopic: "politics" } });

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [rule({ data: { topic: userTopic } })],
});
```

## Capture

Use `capture()` to record a fact about what your application did. Captures are
visibility data, never security decisions:

```ts
arcjet.capture({
  action: "refund.issued",
  correlationId: runId,
  decisionId: decision.id,
  metadata: {
    invoice: { id: "inv_123", amount: 4200 },
    refunded: true,
  },
});
```

Capture is best-effort and never blocks or throws into application code. The SDK
keeps a bounded in-memory queue, sends batches on size or delay, drops the newest
event when the queue is full, and never retries a failed batch.

A platform `waitUntil` hook does not change any of that. Events still batch; the
hook is handed a promise that settles once they have been sent, so the runtime
keeps the invocation alive long enough for the batch to go out.

### Serverless and edge runtimes

A runtime that freezes or terminates between invocations can lose whatever is
still batched, so it needs telling that background work is outstanding. That is
all `waitUntil` does — it extends the invocation, it does not disable batching.
Thirty tool calls in one agent turn stay one request, not thirty, which matters
against a Worker's subrequest budget.

Pass `waitUntil` per call:

```ts
export default {
  async fetch(request, env, ctx) {
    arcjet.capture({
      action: "refund.issued",
      waitUntil: (promise) => ctx.waitUntil(promise),
    });
    return new Response("ok");
  },
};
```

Arcjet discovers Vercel's request context on its own, so `waitUntil` is not
needed there. Every other per-invocation hook — Cloudflare's `ExecutionContext`
included — has to be passed in, because a module-scoped client cannot reach it.

Where `capture()` is called too deep to reach the platform context, `flush()` at
the end of the handler instead:

```ts
export default {
  async fetch(request, env, ctx) {
    const response = await handle(request);
    ctx.waitUntil(arcjet.flush());
    return response;
  },
};
```

### Draining

Call `flush()` during graceful shutdown to avoid losing the final batch:

```ts
await arcjet.flush(); // one-second deadline by default
await arcjet.flush(250); // custom deadline in milliseconds
```

`flush()` is optional, repeatable, and does not close the client. If its deadline
expires, remaining events are dropped and the client stays usable.

Local failures use stable `AJxxxx` diagnostics. Pass a logger to receive every
diagnostic; without one, Arcjet logs once per code:

```ts
const arcjet = launchArcjet({
  key: process.env.ARCJET_KEY!,
  logger: {
    // `@arcjet/logger` shape: the merging object comes first, the message
    // second. `fields` carries `{ code, count? }`.
    warn(fields, message) {
      applicationLogger.warn(fields, message);
    },
  },
});
```

Metadata has the same nested-JSON shape and limits as `guard()`. A key the SDK
cannot encode is reported locally as `AJ1017` and also travels with that event in
`local_warnings`. A queue-full event or failed batch never reaches the server, so
those drops can only be reported locally.

## Metadata

`guard()` and every rule accept `metadata`: an object of string keys mapped to
**any JSON-serializable value**, including nested objects and arrays. It is
attached to the decision for correlation and analytics.

```ts
const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [limitRule({ key: userId })],
  metadata: {
    user: { id: userId, plan: "pro" },
    toolName: "get_weather",
    durationMs: 160,
    success: true,
  },
});
```

Each top-level value is JSON-encoded by the SDK and stored verbatim.
Server-enforced limits:

| Limit                    | Value                          | Over the limit     |
| ------------------------ | ------------------------------ | ------------------ |
| Top-level keys           | 128                            | Extra keys dropped |
| Serialized bytes / value | 4 KiB                          | That key dropped   |
| Nesting depth / value    | 10                             | That key dropped   |
| Key names                | letters, digits, `-`, `.`, `_` | That key dropped   |

Nothing here can fail a call or change a decision — metadata is excluded from
fingerprinting. Every dropped key is reported on `decision.warnings`: the server
warns once per key it drops, and the SDK adds a single warning naming every key
it could not encode (`undefined`, a function, a `BigInt`, a circular reference). A
`metadata` that is not a plain object is ignored entirely.

Metadata is untrusted and is not redacted — do not put secrets or PII in it.

Two JavaScript-specific notes:

- Numbers are IEEE-754 doubles, so an integer above `Number.MAX_SAFE_INTEGER`
  loses precision before it reaches the wire. Pass such values as strings.
- `BigInt` cannot be JSON-encoded, so it is dropped with a warning. Convert it
  yourself.

Rule-level metadata is merged with `guard()`-level metadata shallowly: a
duplicate key's whole value is replaced, never deep-merged.

Some limits are the SDK's own, not the server's. The SDK drops keys once one
request's metadata exceeds 768 KiB in total (keys plus JSON-encoded values,
counted before compression). That ceiling sits well above anything the server
would accept — its own caps allow roughly 512 KiB in a single map — and exists
only so oversized metadata cannot push a request past the 1 MiB protocol limit,
where it would be rejected outright and fail open.

Objects with a `toJSON()` method, including `Date`, are serialized by their
`toJSON()` result. The Python SDK has no equivalent protocol and drops such values
with a warning, so convert explicitly if both SDKs must agree on a value.

## Decision inspection

Every `.guard()` call returns a `Decision` object. You can inspect it at
three levels of detail:

```ts
const rl = limitRule({ key: userId, requested: tokenCount });
const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [rl, piRule(userMessage)],
});

// Overall decision
decision.conclusion; // "ALLOW" | "DENY"
decision.reason; // "RATE_LIMIT" | "PROMPT_INJECTION" | ... (only on DENY)

// Failure check (fail-open — errors don't cause denials)
decision.hasFailedOpen(); // true if ALLOW only because a rule/decision could not be processed
decision.errorResults(); // the results that errored
decision.warnings; // decision-level request-validation diagnostics

// Per-rule results — iterate all
for (const result of decision.results) {
  console.log(result.type, result.conclusion);
}

// From a RuleWithInput — this specific submission's result
const r = rl.result(decision);
if (r) {
  console.log(r.remainingTokens, r.maxTokens);
}

// From a RuleWithConfig — first denied result across all submissions
const denied = limitRule.deniedResult(decision);
if (denied) {
  console.log(denied.remainingTokens); // 0
}
```

Methods available on both `RuleWithConfig` and `RuleWithInput`:

| Method                   | `RuleWithConfig` (e.g. `limit`) | `RuleWithInput` (e.g. `rl`)        |
| ------------------------ | ------------------------------- | ---------------------------------- |
| `results(decision)`      | All results for this config     | Single-element or empty array      |
| `result(decision)`       | First result (any conclusion)   | This submission's result           |
| `deniedResult(decision)` | First denied result             | This submission's result if denied |

## Best practices

- **Create the client and rule configs once** at module scope, not per
  request. The client holds a persistent connection (HTTP/2 on Node.js);
  rule configs carry stable IDs used for server-side aggregation.

  ```ts
  // Create the client once at module scope
  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

  // Configure reusable rules (also at module scope)
  const limitRule = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });

  // Per request — created each time
  const decision = await arcjet.guard({
    label: "tools.weather",
    rules: [limitRule({ key: userId })],
  });
  ```

- **Don't wrap `launchArcjet()` in a helper function.** This defeats
  connection reuse. Bad — creates a new client every call:

  ```ts
  function getArcjet() {
    return launchArcjet({ key: process.env.ARCJET_KEY! });
  }
  const decision = await getArcjet().guard({
    label: "tools.chat",
    rules: [tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 })({ key: userId, requested: 1 })],
  });
  ```

  Good — reuses the client:

  ```ts
  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
  const decision = await arcjet.guard({
    label: "tools.chat",
    rules: [tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 })({ key: userId, requested: 1 })],
  });
  ```

- **Start rules in `DRY_RUN` mode** to observe behavior before switching to
  `LIVE`. This lets you tune thresholds without affecting real traffic:

  ```ts
  const limitRule = tokenBucket({
    mode: "DRY_RUN",
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 100,
  });
  ```

- **Handle failures explicitly.** The SDK fails open — an errored rule does not
  cause a denial. Check `decision.hasFailedOpen()` to detect when a decision
  returned `ALLOW` only because a rule or the decision could not be processed,
  and inspect `decision.errorResults()` for the details. Gate a fail-closed
  policy on it:

  ```ts
  if (decision.hasFailedOpen()) {
    // Evaluation degraded — decide whether to proceed or deny.
    console.error("Guard failed open", decision.errorResults());
  }
  ```

  `decision.hasError()` still works but is deprecated: it conflated request
  diagnostics with errors. Use `decision.warnings` for diagnostics and
  `decision.errorResults()` / `decision.hasFailedOpen()` for errors.

- **Use labels** to identify protection boundaries. Labels appear in the
  Arcjet dashboard and help correlate decisions with specific tool calls or
  API endpoints.

- **Use `bucket`** on rate limit rules to name your counters in the
  dashboard. Different configs sharing the same bucket name still get
  independent counters — a config hash is appended server-side.

## SDK namespaces: core, agents, and integrations

`@arcjet/guard` exposes three import layers, each for different use cases:

### Core guard (`@arcjet/guard`)

The fundamental client and rule builders. Use this to evaluate guards without
any AI SDK integration:

```ts
import { launchArcjet, tokenBucket, detectPromptInjection } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [
    tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 })({ key: userId, requested: 1 }),
    detectPromptInjection()(userMessage),
  ],
});
```

### Agnostic helpers (`@arcjet/guard/agents`)

Framework-agnostic helpers for context threading, guard wrapping, and audit
capture — `createAgentContext`, `guardAction`, `captureAction`, and
`securityMetadata`:

```ts
import {
  createAgentContext,
  guardAction,
  captureAction,
  securityMetadata,
} from "@arcjet/guard/agents";

const ctx = createAgentContext({
  correlationId: requestId,
  metadata: securityMetadata({ user: userId }),
});

await guardAction(arcjet, ctx, { action: "data.updated", rules: [updateLimit({ key: userId })] }, () => updateData());
captureAction(arcjet, ctx, { action: "audit.logged" });
```

### Vendor SDK integration (`@arcjet/guard/<vendor-sdk>/v<major>`)

Vendor-specific wrappers that integrate with particular SDKs. Currently
available:

- **`@arcjet/guard/vercel-ai/v7`** — Vercel AI SDK v7 integration, re-exports
  the agents layer plus `guardTool`, `aiToolsContext`, and utilities for tool
  wrapping:

  ```ts
  import {
    guardTool,
    aiToolsContext,
    guardAction,
    securityMetadata,
  } from "@arcjet/guard/vercel-ai/v7";

  const tools = {
    getData: guardTool(arcjet, getDataTool, { action: "data.fetched", rules: [dataLimit({ key: userId, requested: 1 })] }),
  };

  const result = await generateText({
    // ...
    tools,
    toolsContext: aiToolsContext(ctx, tools),
  });
  ```

- **`@arcjet/guard/vercel-eve/v1`** (planned) — Vercel EVE integration

### The namespace convention

New vendor integrations follow the pattern `@arcjet/guard/<vendor-sdk>/v<major>`:

- **Vendor-prefixed**: The namespace names the SDK being integrated
  (`vercel-ai`, `vercel-eve`, etc.), not the feature.
- **Flat structure**: No nesting; a single level under `@arcjet/guard`.
- **Explicit versions only**: `@arcjet/guard/vercel-ai/v7` resolves, but
  `@arcjet/guard/vercel-ai` does not. Omitting the version is deliberate — with
  a fast-moving SDK surface, an unversioned alias would silently change meaning
  when a new major version is supported. Attempting to import from an unexported
  path throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.

### Optional peer dependencies

The agents layer and vendor integrations declare their SDK dependencies as
optional peers, so users importing only core guards are not forced to install
unneeded packages:

- **`@arcjet/guard`** (core) has no peer dependencies.
- **`@arcjet/guard/vercel-ai/v7`** requires `ai` and `@ai-sdk/provider-utils`
  (optional peers — the package will not be installed automatically, but the
  imports will fail clearly if the peers are missing).
- **`@arcjet/guard/agents`** has no peer dependencies and works in any Node.js
  codebase.

**pnpm caveat**: pnpm does not reliably honour
`peerDependenciesMeta.*.optional` (pnpm#5152, #8142), especially with
`--strict-peer-dependencies` enabled. If `pnpm install` fails with missing
peers, either install them explicitly or relax strict peer checking:

```sh
pnpm install ai @ai-sdk/provider-utils
# or
pnpm install --no-strict-peer-dependencies
```

### Why a separate `/agents` layer

Importing `guardTool` loads the Vercel AI SDK as a dependency, so any consumer
in a non-AI codebase that just wants `guardAction` and `captureAction` would be
forced to install `ai` anyway. The `/agents` path provides those helpers and
never reaches an AI SDK dependency, keeping your bundle clean.

### `onGuardError`: handling evaluation failures

When guard policy evaluation fails (e.g. the Arcjet API is unreachable), the
SDK still allows the request to proceed — this is the platform's fail-open
default. The agent-level helpers (`guardTool` and `guardAction`) deliberately
flip this default, because they wrap consequential effects. Their `onGuardError`
option controls what happens:

- **Default: `"deny"`** — if the policy cannot be evaluated, the call is
  blocked. For AI tool calls and application actions, this is the safe choice.
  - `guardTool` returns `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }` to the model.
  - `guardAction` throws `ArcjetGuardUnavailableError`, which is deliberately
    distinct from `ArcjetDeniedError` so a policy outage can be alerted on
    separately from a policy denial. The error carries `cause` (the guard call
    threw) or `decision` (a decision failed open), making the two
    distinguishable in a handler.
  - The capture `outcome` on that path is `"unavailable"`, not `"denied"`.
  - The fail-closed tool result carries a fixed `retryAfterSeconds: 5` backoff
    hint, not a prediction of when the policy becomes evaluable.

- **Opt-out: `onGuardError: "allow"`** — if the policy cannot be evaluated,
  proceed anyway. Use this for call sites where availability matters more than
  enforcement — e.g. a read-only tool like an order lookup. During an Arcjet
  incident, that call site is unaffected, but enforcement at other sites is
  not.

The layering resolves a potential confusion: the core `@arcjet/guard` client
still fails open by construction and *reports* it via `hasFailedOpen()`; the
agent-level helpers *decide* to block on it.

### The explicit-call alternative

`guardTool` extracts the context from the tool call automatically via the
injected `contextSchema`, which is convenient. Alternatively, call `guardAction`
directly inside the tool's `execute` block:

```ts
import { tool } from "ai";
import { z } from "zod";

const tools = {
  getData: tool({
    description: "Fetch data",
    inputSchema: z.object({ id: z.string() }),
    execute: async ({ id }) => {
      return await guardAction(arcjet, ctx, { action: "data.fetched", rules: [dataLimit({ key: `user:${userId}`, requested: 1 })] }, () => fetchData(id));
    },
  }),
};
```

This form keeps control flow visible but requires threading the context in by
hand. Both are supported; choose based on whether you prefer automatic context
extraction or explicit control flow.

### What `correlationId` is for

The `correlationId` is a user-supplied string that joins every guard decision
and capture event from one logical run **or session** into a single sequence
in the Arcjet console, so the best value is an ID the app already has and can
search by (request ID, job ID, ticket ID, review ID). If omitted, a ULID is
generated. Using a consistent ID across multiple tool calls and actions within
the same logical operation makes it easy to reconstruct the full context of
what happened.

### Rules derived from tool input

When wrapping a tool, `rules` can be a static array or a callback that
computes rules from the tool's parsed input:

```ts
const tools = {
  lookupOrder: guardTool(arcjet, lookupOrderTool, {
    action: "order.looked-up",
    rules: ({ orderNumber }) => [
      // Key the rate limit to the specific order being looked up
      orderLimit({ key: `order:${orderNumber}`, requested: 1 }),
    ],
  }),
};
```

This allows rules to vary based on the request — e.g. stricter limits for
certain users or resources. `guardAction` takes a resolved `RuleWithInput[]`,
so compute the rules at the call site and pass the array.

## Using the agent helpers

### End-to-end example

Here's a complete example protecting both an AI tool call and an app-invoked action:

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard";
import { tool, jsonSchema, generateText } from "ai";
import {
  createAgentContext,
  guardAction,
  captureAction,
  securityMetadata,
} from "@arcjet/guard/agents";
import {
  guardTool,
  aiToolsContext,
} from "@arcjet/guard/vercel-ai/v7";

// 1. Launch the guard client once (at module scope)
const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

// 2. Create security context (at request entry point)
const ctx = createAgentContext({
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

const sendEmail = guardTool(
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

await guardAction(
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

### Failure posture

- **Guard errors** (API timeouts, network failures): Fail **closed** by default. Both unavailability signals — the `guard()` call throwing, and a decision whose `hasFailedOpen()` is true — block the call: `guardTool` returns `reason: "ERROR"` with `retryable: true` and `retryAfterSeconds: 5`, and `guardAction` throws `ArcjetGuardUnavailableError`. Set `onGuardError: "allow"` to opt back into fail-open, where the tool or action still runs. A warning is logged either way when `ARCJET_LOG_LEVEL` is `debug`, `info`, or `warn`.
- **Capture events**: Fire-and-forget; never throw. If the guard client lacks `experimental_capture()`, events silently skip with a gated warning. (Current limitation: `@arcjet/guard` does not yet ship `experimental_capture()`, so `captureAction()` calls are deferred until that capability is available. The example app documents this deferral.)
- **Missing correlation ID**: Guard checks still run (uncorrelated). The first uncorrelated tool call always warns; further ones respect `ARCJET_LOG_LEVEL`.

### Which helper?

| Scenario | Helper | Guard | Model Sees |
|----------|--------|-------|-----------|
| LLM decided to call a tool | `guardTool()` | Yes (if rules provided) | `ArcjetDenialResult` on DENY |
| Your app invokes an action | `guardAction()` | Yes (if rules provided) | Throws `ArcjetDeniedError` on DENY |
| Record that something happened | `captureAction()` | No | — (fire-and-forget) |

### Threading context through boundaries

The context is a plain JSON-serializable object: thread it explicitly through function calls and workflow/queue inputs (never use module state or `AsyncLocalStorage`). Each correlation ID is 1–256 printable ASCII characters; auto-generated ones are ULIDs.

Thread an existing run identifier (request/job/review ID) so Arcjet data joins your own systems:

```ts
const ctx = createAgentContext({ correlationId: requestId });
await workflow({ question, arcjet: ctx });
```

Or omit `correlationId` to auto-generate a ULID:

```ts
const ctx = createAgentContext();
console.log(ctx.correlationId); // "01ARZ3NDEKTSV4RRFFQ69G5FAV"
```

`guardAction` and `captureAction` take the context directly. Tools can't — the model calls them, so their context arrives through the AI SDK's `toolsContext` channel instead: `aiToolsContext(ctx, tools)` builds that map, which is why `guardTool` itself never takes `ctx`.

> **Don't forget `toolsContext`.** The injected context type includes `undefined`, so the compiler will not flag a missing `toolsContext: aiToolsContext(ctx, tools)` at the `generateText` call. Omit it and guard checks run uncorrelated: the first uncorrelated call always warns, but further ones are silent unless `ARCJET_LOG_LEVEL` is set. Run once with `ARCJET_LOG_LEVEL=warn` and confirm the correlation ID reaches the dashboard.

### Denial responses

When a guard check denies a tool call, `guardTool` returns an `ArcjetDenialResult` object:

```ts
const result: ArcjetDenialResult = {
  arcjetDenied: true,
  reason: "RATE_LIMIT",
  message: "Arcjet denied this tool call (RATE_LIMIT). It may be retried after 30 seconds.",
  retryable: true,
  retryAfterSeconds: 30,
};
```

To reshape what the model sees on denial, pass `onDeny` in the tool policy — it receives the `DecisionDeny` and its return value replaces the default `ArcjetDenialResult`:

```ts
guardTool(arcjet, lookupOrderTool, {
  action: "order.looked-up",
  rules: () => [limit({ key: userId })],
  onDeny: (decision) => ({ error: `blocked: ${decision.reason}` }),
});
```

When a guard check denies an action, `guardAction` throws `ArcjetDeniedError` carrying the decision. Recommended system prompt line for tools:

> If a tool call is denied by security policy, do not retry it; explain the denial to the user or try a different approach.

### Security metadata vocabulary

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

### Adding a new SDK namespace

To add a new vendor integration (e.g. `vercel-eve/v1`):

1. Create a new directory under `src/<vendor-sdk>/v<major>/` (e.g. `src/vercel-eve/v1/`).
2. Export your integration helpers — at minimum, a wrapper equivalent to `guardTool` and a context injector.
3. Add a new entry to the `exports` field in `package.json`:
   ```json
   "./vercel-eve/v1": {
     "types": "./dist/vercel-eve/v1/index.d.ts",
     "import": "./dist/vercel-eve/v1/index.js"
   }
   ```
4. Declare optional peers in `peerDependencies` and `peerDependenciesMeta` if needed (e.g. the EVE SDK).

No changes to the shared layer, the build config, or the root export are required.

## Example

For a complete working example integrating `@arcjet/guard` with the Vercel AI SDK, see [examples/nextjs-ai-agent](https://github.com/arcjet/arcjet-js/tree/main/examples/nextjs-ai-agent), which demonstrates wrapping agent tools with guard checks, enforcing rules on application-invoked actions, and emitting audit events joined by correlation ID.

## Agent skill

For integration help in Claude Code or other AI coding agents, a skill file is packaged with `@arcjet/guard`:

```bash
# Extract the skill from node_modules into your Claude Code skills directory:
cp -r node_modules/@arcjet/guard/skills/integrate-arcjet-guard-agents ~/.claude/skills/

# Or symlink it instead:
ln -s /path/to/node_modules/@arcjet/guard/skills/integrate-arcjet-guard-agents ~/.claude/skills/
```

In Claude Code, use `/integrate-arcjet-guard-agents` to start an integration session. The skill guides you through wrapping tools with guard checks, enforcing rules on app-invoked actions, and emitting audit events joined by correlation ID.

Note: `npx skills add arcjet/skills` refers to the separate Anthropic skills marketplace, not the packaged file.

## MCP server

Connect your AI assistant to the Arcjet MCP server at
`https://api.arcjet.com/mcp` to manage sites, retrieve SDK keys, and more.
See the [docs](https://docs.arcjet.com/mcp-server) for setup instructions.

You can also manage sites and keys with the CLI: `npx @arcjet/cli`.

## Proxy support

The standard proxy environment variables (`HTTP_PROXY` and `HTTPS_PROXY`, while
respecting `NO_PROXY`) are auto-detected, making it possible to connect to the
Arcjet API through a proxy such as [Squid](https://www.squid-cache.org/). When a
proxy is in use, a line is logged at startup; the proxy
URL itself is not logged, since it can contain credentials. How the request is
actually proxied depends on the runtime:

- **Node.js** — uses the HTTP/2 transport; when a proxy is detected, requests
  are routed through it over HTTP/1.1 using the built-in proxy support of the
  Node.js HTTP agent, otherwise made directly over HTTP/2.
- **Bun** — uses the HTTP/2 transport directly, but its Node HTTP agent doesn't
  support proxying, so when a proxy is detected it falls back to the fetch-based
  transport and Bun's `fetch` performs the proxying natively.
- **Deno** — the runtime's `fetch` performs the proxying natively.
- **Cloudflare Workers** and other edge runtimes don't support outbound proxy
  environment variables, so no proxy is used.

`NO_PROXY` accepts a comma- or space-separated list of host suffixes, each with
an optional leading `.` or `*.` and an optional `:port`, plus `*` to bypass the
proxy for every host. Entries are matched as host names; IP/CIDR ranges (such as
`10.0.0.0/8`) are not supported, the same as
[curl](https://curl.se/docs/manpage.html#--noproxy). On Bun and Deno the
runtime's `fetch` applies `NO_PROXY` itself, so its exact semantics are the
runtime's.

## Runtime support

| Runtime            | Minimum version          |
| ------------------ | ------------------------ |
| Node.js            | 22.21.0 [^node]          |
| Bun                | 1.3.0                    |
| Deno               | `stable` / `lts`         |
| Cloudflare Workers | compat date `2025-09-01` |

[^node]:
    Requires `>=22.21.0 <23 || >=24.5.0`. Node.js 20 is end-of-life and Node.js
    23 is not supported; on the 24 line the built-in HTTP agent proxy support
    used for the API transport landed in 24.5.0. Anyone tracking an active LTS
    release is unaffected.

> [!TIP]
> Import from `@arcjet/guard` — the correct transport is selected
> automatically via conditional exports (HTTP/2 on Node.js and Bun,
> fetch-based on Deno and Cloudflare Workers).

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[sdks-github]: https://github.com/arcjet
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
