<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/guard`

> **⚠️ Experimental — not yet stable.** This version is in early development.
> It may stop working at any time, and there are no compatibility guarantees.
> Use a stable release train for production environments.

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

This is the [Arcjet][arcjet] Guards SDK.

## Getting started

1. Get your API key at [`app.arcjet.com`](https://app.arcjet.com)
2. `npm install @arcjet/guard`
3. Set `ARCJET_KEY=ajkey_yourkey` in your environment
4. Add a guard to your code — see the [quick start](#quick-start) below

[npm package](https://www.npmjs.com/package/@arcjet/guard) |
[GitHub source](https://github.com/arcjet/arcjet-js/tree/main/arcjet-guard) |
[Other SDKs][sdks-github]

## Features

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

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 100,
});

const pi = detectPromptInjection();

const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [limit({ key: userId }), pi(userMessage)],
});

if (decision.conclusion === "DENY") {
  if (decision.reason === "RATE_LIMIT") {
    throw new Error("Rate limited — try again later");
  }
  if (decision.reason === "PROMPT_INJECTION") {
    throw new Error("Prompt injection detected — please rephrase");
  }
  throw new Error("Request denied");
}

// Proceed with your AI tool call...
```

## Rate limiting

Arcjet supports token bucket, fixed window, and sliding window algorithms.
Token buckets are ideal for controlling AI token budgets — set `maxTokens` to
the max tokens a user can spend, `refillRate` to how many tokens are restored
per `intervalSeconds`, and deduct tokens per request via `requested`. Use the
`key` to track limits per user.

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limit = tokenBucket({
  refillRate: 2_000, // Refill 2,000 tokens per interval
  intervalSeconds: 3600, // Refill every hour
  maxTokens: 5_000, // Maximum 5,000 tokens in the bucket
});

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [limit({ key: userId, requested: tokenEstimate })],
});

if (decision.conclusion === "DENY" && decision.reason === "RATE_LIMIT") {
  throw new Error("Rate limit exceeded");
}
```

### Fixed window

Simple request counting per time window:

```ts
import { fixedWindow } from "@arcjet/guard";

const limit = fixedWindow({
  maxRequests: 1000, // Maximum requests per window
  windowSeconds: 3600, // 1-hour window
});

// In your handler:
const decision = await arcjet.guard({
  label: "api.search",
  rules: [limit({ key: teamId })],
});
```

### Sliding window

Rolling window for smoother limits:

```ts
import { slidingWindow } from "@arcjet/guard";

const limit = slidingWindow({
  maxRequests: 500, // Maximum requests per interval
  intervalSeconds: 60, // 1-minute rolling window
});

// In your handler:
const decision = await arcjet.guard({
  label: "api.events",
  rules: [limit({ key: userId })],
});
```

## Prompt injection detection

Detect and block prompt injection attacks — attempts to override your AI
model's instructions — before they reach your model. Pass the user's message
as the input to the rule.

```ts
import { launchArcjet, detectPromptInjection } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const pi = detectPromptInjection();

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [pi(userMessage)],
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
The function receives `(configData, inputData)` and must return
`{ conclusion: "ALLOW" | "DENY" }`.

```ts
import { launchArcjet, localCustom } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const custom = localCustom({
  data: { threshold: "0.5" },
  evaluate: (config, input) => {
    const score = parseFloat(input["score"] ?? "0");
    const threshold = parseFloat(config["threshold"] ?? "0");
    return score > threshold
      ? { conclusion: "DENY", data: { reason: "score too high" } }
      : { conclusion: "ALLOW" };
  },
});

const decision = await arcjet.guard({
  label: "tools.score",
  rules: [custom({ data: { score: "0.8" } })],
});
```

## Decision inspection

Every `.guard()` call returns a `Decision` object with three layers of detail:

```ts
// Layer 1: conclusion and reason
decision.conclusion; // "ALLOW" | "DENY"
decision.reason; // "RATE_LIMIT" | "PROMPT_INJECTION" | ... (only on DENY)

// Layer 2: error signal
decision.hasError(); // true if any rule errored (fail-open)

// Layer 3: per-rule results
const results = limit.results(decision); // all results for this config
const result = limitCall.result(decision); // single result for this input
const denied = limit.deniedResult(decision); // first denied result, or null
```

## Best practices

- **Create rule configs once** at module scope and reuse them with per-request
  input. The config ID is stable across calls, enabling server-side
  aggregation.

  ```ts
  // Create once at module scope
  const limit = tokenBucket({
    refillRate: 10,
    intervalSeconds: 60,
    maxTokens: 100,
  });

  // Reuse with different inputs per request
  const decision = await arcjet.guard({
    label: "tools.weather",
    rules: [limit({ key: userId })],
  });
  ```

- **Start rules in `DRY_RUN` mode** to observe behavior before switching to
  `LIVE`. This lets you tune thresholds without affecting real traffic:

  ```ts
  const limit = tokenBucket({
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

## MCP server

Connect your AI assistant to the Arcjet MCP server at
`https://api.arcjet.com/mcp` to manage sites, retrieve SDK keys, and more.
See the [docs](https://docs.arcjet.com/mcp-server) for setup instructions.

## Runtime support

| Runtime            | Minimum version          |
| ------------------ | ------------------------ |
| Node.js            | 22.18.0                  |
| Bun                | 1.3.0                    |
| Deno               | `stable` / `lts`         |
| Cloudflare Workers | compat date `2025-09-01` |

> [!TIP]
> The SDK automatically picks the best transport for your runtime —
> HTTP/2 via `node:http2` on Node.js and Bun, or fetch on Deno and Cloudflare
> Workers. You can override this by importing from `@arcjet/guard/node` or
> `@arcjet/guard/fetch` directly.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[sdks-github]: https://github.com/arcjet
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
