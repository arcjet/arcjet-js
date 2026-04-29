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

[Arcjet][arcjet] is the runtime security platform that ships with your AI code.
Guards provide rate limiting, prompt injection detection, sensitive information
detection, and custom rules for AI tool calls and other backend operations.
Every feature works on Node.js, Deno, Bun, and Cloudflare Workers.

This is the [Arcjet][arcjet] Guards SDK for **non-request protection** — use it
for AI agent tool calls, MCP server handlers, queue workers, background jobs,
and anything else that doesn't have an HTTP request object. If you're protecting
HTTP routes, use a [framework SDK](https://github.com/arcjet/arcjet-js#sdks)
like `@arcjet/next` or `@arcjet/node` instead.

## Getting started

### Quick setup with an AI agent

1. Log in with the CLI:
   ```sh
   npx @arcjet/cli auth login
   ```
2. Install the guard protection skill to give your coding agent the docs it needs:
   ```sh
   npx skills add arcjet/skills --skill add-guard-protection
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

// Check for errors (fail-open — errors don't cause denials)
if (decision.hasError()) {
  console.warn("At least one rule errored");
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

// Error check (fail-open — errors don't cause denials)
decision.hasError(); // true if any rule errored

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
  connection reuse:

  ```ts
  // Bad — creates a new client (and connection) every call
  function getArcjet() {
    return launchArcjet({ key: process.env.ARCJET_KEY! });
  }
  const decision = await getArcjet().guard({ ... });

  // Good — reuses the client
  const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
  const decision = await arcjet.guard({ ... });
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

- **Handle errors explicitly.** Check `decision.hasError()` to detect rules
  that errored during evaluation. The SDK fails open — an errored rule does
  not cause a denial:

  ```ts
  if (decision.hasError()) {
    console.error("Guard error — proceeding with caution");
  }
  ```

- **Use labels** to identify protection boundaries. Labels appear in the
  Arcjet dashboard and help correlate decisions with specific tool calls or
  API endpoints.

- **Use `bucket`** on rate limit rules to name your counters in the
  dashboard. Different configs sharing the same bucket name still get
  independent counters — a config hash is appended server-side.

## MCP server

Connect your AI assistant to the Arcjet MCP server at
`https://api.arcjet.com/mcp` to manage sites, retrieve SDK keys, and more.
See the [docs](https://docs.arcjet.com/mcp-server) for setup instructions.

You can also manage sites and keys with the CLI: `npx @arcjet/cli`.

## Runtime support

| Runtime            | Minimum version          |
| ------------------ | ------------------------ |
| Node.js            | 22.18.0                  |
| Bun                | 1.3.0                    |
| Deno               | `stable` / `lts`         |
| Cloudflare Workers | compat date `2025-09-01` |

> [!TIP]
> Import from `@arcjet/guard` — the correct transport is selected
> automatically via conditional exports (HTTP/2 on Node.js and Bun,
> fetch-based on Deno and Cloudflare Workers).

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[sdks-github]: https://github.com/arcjet
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
