<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/astro`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/astro">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fastro?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fastro?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] is the runtime security platform that ships with your AI code.
Stop bots and automated attacks from burning your AI budget, leaking data, or
misusing tools with Arcjet's AI security building blocks.

This is the [Arcjet][arcjet] SDK for [Astro][astro].

- [npm package (`@arcjet/astro`)](https://www.npmjs.com/package/@arcjet/astro)
- [GitHub source code (`arcjet-astro/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-astro)

## Features

- 🔒 [Prompt injection detection][prompt-injection-docs] — detect and block
  prompt injection attacks before they reach your AI model.
- 🤖 [Bot protection][bot-protection-docs] — manage traffic from automated
  clients and bots, with [verification and
  categorization][bot-categories-docs].
- 🛑 [Rate limiting][rate-limiting-docs] — limit the number of requests a
  client can make. Use token bucket limits to enforce per-user AI token budgets.
- 🛡️ [Shield WAF][shield-docs] — protect your application against common
  attacks, including the OWASP Top 10.
- 📧 [Email validation][email-validation-docs] — prevent users from signing up
  with fake or disposable email addresses.
- 📝 [Signup form protection][signup-protection-docs] — combines rate limiting,
  bot protection, and email validation to protect your signup forms.
- 🕵️‍♂️ [Sensitive information detection][sensitive-info-docs] — detect and block
  PII (emails, phone numbers, credit cards) in request content.
- 🎯 [Request filters][filters-docs] — filter requests using expression-based
  rules against request properties.

## Getting started

Visit the [quick start guide][quick-start] to get started.

## What is this?

This is our adapter to integrate Arcjet into Astro.
Arcjet helps you secure your Astro website.
This package exists so that we can provide the best possible experience to
Astro users.

## When should I use this?

Use this if you are using Astro.
See our [_Get started_ guide][arcjet-get-started] for other supported
frameworks and runtimes.

## Install

This package is ESM only.
Install with npm and the Astro CLI:

```sh
npx astro add @arcjet/astro
```

## Quick start

This example protects an Astro API route with bot detection, Shield WAF,
and token bucket rate limiting.

First, configure Arcjet in `astro.config.mjs`:

```js
// astro.config.mjs
import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  env: { validateSecrets: true },
  integrations: [
    arcjet({
      rules: [
        // Shield protects your app from common attacks e.g. SQL injection
        shield({ mode: "LIVE" }),
        // Create a bot detection rule
        detectBot({
          mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
          // Block all bots except the following
          allow: [
            "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
            // Uncomment to allow these other common bot categories
            // See the full list at https://arcjet.com/bot-list
            //"CATEGORY:MONITOR", // Uptime monitoring services
            //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
          ],
        }),
        // Token bucket rate limit. Other algorithms are supported.
        tokenBucket({
          mode: "LIVE",
          refillRate: 5, // Refill 5 tokens per interval
          interval: 10, // Refill every 10 seconds
          capacity: 10, // Bucket capacity of 10 tokens
        }),
      ],
    }),
  ],
});
```

Then use it in an API route (e.g. `src/pages/api/hello.ts`):

```ts
// src/pages/api/hello.ts
import { isSpoofedBot } from "@arcjet/inspect";
import type { APIRoute } from "astro";
import aj from "arcjet:client";

export const GET: APIRoute = async ({ request }) => {
  const decision = await aj.protect(request, { requested: 5 }); // Deduct 5 tokens
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return Response.json({ error: "Too many requests" }, { status: 429 });
    } else if (decision.reason.isBot()) {
      return Response.json({ error: "No bots allowed" }, { status: 403 });
    } else {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Requests from hosting IPs are likely from bots.
  // https://docs.arcjet.com/blueprints/vpn-proxy-detection
  if (decision.ip.isHosting()) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verifies the authenticity of common bots using IP data.
  // Verification isn't always possible, so check the results separately.
  // https://docs.arcjet.com/bot-protection/reference#bot-verification
  if (decision.results.some(isSpoofedBot)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ message: "Hello world" });
};
```

