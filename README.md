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

## Features

Arcjet security features for protecting JS apps:

- 🔒 [Prompt injection detection][feature-prompt-injection]
  — detect and block prompt injection attacks on your AI application, preventing
  users from hijacking your AI model's instructions.
- 🤖 [Bot protection][feature-bot-protection]
  — detect bots, block bad bots, verify legitimate bots, and reduce unwanted
  automated requests before they reach your application.
- 🛑 [Rate limiting][feature-rate-limiting]
  — control how many requests a client can make to your application or API over
  a given period of time. Use token bucket limits to enforce per-user AI token
  budgets.
- 🛡️ [Shield WAF][feature-shield]
  — protects your application against common web attacks, including the OWASP
  Top 10, by analyzing requests over time and blocking clients that show
  suspicious behavior.
- 📧 [Email validation][feature-email-validation]
  — validate and verify email addresses in your application to reduce spam and
  fraudulent signups.
- 📝 [Signup form protection][feature-signup-protection]
  — combines bot protection, email validation, and rate limiting to protect
  your signup and lead capture forms from spam, fake accounts, and signup
  fraud.
- 🕵️‍♂️ [Sensitive information][feature-sensitive-info]
  — detect and block sensitive data in request bodies before it enters your
  application. Use it to prevent clients from sending personally identifiable
  information (PII) and other data you do not want to handle.
- 🎯 [Filters][feature-filters]
  — define custom security and traffic rules inside your application code. Use
  filters to block unwanted traffic based on request fields, IP reputation,
  geography, VPN or proxy usage, and other signals.

## Quick start

- [Astro][quick-start-astro]
- [Bun + Hono][quick-start-bun-hono]
- [Bun][quick-start-bun]
- [Deno][quick-start-deno]
- [Fastify][quick-start-fastify]
- [NestJS][quick-start-nest-js]
- [Next.js][quick-start-next-js]
- [Node.js + Express][quick-start-node-js-express]
- [Node.js + Hono][quick-start-node-js-hono]
- [Node.js][quick-start-node-js]
- [Nuxt][quick-start-nuxt]
- [React Router][quick-start-react-router]
- [Remix][quick-start-remix]
- [SvelteKit][quick-start-sveltekit]

### Get help

[Join our Discord server][discord-invite] or [reach out for support][support].

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

### Next.js AI protection example

This example protects a Next.js AI chat route using the [Vercel AI
SDK][vercel-ai-sdk]: blocking automated clients that inflate costs, enforcing
per-user token budgets, detecting sensitive information in messages, and
blocking prompt injection attacks before they reach the model.

> Examples use `@arcjet/next`. Replace with `@arcjet/node`, `@arcjet/bun`, or
> any other [SDK](#sdks) for your runtime.

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
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
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

> Examples use `@arcjet/next`. Replace with `@arcjet/node`, `@arcjet/bun`, or
> any other [SDK](#sdks) for your runtime.

```ts
import arcjet, { detectPromptInjection } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    detectPromptInjection({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      threshold: 0.5, // Score above which requests are blocked (default: 0.5)
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

  // Arcjet Pro plan verifies the authenticity of common bots using IP data.
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

Arcjet supports multiple rate limiting algorithms. Token buckets are ideal for
controlling AI token budgets.

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

Detect and block PII in request content such as email addresses, phone
numbers, and credit card numbers. Pass the content to scan via
`sensitiveInfoValue` on each `protect()` call.

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

### Request filters

Filter requests using expression-based rules against request properties (IP,
headers, path, method, etc.).

```ts
import arcjet, { filterRequest } from "@arcjet/next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    filterRequest({
      mode: "LIVE",
      deny: ['ip.src == "1.2.3.4"', 'http.request.uri.path contains "/admin"'],
    }),
  ],
});
```

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

## Compatibility

Packages maintained in this repository are compatible with maintained
versions of Node.js and the current minor release of TypeScript.

The current release line,
`@arcjet/*` on `1.0.0-beta.*`,
is compatible with Node.js 20.

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
[feature-email-validation]: https://docs.arcjet.com/email-validation
[feature-filters]: https://docs.arcjet.com/filters
[feature-rate-limiting]: https://docs.arcjet.com/rate-limiting
[feature-sensitive-info]: https://docs.arcjet.com/sensitive-info
[feature-shield]: https://docs.arcjet.com/shield
[feature-signup-protection]: https://docs.arcjet.com/signup-protection
[feature-prompt-injection]: https://docs.arcjet.com/detect-prompt-injection
[bot-list]: https://arcjet.com/bot-list
[best-practices]: https://docs.arcjet.com/best-practices
[quick-start-astro]: https://docs.arcjet.com/get-started?f=astro
[quick-start-bun-hono]: https://docs.arcjet.com/get-started?f=bun-hono
[quick-start-bun]: https://docs.arcjet.com/get-started?f=bun
[quick-start-deno]: https://docs.arcjet.com/get-started?f=deno
[quick-start-fastify]: https://docs.arcjet.com/get-started?f=fastify
[quick-start-nest-js]: https://docs.arcjet.com/get-started?f=nest-js
[quick-start-next-js]: https://docs.arcjet.com/get-started?f=next-js
[quick-start-node-js-express]: https://docs.arcjet.com/get-started?f=node-js-express
[quick-start-node-js-hono]: https://docs.arcjet.com/get-started?f=node-js-hono
[quick-start-node-js]: https://docs.arcjet.com/get-started?f=node-js
[quick-start-nuxt]: https://docs.arcjet.com/get-started?f=nuxt
[quick-start-react-router]: https://docs.arcjet.com/get-started?f=react-router
[quick-start-remix]: https://docs.arcjet.com/get-started?f=remix
[quick-start-sveltekit]: https://docs.arcjet.com/get-started?f=sveltekit
