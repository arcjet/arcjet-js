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

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] Guards SDK for AI guardrails — rate limiting,
prompt injection detection, sensitive information detection, and custom rules.
**Find our other [SDKs on GitHub][sdks-github]**.

## Features

- 🪣 **Token bucket rate limiting** — smooth, burst-friendly rate control.
- 🪟 **Fixed window rate limiting** — simple request counting per time window.
- 📐 **Sliding window rate limiting** — rolling window for smoother limits.
- 🛡️ **Prompt injection detection** — detect and block prompt injection
  attacks.
- 🕵️ **Sensitive information detection** — block PII with local WASM-based
  detection via [`@arcjet/analyze`][arcjet-analyze].
- 🔧 **Custom rules** — define your own local evaluation logic.

## Runtime support

| Runtime            | Minimum version          | Entrypoint                              | Transport                             |
| ------------------ | ------------------------ | --------------------------------------- | ------------------------------------- |
| Node.js            | 22.18.0                  | `@arcjet/guard` or `@arcjet/guard/node` | HTTP/2 via `@connectrpc/connect-node` |
| Bun                | 1                        | `@arcjet/guard` or `@arcjet/guard/fetch`| Fetch via `@connectrpc/connect-web`   |
| Deno               | `stable` / `lts`         | `@arcjet/guard/fetch`                   | Fetch via `@connectrpc/connect-web`   |
| Cloudflare Workers | compat date `2025-09-01` | `@arcjet/guard/fetch`                   | Fetch via `@connectrpc/connect-web`   |

The bare `@arcjet/guard` specifier uses
[conditional exports](https://nodejs.org/api/packages.html#conditional-exports):
it resolves to `@arcjet/guard/node` under the `"node"` and `"bun"` conditions
and falls back to `@arcjet/guard/fetch` everywhere else.

## Installation

```shell
npm install @arcjet/guard
```

## Quick start

### Node.js

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard";

const arcjet = launchArcjet({ key: "ajkey_..." });

const limit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 100,
});

const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [limit({ key: userId })],
});

if (decision.conclusion === "DENY") {
  throw new Error(`Rate limited: ${decision.reason}`);
}
```

### Deno / Bun / Cloudflare Workers

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard/fetch";

const arcjet = launchArcjet({ key: "ajkey_..." });

const limit = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 100,
});

const decision = await arcjet.guard({
  label: "tools.weather",
  rules: [limit({ key: userId })],
});
```

## Entrypoints

| Specifier             | Description                                        |
| --------------------- | -------------------------------------------------- |
| `@arcjet/guard`       | Conditional: `./node` on Node, `./fetch` elsewhere |
| `@arcjet/guard/node`  | HTTP/2 transport (Node.js)                         |
| `@arcjet/guard/fetch` | Fetch transport (Deno, Bun, Workers, browsers)     |

## Rules

| Factory                            | Description                         |
| ---------------------------------- | ----------------------------------- |
| `tokenBucket(config)`              | Token bucket rate limiting          |
| `fixedWindow(config)`              | Fixed window rate limiting          |
| `slidingWindow(config)`            | Sliding window rate limiting        |
| `detectPromptInjection(config)`    | Prompt injection detection          |
| `localDetectSensitiveInfo(config)` | Sensitive information detection     |
| `localCustom(config)`              | Custom rule with user-defined logic |

## Decision inspection

```ts
// Layer 1: conclusion and reason
decision.conclusion; // "ALLOW" | "DENY"
decision.reason; // "RATE_LIMIT" | "PROMPT_INJECTION" | ...

// Layer 2: error signal
decision.hasError(); // true if any rule errored (fail-open)

// Layer 3: per-rule results
const results = limit.results(decision); // all results for this config
const result = limitCall.result(decision); // single result for this input
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[sdks-github]: https://github.com/arcjet
[arcjet-analyze]: https://www.npmjs.com/package/@arcjet/analyze
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
