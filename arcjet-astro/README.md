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

[Arcjet][arcjet] is the runtime security platform that ships with your AI code. Stop bots and automated attacks from burning your AI budget, leaking data, or misusing tools with Arcjet's AI security building blocks. Every feature works with any Astro application.

This is the [Arcjet][arcjet] SDK for [Astro][astro].

## Getting started

1. Get your API key at [`app.arcjet.com`](https://app.arcjet.com)
2. `npm install @arcjet/astro`
3. Set `ARCJET_KEY=ajkey_yourkey` in your environment
4. Add Arcjet to your app — see the [quick start](#quick-start) below

> **💡 Tip:** Use the [Arcjet CLI][arcjet-cli] (`npx @arcjet/cli`) for guided
> project setup, managing sites, and inspecting traffic from the terminal.

[npm package](https://www.npmjs.com/package/@arcjet/astro) |
[GitHub source](https://github.com/arcjet/arcjet-js/tree/main/arcjet-astro) |
[Full docs][arcjet-reference-astro] |
[Other SDKs on GitHub](https://github.com/arcjet)

## Features

- 🔒 [Prompt Injection Detection](#prompt-injection-detection) — detect and block
  prompt injection attacks before they reach your LLM.
- 🤖 [Bot Protection](#bot-protection) — stop scrapers, credential stuffers,
  and AI crawlers from abusing your endpoints.
- 🛑 [Rate Limiting](#rate-limiting) — token bucket, fixed window, and sliding
  window algorithms; model AI token budgets per user.
- 🕵️ [Sensitive Information Detection](#sensitive-information-detection) — block
  PII, credit cards, and custom patterns from entering your AI pipeline.
- 🛡️ [Shield WAF](#shield-waf) — protect against SQL injection, XSS, and other
  common web attacks.
- 📧 [Email Validation](#email-validation) — block disposable, invalid, and
  undeliverable addresses at signup.
- 📝 [Signup Form Protection][signup-protection-docs] — combines bot protection,
  email validation, and rate limiting to protect your signup forms.
- 🎯 [Request Filters](#request-filters) — expression-based rules on IP, path,
  headers, and custom fields.
- 🌐 [IP Analysis](#ip-analysis) — geolocation, ASN, VPN, proxy, Tor, and hosting
  detection included with every request.

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

Available categories: `CATEGORY:ACADEMIC`, `CATEGORY:ADVERTISING`,
`CATEGORY:AI`, `CATEGORY:AMAZON`, `CATEGORY:APPLE`, `CATEGORY:ARCHIVE`,
`CATEGORY:BOTNET`, `CATEGORY:FEEDFETCHER`, `CATEGORY:GOOGLE`,
`CATEGORY:META`, `CATEGORY:MICROSOFT`, `CATEGORY:MONITOR`,
`CATEGORY:OPTIMIZER`, `CATEGORY:PREVIEW`, `CATEGORY:PROGRAMMATIC`,
`CATEGORY:SEARCH_ENGINE`, `CATEGORY:SLACK`, `CATEGORY:SOCIAL`,
`CATEGORY:TOOL`, `CATEGORY:UNKNOWN`, `CATEGORY:VERCEL`,
`CATEGORY:WEBHOOK`, `CATEGORY:YAHOO`. You can also allow or deny
[specific bots by name][bot-list].

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

Arcjet supports token bucket, fixed window, and sliding window algorithms.
Token buckets are ideal for controlling AI token budgets — set `capacity` to
the max tokens a user can spend, `refillRate` to how many tokens are restored
per `interval`, and deduct tokens per request via `requested` in `protect()`.
The `interval` accepts strings (`"1s"`, `"1m"`, `"1h"`, `"1d"`) or seconds as
a number. Use `characteristics` to track limits per user instead of per IP.

```js
import arcjet, { tokenBucket } from "@arcjet/astro";

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

Detect and block PII in request content. Pass the content to scan via
`sensitiveInfoValue` on each `protect()` call. Built-in entity types:
`CREDIT_CARD_NUMBER`, `EMAIL`, `PHONE_NUMBER`, `IP_ADDRESS`. You can also
provide a custom `detect` callback for additional patterns.

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

## Shield WAF

Protect your application against common web attacks, including the OWASP
Top 10.

```js
import arcjet, { shield } from "@arcjet/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    arcjet({
      rules: [
        shield({
          mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
        }),
      ],
    }),
  ],
});
```

## Email validation

Validate and verify email addresses. Deny types: `DISPOSABLE`, `FREE`,
`NO_MX_RECORDS`, `NO_GRAVATAR`, `INVALID`.

```js
import arcjet, { validateEmail } from "@arcjet/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [
    arcjet({
      rules: [
        validateEmail({
          mode: "LIVE",
          deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
        }),
      ],
    }),
  ],
});
```

```ts
// In your API route:
const decision = await aj.protect(request, {
  email: "user@example.com",
});

if (decision.isDenied() && decision.reason.isEmail()) {
  return Response.json({ error: "Invalid email address" }, { status: 400 });
}
```

## Request filters

Filter requests using expression-based rules against request properties (IP,
headers, path, method, etc.).

```js
import arcjet, { filter } from "@arcjet/astro";

// In astro.config.mjs:
arcjet({
  rules: [
    filter({
      mode: "LIVE",
      deny: ['ip.src == "1.2.3.4"'],
    }),
  ],
});
```

### Block by country

Restrict access to specific countries — useful for licensing, compliance, or
regional rollouts. The `allow` list denies all countries not listed:

```js
filter({
  mode: "LIVE",
  // Allow only US traffic — all other countries are denied
  allow: ['ip.src.country == "US"'],
});
```

### Block VPN and proxy traffic

Prevent anonymized traffic from accessing sensitive endpoints — useful for
fraud prevention, enforcing geo-restrictions, and reducing abuse:

```js
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
  return Response.json({ error: "VPN traffic not allowed" }, { status: 403 });
}
```

See the [Request Filters docs][filters-docs],
[IP Geolocation blueprint](https://docs.arcjet.com/blueprints/ip-geolocation), and
[VPN/Proxy Detection blueprint](https://docs.arcjet.com/blueprints/vpn-proxy-detection)
for more details.

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
[arcjet-cli]: https://github.com/arcjet/cli
[arcjet-reference-astro]: https://docs.arcjet.com/reference/astro
[astro]: https://astro.build/
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[bot-categories-docs]: https://docs.arcjet.com/bot-protection/identifying-bots
[bot-list]: https://arcjet.com/bot-list
[signup-protection-docs]: https://docs.arcjet.com/signup-protection
[filters-docs]: https://docs.arcjet.com/filters
[best-practices]: https://docs.arcjet.com/best-practices