For the full reference, see the [Arcjet Astro SDK docs][arcjet-reference-astro].

## Prompt injection detection

Detect and block prompt injection attacks — attempts to override your AI
model's instructions — before they reach your model. Pass the user's message
via `detectPromptInjectionMessage` on each `protect()` call.

Configure in `astro.config.mjs`:

```js
import arcjet, { detectPromptInjection } from "@arcjet/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    arcjet({
      rules: [
        detectPromptInjection({
          mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
          threshold: 0.5, // Score above which requests are blocked (default: 0.5)
        }),
      ],
    }),
  ],
});
```

Then in an API route:

```ts
import type { APIRoute } from "astro";
import aj from "arcjet:client";

export const POST: APIRoute = async ({ request }) => {
  const { message } = await request.json();

  const decision = await aj.protect(request, {
    detectPromptInjectionMessage: message,
  });

  if (decision.isDenied() && decision.reason.isPromptInjection()) {
    return Response.json(
      { error: "Prompt injection detected — please rephrase your message" },
      { status: 400 },
    );
  }

  // Forward to your AI model...
};
```

## Bot protection

Arcjet allows you to configure a list of bots to allow or deny. Specifying
`allow` means all other bots are denied. An empty allow list blocks all bots.

```js
import arcjet, { detectBot } from "@arcjet/astro";

// In astro.config.mjs:
arcjet({
  rules: [
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE",
        // See the full list at https://arcjet.com/bot-list
      ],
    }),
  ],
});
```

```ts
// In your API route:
import { isSpoofedBot } from "@arcjet/inspect";
import aj from "arcjet:client";

const decision = await aj.protect(request);

if (decision.isDenied() && decision.reason.isBot()) {
  return Response.json({ error: "No bots allowed" }, { status: 403 });
}

// Verifies the authenticity of common bots using IP data.
if (decision.results.some(isSpoofedBot)) {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
```

### Bot categories

Bots can be configured by [category][bot-categories-docs] and/or by [specific
bot name][bot-list]. For example, to allow search engines and the OpenAI
crawler, but deny all other bots:

```js
detectBot({
  mode: "LIVE",
  allow: ["CATEGORY:SEARCH_ENGINE", "OPENAI_CRAWLER_SEARCH"],
});
```

### Verified vs spoofed bots

Bots claiming to be well-known crawlers (e.g. Googlebot) are verified by
checking their IP address against known IP ranges. If a bot fails verification,
it is labeled as spoofed. Use `isSpoofedBot` from `@arcjet/inspect` to check:

```ts
import { isSpoofedBot } from "@arcjet/inspect";

if (decision.results.some(isSpoofedBot)) {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}
```

## Rate limiting

Arcjet supports multiple rate limiting algorithms. Token buckets are ideal for
controlling AI token budgets.

```js
import arcjet, { tokenBucket, slidingWindow, fixedWindow } from "@arcjet/astro";

// In astro.config.mjs:
arcjet({
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
```

```ts
// In your API route:
const decision = await aj.protect(request, {
  userId: "user-123",
  requested: estimate, // Number of tokens to deduct
});

if (decision.isDenied() && decision.reason.isRateLimit()) {
  return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
}
```

## Sensitive information detection

Detect and block PII in request content such as email addresses, phone
numbers, and credit card numbers. Pass the content to scan via
`sensitiveInfoValue` on each `protect()` call.

```js
import arcjet, { sensitiveInfo } from "@arcjet/astro";

// In astro.config.mjs:
arcjet({
  rules: [
    sensitiveInfo({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      deny: ["CREDIT_CARD_NUMBER", "EMAIL", "PHONE_NUMBER"],
    }),
  ],
});
```

```ts
// In your API route:
const decision = await aj.protect(request, {
  sensitiveInfoValue: userMessage, // The text content to scan
});

if (decision.isDenied() && decision.reason.isSensitiveInfo()) {
  return Response.json(
    { error: "Sensitive information detected" },
    { status: 400 },
  );
}
```

