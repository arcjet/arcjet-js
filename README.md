<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet - JS SDK

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
    <img alt="npm badge" src="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
  </picture>
</p>

[Arcjet][arcjet] is the runtime security platform that ships with your AI code. Stop bots and automated attacks from burning your AI budget, leaking data, or misusing tools with Arcjet's AI security building blocks.

This is the monorepo containing various [Arcjet][arcjet] open source packages
for JS.

## Which package do I need?

Arcjet protects two types of entry points. Pick the right path for your use
case:

| Entry point            | When to use                                                                                                    | Package                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Request protection** | HTTP route handlers, API endpoints, middleware — anything with an incoming `Request` object.                   | `@arcjet/next`, `@arcjet/node`, `@arcjet/bun`, etc. |
| **Guard protection**   | AI agent tool calls, MCP server handlers, queue workers, background jobs — anything _without_ an HTTP request. | [`@arcjet/guard`](./arcjet-guard/README.md)         |

Not sure? If you have an HTTP request, use a [framework SDK](#sdks). If you
don't, use [`@arcjet/guard`](./arcjet-guard/README.md). You can use both in the
same project.

## Getting started

The fastest way to get started is with an AI coding agent. Log in, install
a skill, and let your agent handle the rest.

### Step 1: Log in with the CLI

```sh
npx @arcjet/cli auth login
```

You can also sign up and manage keys at
[`app.arcjet.com`](https://app.arcjet.com?utm_campaign=arcjet-js), or connect
the [Arcjet MCP server](https://docs.arcjet.com/mcp-server) to your AI
assistant.

### Step 2: Install a skill

Skills give your agent the documentation to detect your framework, install
the SDK, and wire up protection rules. Install one per use case:

**Request protection** (HTTP routes):

```sh
npx skills add arcjet/skills --skill add-route-protection
```

**Guard protection** (tool calls, MCP servers, queues):

```sh
npx skills add arcjet/skills --skill add-guard-protection
```

> You can also use the [Arcjet plugin for Claude Code and
> Cursor](https://docs.arcjet.com/arcjet-plugin), which bundles skills, MCP,
> and coding rules.

### Step 3: Install the SDK

**For request protection** — pick the SDK for your framework:

| Framework    | Package                         | Install                      |
| ------------ | ------------------------------- | ---------------------------- |
| Next.js      | `@arcjet/next`                  | `npm i @arcjet/next`         |
| Node.js      | `@arcjet/node`                  | `npm i @arcjet/node`         |
| Bun          | `@arcjet/bun`                   | `bun add @arcjet/bun`        |
| Deno         | `@arcjet/deno`                  | `deno add npm:@arcjet/deno`  |
| Express      | `@arcjet/node`                  | `npm i @arcjet/node`         |
| Fastify      | `@arcjet/fastify`               | `npm i @arcjet/fastify`      |
| Hono         | `@arcjet/node` or `@arcjet/bun` | `npm i @arcjet/node`         |
| NestJS       | `@arcjet/nest`                  | `npm i @arcjet/nest`         |
| Nuxt         | `@arcjet/nuxt`                  | `npm i @arcjet/nuxt`         |
| Remix        | `@arcjet/remix`                 | `npm i @arcjet/remix`        |
| React Router | `@arcjet/react-router`          | `npm i @arcjet/react-router` |
| SvelteKit    | `@arcjet/sveltekit`             | `npm i @arcjet/sveltekit`    |
| Astro        | `@arcjet/astro`                 | `npm i @arcjet/astro`        |

**For guard protection:**

```sh
npm i @arcjet/guard
```

### Step 4: Tell your agent what to protect

Ask your coding agent to implement protection. The skill you installed in
Step 2 gives it everything it needs. For example:

> "Add Arcjet bot protection and rate limiting to my /api/chat route"

> "Add Arcjet guard with prompt injection detection to my MCP tool handler"

The agent will install the right package, configure rules, and wire up
`protect()` or `guard()` calls — or see the [full list of protections](#features)
below.

### Get help

[Join our Discord server][discord-invite] or [reach out for support][support].

- [Documentation](https://docs.arcjet.com) — full reference and guides
- [Example apps](#example-apps) — working starter projects for every framework
- [Blueprints](#blueprints) — recipes for common security patterns

## Features

| Feature                                                                                                           | Request SDKs | Guard |
| ----------------------------------------------------------------------------------------------------------------- | :----------: | :---: |
| 🛑 [Rate Limiting](#rate-limiting) — token bucket, fixed window, sliding window                                   |      ✅      |  ✅   |
| 🔒 [Prompt Injection Detection](#prompt-injection-detection) — block attacks before they reach your LLM           |      ✅      |  ✅   |
| 🕵️ [Sensitive Information Detection](#sensitive-information-detection) — block PII, credit cards, custom patterns |      ✅      |  ✅   |
| 🤖 [Bot Protection](#bot-protection) — stop scrapers, credential stuffers, AI crawlers                            |      ✅      |   —   |
| 🛡️ [Shield WAF](#shield-waf) — protect against SQL injection, XSS, OWASP Top 10                                   |      ✅      |   —   |
| 📧 [Email Validation](#email-validation) — block disposable, invalid, undeliverable addresses                     |      ✅      |   —   |
| 📝 [Signup Form Protection][feature-signup-protection] — bot + email + rate limiting combined                     |      ✅      |   —   |
| 🎯 [Request Filters](#request-filters) — expression-based rules on IP, path, headers                              |      ✅      |   —   |
| 🌐 [IP Analysis](#ip-analysis) — geolocation, ASN, VPN, proxy, Tor, hosting detection                             |      ✅      |   —   |
| 🔧 [Custom Rules](#custom-rules-guard) — define your own local evaluation logic                                   |      —       |  ✅   |

**Request SDKs** = `@arcjet/next`, `@arcjet/node`, `@arcjet/bun`, etc. — for HTTP routes.
**Guard** = `@arcjet/guard` — for tool calls, MCP servers, queues, and anything without an HTTP request.

## Example apps

- [Astro][github-arcjet-example-astro]
- [Deno][github-arcjet-example-deno]
- [Express][github-arcjet-example-express]
- [FastAPI][github-arcjet-example-fastapi]
- [Fastify][github-arcjet-example-fastify]
- [NestJS][github-arcjet-example-nestjs]
- [Next.js][github-arcjet-example-nextjs] ([try live][arcjet-example])
- [Nuxt][github-arcjet-example-nuxt]
- [React Router][github-arcjet-example-react-router]
- [Remix][github-arcjet-example-remix]
- [SvelteKit][github-arcjet-example-sveltekit]
- [Tanstack Start][github-arcjet-example-tanstack-start]

## Blueprints

- [AI quota control][blueprint-ai-quota-control]
- [Cookie banner][blueprint-cookie-banner]
- [Custom rule][blueprint-custom-rule]
- [IP geolocation][blueprint-ip-geolocation]
- [Feedback form][blueprint-feedback-form]
- [Malicious traffic][blueprint-malicious-traffic]
- [Payment form][blueprint-payment-form]
- [Sampling traffic][blueprint-sampling-traffic]
- [VPN & proxy][blueprint-vpn-proxy]

## Usage

Read the docs at [`docs.arcjet.com`][arcjet-docs].

> **Note:** Examples below use `@arcjet/next` for illustration. Replace with
> the SDK for your runtime — `@arcjet/node`, `@arcjet/bun`, `@arcjet/sveltekit`,
> etc. The API is identical across all [SDKs](#sdks).

### Vercel AI SDK example

This example protects a Next.js AI chat route using the [Vercel AI
SDK][vercel-ai-sdk]: blocking automated clients that inflate costs, enforcing
per-user token budgets, detecting sensitive information in messages, and
blocking prompt injection attacks before they reach the model.

```ts
// app/api/chat/route.ts
import { openai } from "@ai-sdk/openai";
import arcjet, {
  detectBot,
  detectPromptInjection,
  sensitiveInfo,
  shield,
  tokenBucket,
} from "@arcjet/next";
import type { UIMessage } from "ai";
import { convertToModelMessages, isTextUIPart, streamText } from "ai";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your key with: npx @arcjet/cli sites get-key
  // Track budgets per user — replace "userId" with any stable identifier
  characteristics: ["userId"],
  rules: [
    // Shield protects against common web attacks e.g. SQL injection
    shield({ mode: "LIVE" }),
    // Block all automated clients — bots inflate AI costs
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      allow: [], // Block all bots. See https://arcjet.com/bot-list
    }),
    // Enforce budgets to control AI costs. Adjust rates and limits as needed.
    tokenBucket({
      mode: "LIVE",
      refillRate: 2_000, // Refill 2,000 tokens per hour
      interval: "1h",
      capacity: 5_000, // Maximum 5,000 tokens in the bucket
    }),
    // Block messages containing sensitive information to prevent data leaks
    sensitiveInfo({
      mode: "LIVE",
      // Block PII types that should never appear in AI prompts.
      // Remove types your app legitimately handles (e.g. EMAIL for a support bot).
      deny: ["CREDIT_CARD_NUMBER", "EMAIL"],
    }),
    // Detect prompt injection attacks before they reach your AI model
    detectPromptInjection({
      mode: "LIVE",
    }),
  ],
});

export async function POST(req: Request) {
  const userId = "user-123"; // Replace with your session/auth lookup
  const { messages }: { messages: UIMessage[] } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  // Estimate token cost: ~1 token per 4 characters of text (rough heuristic)
  const totalChars = modelMessages.reduce((sum, m) => {
    const content =
      typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    return sum + content.length;
  }, 0);
  const estimate = Math.ceil(totalChars / 4);

  // Extract the most recent user message to scan for injection and PII
  const lastMessage: string = (messages.at(-1)?.parts ?? [])
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join(" ");

  const decision = await aj.protect(req, {
    userId,
    requested: estimate,
    sensitiveInfoValue: lastMessage,
    detectPromptInjectionMessage: lastMessage,
  });

  if (decision.isDenied()) {
    if (decision.reason.isBot()) {
      return new Response("Automated clients are not permitted", {
        status: 403,
      });
    } else if (decision.reason.isRateLimit()) {
      return new Response("AI usage limit exceeded", { status: 429 });
    } else if (decision.reason.isSensitiveInfo()) {
      return new Response("Sensitive information detected", { status: 400 });
    } else if (decision.reason.isPromptInjection()) {
      return new Response(
        "Prompt injection detected — please rephrase your message",
        { status: 400 },
      );
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const result = await streamText({
    model: openai("gpt-4o"),
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
```

### Prompt injection detection

Detect and block prompt injection attacks — attempts to override your AI
model's instructions — before they reach your model. Pass the user's message
via `detectPromptInjectionMessage` on each `protect()` call.

```ts
import arcjet, { detectPromptInjection } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectPromptInjection({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
    }),
  ],
});

export async function POST(request: Request) {
  const { message } = await request.json();

  const decision = await aj.protect(request, {
    detectPromptInjectionMessage: message,
  });

  if (decision.isDenied() && decision.reason.isPromptInjection()) {
    return new Response(
      "Prompt injection detected — please rephrase your message",
      { status: 400 },
    );
  }

  // Forward to your AI model...
}
```

### Bot protection

Arcjet allows you to configure a list of bots to allow or deny. Specifying
`allow` means all other bots are denied. An empty allow list blocks all bots.

Available categories: `CATEGORY:ACADEMIC`, `CATEGORY:ADVERTISING`,
`CATEGORY:AI`, `CATEGORY:AMAZON`, `CATEGORY:APPLE`, `CATEGORY:ARCHIVE`,
`CATEGORY:BOTNET`, `CATEGORY:FEEDFETCHER`, `CATEGORY:GOOGLE`,
`CATEGORY:META`, `CATEGORY:MICROSOFT`, `CATEGORY:MONITOR`,
`CATEGORY:OPTIMIZER`, `CATEGORY:PREVIEW`, `CATEGORY:PROGRAMMATIC`,
`CATEGORY:SEARCH_ENGINE`, `CATEGORY:SLACK`, `CATEGORY:SOCIAL`,
`CATEGORY:TOOL`, `CATEGORY:UNKNOWN`, `CATEGORY:VERCEL`,
`CATEGORY:WEBHOOK`, `CATEGORY:YAHOO`. You can also allow or deny
[specific bots by name][bot-list].

```ts
import arcjet, { detectBot } from "@arcjet/next";
import { isSpoofedBot } from "@arcjet/inspect";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectBot({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories:
        // "CATEGORY:MONITOR",  // Uptime monitoring services
        // "CATEGORY:PREVIEW",  // Link previews e.g. Slack, Discord
        // See the full list at https://arcjet.com/bot-list
      ],
    }),
  ],
});

export async function GET(request: Request) {
  const decision = await aj.protect(request);

  if (decision.isDenied() && decision.reason.isBot()) {
    return new Response("No bots allowed", { status: 403 });
  }

  // Arcjet verifies the authenticity of common bots using IP data.
  // Verification isn't always possible, so check the results separately.
  // https://docs.arcjet.com/bot-protection/reference#bot-verification
  if (decision.results.some(isSpoofedBot)) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response("Hello world");
}
```

Bots can be configured by [category][feature-bot-protection] and/or by
[specific bot name][bot-list]. For example, to allow search engines and the
OpenAI crawler, but deny all other bots:

```ts
detectBot({
  mode: "LIVE",
  allow: ["CATEGORY:SEARCH_ENGINE", "OPENAI_CRAWLER_SEARCH"],
});
```

### Rate limiting

Arcjet supports token bucket, fixed window, and sliding window algorithms.
Token buckets are ideal for controlling AI token budgets — set `capacity` to
the max tokens a user can spend, `refillRate` to how many tokens are restored
per `interval`, and deduct tokens per request via `requested` in `protect()`.
The `interval` accepts strings (`"1s"`, `"1m"`, `"1h"`, `"1d"`) or seconds as
a number. Use `characteristics` to track limits per user instead of per IP.

```ts
import arcjet, { tokenBucket } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["userId"], // Track per user
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 2_000, // Refill 2,000 tokens per hour
      interval: "1h",
      capacity: 5_000, // Maximum 5,000 tokens in the bucket
    }),
  ],
});

const decision = await aj.protect(request, {
  userId: "user-123",
  requested: estimate, // Number of tokens to deduct
});

if (decision.isDenied() && decision.reason.isRateLimit()) {
  return new Response("AI usage limit exceeded", { status: 429 });
}
```

### Sensitive information detection

Detect and block PII in request content. Pass the content to scan via
`sensitiveInfoValue` on each `protect()` call. Built-in entity types:
`CREDIT_CARD_NUMBER`, `EMAIL`, `PHONE_NUMBER`, `IP_ADDRESS`. You can also
provide a custom `detect` callback for additional patterns.

```ts
import arcjet, { sensitiveInfo } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    sensitiveInfo({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      deny: ["CREDIT_CARD_NUMBER", "EMAIL", "PHONE_NUMBER"],
    }),
  ],
});

const decision = await aj.protect(request, {
  sensitiveInfoValue: userMessage,
});

if (decision.isDenied() && decision.reason.isSensitiveInfo()) {
  return new Response("Sensitive information detected", { status: 400 });
}
```

### Shield WAF

Protect your application against common web attacks, including the OWASP
Top 10.

```ts
import arcjet, { shield } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
    }),
  ],
});
```

### Email validation

Validate and verify email addresses. Deny types: `DISPOSABLE`, `FREE`,
`NO_MX_RECORDS`, `NO_GRAVATAR`, `INVALID`.

```ts
import arcjet, { validateEmail } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    validateEmail({
      mode: "LIVE",
      deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
    }),
  ],
});

const decision = await aj.protect(request, {
  email: "user@example.com",
});

if (decision.isDenied() && decision.reason.isEmail()) {
  return new Response("Invalid email address", { status: 400 });
}
```

### Request filters

Filter requests using expression-based rules against request properties (IP,
headers, path, method, etc.).

```ts
import arcjet, { filter } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    filter({
      mode: "LIVE",
      deny: ['ip.src == "1.2.3.4"', 'http.request.uri.path contains "/admin"'],
    }),
  ],
});
```

#### Block by country

Restrict access to specific countries — useful for licensing, compliance, or
regional rollouts. The `allow` list denies all countries not listed:

```ts
filter({
  mode: "LIVE",
  // Allow only US traffic — all other countries are denied
  allow: ['ip.src.country == "US"'],
});
```

#### Block VPN and proxy traffic

Prevent anonymized traffic from accessing sensitive endpoints — useful for
fraud prevention, enforcing geo-restrictions, and reducing abuse:

```ts
filter({
  mode: "LIVE",
  deny: [
    "ip.src.vpn", // VPN services
    "ip.src.proxy", // Open proxies
    "ip.src.tor", // Tor exit nodes
  ],
});
```

For more nuanced handling, use `decision.ip` helpers after calling `protect()`:

```ts
const decision = await aj.protect(request);

if (decision.ip.isVpn() || decision.ip.isTor()) {
  return new Response("VPN traffic not allowed", { status: 403 });
}
```

See the [Request Filters docs][feature-filters],
[IP Geolocation blueprint][blueprint-ip-geolocation], and
[VPN/Proxy Detection blueprint][blueprint-vpn-proxy] for more details.

### IP analysis

Arcjet enriches every request with IP metadata. Use these helpers to make
policy decisions based on network signals:

```ts
const decision = await aj.protect(request);

if (decision.ip.isHosting()) {
  // Requests from cloud/hosting providers are often automated.
  // https://docs.arcjet.com/blueprints/vpn-proxy-detection
  return new Response("Forbidden", { status: 403 });
}

if (decision.ip.isVpn() || decision.ip.isProxy() || decision.ip.isTor()) {
  // Handle VPN/proxy traffic according to your policy
}

// Access geolocation and network details
console.log(decision.ip.country, decision.ip.city, decision.ip.asn);
```

### Custom characteristics

Track and limit requests by any stable identifier — user ID, API key, session,
etc. — rather than IP address alone.

```ts
const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  characteristics: ["userId"], // Declare at the SDK level
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 2_000,
      interval: "1h",
      capacity: 5_000,
    }),
  ],
});

// Pass the characteristic value at request time
const decision = await aj.protect(request, {
  userId: "user-123",
  requested: estimate,
});
```

## Arcjet Guard

> `@arcjet/guard` is a lower-level API designed for AI
> agent tool calls and background tasks where there is no HTTP request object.
> It gives you fine-grained, per-call control over rate limiting, prompt
> injection detection, sensitive information detection, and custom rules.

### How it differs from framework SDKs

|                    | Framework SDKs (`@arcjet/next`, etc.)             | `@arcjet/guard`                                                 |
| ------------------ | ------------------------------------------------- | --------------------------------------------------------------- |
| **Designed for**   | HTTP request protection                           | AI agent tool calls, background jobs                            |
| **Request object** | Required (`protect(request, ...)`)                | Not needed                                                      |
| **Rule binding**   | Rules configured once, input via `protect()` opts | Rules configured as functions, called with input per invocation |
| **Rate limit key** | IP or `characteristics` dict                      | Explicit `key` string (SHA-256 hashed before sending)           |
| **Custom rules**   | Not supported                                     | `defineCustomRule` with typed config/input/data                 |

### Installation

```sh
npm i @arcjet/guard
```

### Quick start

```ts
import {
  launchArcjet,
  tokenBucket,
  detectPromptInjection,
} from "@arcjet/guard";

// Create the Arcjet client once at module scope
const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

// Configure reusable rules
const limitRule = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 100,
});
const piRule = detectPromptInjection();

// Per request — create rule inputs each time
async function handleToolCall(
  userId: string,
  userMessage: string,
  tokenCount: number,
) {
  const rl = limitRule({ key: userId, requested: tokenCount });
  const decision = await arcjet.guard({
    label: "tools.weather",
    rules: [rl, piRule(userMessage)],
  });

  if (decision.conclusion === "DENY") {
    throw new Error(`Blocked: ${decision.reason}`);
  }

  // safe to proceed
}
```

### Rate limiting (Guard)

Token bucket, fixed window, and sliding window algorithms are available.
Configure the rule once, then call it with a `key` (and optional `requested`
token count) for each invocation.

#### Token bucket (Guard)

```ts
import { launchArcjet, tokenBucket } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = tokenBucket({
  refillRate: 2_000, // tokens added per interval
  intervalSeconds: 3600, // seconds between refills
  maxTokens: 5_000, // maximum bucket capacity
});

const decision = await arcjet.guard({
  label: "tools.chat",
  rules: [limitRule({ key: userId, requested: tokenEstimate })],
});

if (decision.conclusion === "DENY" && decision.reason === "RATE_LIMIT") {
  throw new Error("Rate limit exceeded");
}
```

#### Fixed window (Guard)

```ts
import { launchArcjet, fixedWindow } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = fixedWindow({
  maxRequests: 1000, // maximum requests per window
  windowSeconds: 3600, // 1-hour window
});

const decision = await arcjet.guard({
  label: "api.search",
  rules: [limitRule({ key: teamId })],
});
```

#### Sliding window (Guard)

```ts
import { launchArcjet, slidingWindow } from "@arcjet/guard";

const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });

const limitRule = slidingWindow({
  maxRequests: 500, // maximum requests per interval
  intervalSeconds: 60, // 1-minute rolling window
});

const decision = await arcjet.guard({
  label: "api.events",
  rules: [limitRule({ key: userId })],
});
```

### Prompt injection detection (Guard)

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
```

### Sensitive information detection (Guard)

Detects PII locally — the raw text never leaves the SDK. Built-in entity
types: `EMAIL`, `PHONE_NUMBER`, `IP_ADDRESS`, `CREDIT_CARD_NUMBER`.

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

### Custom rules (Guard)

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

### Per-rule results (Guard)

Both the configured rule and the bound input provide typed result accessors:

```ts
const limitRule = tokenBucket({
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 100,
});
const rl = limitRule({ key: userId, requested: 5 });

const decision = await arcjet.guard({ label: "tools.weather", rules: [rl] });

// From the bound input (matches exact invocation)
const r = rl.result(decision);
if (r) {
  console.log(r.remainingTokens, r.maxTokens);
}

// From the configured rule (matches all invocations of this rule)
const ruleResult = limitRule.result(decision);

// Check only denied results
const denied = rl.deniedResult(decision);
if (denied) {
  console.log(`Rate limited — resets at ${denied.resetAtUnixSeconds}`);
}
```

Methods available on both `RuleWithConfig` and `RuleWithInput`:

| Method                   | `RuleWithConfig` (e.g. `limitRule`) | `RuleWithInput` (e.g. `rl`)        |
| ------------------------ | ----------------------------------- | ---------------------------------- |
| `results(decision)`      | All results for this config         | Single-element or empty array      |
| `result(decision)`       | First result (any conclusion)       | This submission's result           |
| `deniedResult(decision)` | First denied result                 | This submission's result if denied |

### Decision API (Guard)

```ts
const decision = await arcjet.guard({ label: "tools.weather", rules: [...] });

// Layer 1: conclusion and reason
decision.conclusion;   // "ALLOW" or "DENY"
decision.reason;       // "RATE_LIMIT", "PROMPT_INJECTION", "SENSITIVE_INFO", "CUSTOM", "ERROR", etc.

// Layer 2: error detection
decision.hasError();   // true if any rule errored or the server reported diagnostics

// Layer 3: per-rule results (see "Per-rule results" above)
for (const result of decision.results) {
  console.log(result.type, result.conclusion);
}
```

### `guard()` parameter reference

| Parameter  | Type                                  | Description                                  |
| ---------- | ------------------------------------- | -------------------------------------------- |
| `rules`    | `RuleWithInput[]`                     | Bound rule inputs (required)                 |
| `label`    | `string`                              | Label identifying this guard call (required) |
| `metadata` | `Record<string, string> \| undefined` | Optional key-value metadata                  |

### DRY_RUN mode (Guard)

All guard rules accept a `mode` parameter. Use `"DRY_RUN"` to evaluate rules
without blocking:

```ts
const limitRule = tokenBucket({
  mode: "DRY_RUN",
  refillRate: 10,
  intervalSeconds: 60,
  maxTokens: 100,
});
```

## Best practices

See the [Arcjet best practices][best-practices] for detailed guidance. Key
recommendations:

**Create a single client instance** and reuse it across your app using
`withRule()` to attach route-specific rules. The SDK caches decisions and
configuration, so creating a new instance per request wastes that work.

```ts
// lib/arcjet.ts — create once, import everywhere
import arcjet, { shield } from "@arcjet/next";
// Replace @arcjet/next with @arcjet/node, @arcjet/bun, etc. for your runtime

export default arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }), // base rules applied to every request
  ],
});
```

```ts
// app/api/chat/route.ts — extend per-route with withRule()
import aj from "@/lib/arcjet";
import { detectBot, tokenBucket } from "@arcjet/next";

const routeAj = aj.withRule(detectBot({ mode: "LIVE", allow: [] })).withRule(
  tokenBucket({
    mode: "LIVE",
    refillRate: 2_000,
    interval: "1h",
    capacity: 5_000,
  }),
);

export async function POST(req: Request) {
  const decision = await routeAj.protect(req, { requested: 500 });
  // ...
}
```

**Other recommendations:**

- **Call `protect()` in route handlers, not middleware.** Middleware lacks
  route context, making it hard to apply route-specific rules or customize
  responses.
- **Call `protect()` once per request.** Calling it in both middleware and a
  handler doubles the work and can produce unexpected results.
- **Start rules in `DRY_RUN` mode** to observe behavior before switching to
  `LIVE`. This lets you tune thresholds without affecting real traffic.
- **Configure proxies** if your app runs behind a load balancer or reverse
  proxy so Arcjet resolves the real client IP:
  ```ts
  arcjet({
    key: process.env.ARCJET_KEY!,
    rules: [],
    proxies: ["100.100.100.100"],
  });
  ```
- **Handle errors explicitly.** `protect()` never throws — on error it returns
  an `ERROR` result. Fail open by logging and allowing the request:
  ```ts
  if (decision.isErrored()) {
    console.error("Arcjet error", decision.reason.message);
    // allow the request to proceed
  }
  ```

## Packages

We provide the source code for various packages in this repository, so you can
find a specific one through the categories and descriptions below.

### SDKs

- [`@arcjet/astro`](./arcjet-astro/README.md): SDK for Astro.
- [`@arcjet/bun`](./arcjet-bun/README.md): SDK for Bun.
- [`@arcjet/deno`](./arcjet-deno/README.md): SDK for Deno.
- [`@arcjet/fastify`](./arcjet-fastify/README.md): SDK for Fastify.
- [`@arcjet/guard`](./arcjet-guard/README.md): Guards SDK for AI agent tool calls and background tasks.
- [`@arcjet/nest`](./arcjet-nest/README.md): SDK for NestJS.
- [`@arcjet/next`](./arcjet-next/README.md): SDK for Next.js.
- [`@arcjet/node`](./arcjet-node/README.md): SDK for Node.js.
- [`@arcjet/nuxt`](./arcjet-nuxt/README.md): SDK for Nuxt.
- [`@arcjet/react-router`](./arcjet-react-router/README.md): SDK for React Router.
- [`@arcjet/remix`](./arcjet-remix/README.md): SDK for Remix.
- [`@arcjet/sveltekit`](./arcjet-sveltekit/README.md): SDK for SvelteKit.

### Nosecone

See [the docs][nosecone-docs] for details.

- [`@nosecone/next`](./nosecone-next/README.md): Protect your Next.js
  application with secure headers.
- [`@nosecone/sveltekit`](./nosecone-sveltekit/README.md): Protect your
  SvelteKit application with secure headers.
- [`nosecone`](./nosecone/README.md): Protect your `Response` with secure
  headers.

### Utilities

- [`@arcjet/analyze`](./analyze/README.md): Local analysis engine.
- [`@arcjet/body`](./body/README.md): Extract the body from a stream.
- [`@arcjet/cache`](./cache/README.md): Basic cache interface and
  implementations.
- [`@arcjet/decorate`](./decorate/README.md): Decorate responses with
  info.
- [`@arcjet/duration`](./duration/README.md): Parse duration strings.
- [`@arcjet/env`](./env/README.md): Environment detection.
- [`@arcjet/headers`](./headers/README.md): Extension of the Headers class.
- [`@arcjet/inspect`](./inspect/README.md): Inspect decisions made by an SDK.
- [`@arcjet/ip`](./ip/README.md): Find the originating IP of a request.
- [`@arcjet/logger`](./logger/README.md): Lightweight logger which mirrors the
  Pino structured logger interface.
- [`@arcjet/protocol`](./protocol/README.md): JS interface into the protocol.
- [`@arcjet/redact`](./redact/README.md): Redact & unredact sensitive info from
  strings.
- [`@arcjet/runtime`](./runtime/README.md): Runtime detection.
- [`@arcjet/sprintf`](./sprintf/README.md): Platform-independent replacement
  for `util.format`.
- [`@arcjet/stable-hash`](./stable-hash/README.md): Stable hashing.
- [`@arcjet/transport`](./transport/README.md): Transport mechanisms for the
  Arcjet protocol.
- [`arcjet`](./arcjet/README.md): JS SDK core.

### Internal development

- [`@arcjet/eslint-config`](./eslint-config/README.md): Custom eslint config for
  our projects.
- [`@arcjet/rollup-config`](./rollup-config/README.md): Custom rollup config for
  our projects.

## Support

This repository follows the [Arcjet Support Policy][arcjet-support].

## Security

This repository follows the [Arcjet Security Policy][arcjet-security].

## Development

This is a monorepo managed with [npm workspaces][npm-workspaces] and
[Turborepo][turborepo]. Each package lives in its own directory at the repo
root (e.g. `arcjet-next/`, `analyze/`).

If you want to use Arcjet then you should install a specific package for your
runtime (e.g. `@arcjet/next` for Next.js). If you want to contribute to the
development of the SDKs see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Compatibility

Packages maintained in this repository are compatible with LTS
versions of Node.js and the current minor release of TypeScript.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet-example]: https://example.arcjet.com
[arcjet]: https://arcjet.com
[github-arcjet-example-astro]: https://github.com/arcjet/example-astro
[github-arcjet-example-deno]: https://github.com/arcjet/example-deno
[github-arcjet-example-express]: https://github.com/arcjet/example-expressjs
[github-arcjet-example-fastapi]: https://github.com/arcjet/example-fastapi
[github-arcjet-example-fastify]: https://github.com/arcjet/example-fastify
[github-arcjet-example-nestjs]: https://github.com/arcjet/example-nestjs
[github-arcjet-example-nextjs]: https://github.com/arcjet/example-nextjs
[github-arcjet-example-nuxt]: https://github.com/arcjet/example-nuxt
[github-arcjet-example-react-router]: https://github.com/arcjet/example-react-router
[github-arcjet-example-remix]: https://github.com/arcjet/example-remix
[github-arcjet-example-sveltekit]: https://github.com/arcjet/example-sveltekit
[github-arcjet-example-tanstack-start]: https://github.com/arcjet/example-tanstack-start
[discord-invite]: https://arcjet.com/discord
[support]: https://docs.arcjet.com/support
[arcjet-docs]: https://docs.arcjet.com/
[arcjet-support]: https://docs.arcjet.com/support
[arcjet-security]: https://docs.arcjet.com/security
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[nosecone-docs]: https://docs.arcjet.com/nosecone/quick-start
[vercel-ai-sdk]: https://sdk.vercel.ai/
[blueprint-ai-quota-control]: https://docs.arcjet.com/blueprints/ai-quota-control
[blueprint-cookie-banner]: https://docs.arcjet.com/blueprints/cookie-banner
[blueprint-custom-rule]: https://docs.arcjet.com/blueprints/defining-custom-rules
[blueprint-ip-geolocation]: https://docs.arcjet.com/blueprints/ip-geolocation
[blueprint-feedback-form]: https://docs.arcjet.com/blueprints/feedback-form
[blueprint-malicious-traffic]: https://docs.arcjet.com/blueprints/malicious-traffic
[blueprint-payment-form]: https://docs.arcjet.com/blueprints/payment-form
[blueprint-sampling-traffic]: https://docs.arcjet.com/blueprints/sampling
[blueprint-vpn-proxy]: https://docs.arcjet.com/blueprints/vpn-proxy-detection
[feature-bot-protection]: https://docs.arcjet.com/bot-protection
[feature-filters]: https://docs.arcjet.com/filters
[feature-signup-protection]: https://docs.arcjet.com/signup-protection
[bot-list]: https://arcjet.com/bot-list
[best-practices]: https://docs.arcjet.com/best-practices
[npm-workspaces]: https://docs.npmjs.com/cli/using-npm/workspaces
[turborepo]: https://turbo.build/repo
