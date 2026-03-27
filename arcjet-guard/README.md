# @arcjet/guard

Arcjet Guards SDK — AI guardrails for rate limiting, prompt injection
detection, sensitive information detection, and custom rules.

## Runtime support

| Runtime            | Minimum version          | Entrypoint                              | Transport                             |
| ------------------ | ------------------------ | --------------------------------------- | ------------------------------------- |
| Node.js            | 22.18.0                  | `@arcjet/guard` or `@arcjet/guard/node` | HTTP/2 via `@connectrpc/connect-node` |
| Bun                | 1                        | `@arcjet/guard/fetch`                   | Fetch via `@connectrpc/connect-web`   |
| Deno               | `stable` / `lts`         | `@arcjet/guard/fetch`                   | Fetch via `@connectrpc/connect-web`   |
| Cloudflare Workers | compat date `2025-09-01` | `@arcjet/guard/fetch`                   | Fetch via `@connectrpc/connect-web`   |

The bare `@arcjet/guard` specifier uses
[conditional exports](https://nodejs.org/api/packages.html#conditional-exports):
it resolves to `@arcjet/guard/node` under the `"node"` condition and falls back
to `@arcjet/guard/fetch` everywhere else.

### Why `2025-09-01` for Cloudflare Workers?

The `2025-09-01` compatibility date enables
[`enable_nodejs_http_server_modules`](https://developers.cloudflare.com/workers/configuration/compatibility-flags/#enable-nodejs-http-server-modules),
which makes `node:http` server modules available. While the `@arcjet/guard/fetch`
entrypoint does not use Node APIs directly, `@connectrpc/connect-web` and its
dependencies rely on globals and polyfills that are only fully available at this
compatibility date.

### ES target

TypeScript is configured with `lib: ["es2023", "webworker"]` and
`target: "es2023"`. ES2023 is fully supported by V8 11.3+ (Node 22),
JavaScriptCore (Bun 1), and the current Cloudflare Workers V8 engine.
The `webworker` lib provides cross-runtime web platform types
(`performance`, `crypto`, `AbortSignal`, `fetch`, etc.) without pulling
in DOM types like `window` or `document`.

## Install

```sh
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

### Explicit transport

```ts
import { launchArcjetWithTransport } from "@arcjet/guard";
import { createTransport } from "@arcjet/guard/node";

const arcjet = launchArcjetWithTransport({
  key: "ajkey_...",
  transport: createTransport("https://decide.arcjet.com"),
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

Apache-2.0