## Request filters

Filter requests using expression-based rules against request properties (IP,
headers, path, method, etc.).

```js
import arcjet, { filterRequest } from "@arcjet/astro";

// In astro.config.mjs:
arcjet({
  rules: [
    filterRequest({
      mode: "LIVE",
      deny: ['ip.src == "1.2.3.4"'],
    }),
  ],
});
```

## IP analysis

Arcjet enriches every request with IP metadata. Use these helpers to make
policy decisions based on network signals:

```ts
const decision = await aj.protect(request);

if (decision.ip.isHosting()) {
  // Requests from cloud/hosting providers are often automated.
  // https://docs.arcjet.com/blueprints/vpn-proxy-detection
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

if (decision.ip.isVpn() || decision.ip.isProxy() || decision.ip.isTor()) {
  // Handle VPN/proxy traffic according to your policy
}

// Access geolocation and network details
console.log(decision.ip.country, decision.ip.city, decision.ip.asn);
```

## Custom characteristics

Track and limit requests by any stable identifier — user ID, API key, session,
etc. — rather than IP address alone.

```js
// In astro.config.mjs:
arcjet({
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
```

```ts
// Pass the characteristic value at request time
const decision = await aj.protect(request, {
  userId: "user-123", // Replace with your actual user ID
  requested: estimate,
});
```

## Best practices

See the [Arcjet best practices][best-practices] for detailed guidance. Key
recommendations:

**Use `withRule()` for route-specific rules** on top of the base rules
configured in `astro.config.mjs`. The SDK caches decisions and configuration,
so this is more efficient than creating a new instance per request.

```ts
// src/pages/api/chat.ts — extend with withRule()
import { detectBot, tokenBucket } from "@arcjet/astro";
import { isSpoofedBot } from "@arcjet/inspect";
import type { APIRoute } from "astro";
import aj from "arcjet:client";

const routeAj = aj.withRule(detectBot({ mode: "LIVE", allow: [] })).withRule(
  tokenBucket({
    mode: "LIVE",
    refillRate: 2_000,
    interval: "1h",
    capacity: 5_000,
  }),
);

export const POST: APIRoute = async ({ request }) => {
  const decision = await routeAj.protect(request, { requested: 500 });
  // ...
};
```

**Other recommendations:**

- **Start rules in `DRY_RUN` mode** to observe behavior before switching to
  `LIVE`. This lets you tune thresholds without affecting real traffic.
- **Configure proxies** if your app runs behind a load balancer or reverse proxy
  so Arcjet resolves the real client IP:
  ```js
  arcjet({ rules: [], proxies: ["100.100.100.100"] });
  ```
- **Handle errors explicitly.** `protect()` never throws — on error it returns
  an `ERROR` result. Fail open by logging and allowing the request:
  ```ts
  if (decision.isErrored()) {
    console.error("Arcjet error", decision.reason.message);
    // allow the request to proceed
  }
  ```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[arcjet-reference-astro]: https://docs.arcjet.com/reference/astro
[astro]: https://astro.build/
[quick-start]: https://docs.arcjet.com/get-started/astro
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[bot-protection-docs]: https://docs.arcjet.com/bot-protection
[bot-categories-docs]: https://docs.arcjet.com/bot-protection/identifying-bots
[bot-list]: https://arcjet.com/bot-list
[rate-limiting-docs]: https://docs.arcjet.com/rate-limiting
[shield-docs]: https://docs.arcjet.com/shield
[email-validation-docs]: https://docs.arcjet.com/email-validation
[signup-protection-docs]: https://docs.arcjet.com/signup-protection
[sensitive-info-docs]: https://docs.arcjet.com/sensitive-info
[filters-docs]: https://docs.arcjet.com/filters
[prompt-injection-docs]: https://docs.arcjet.com/detect-prompt-injection
[best-practices]: https://docs.arcjet.com/best-practices
