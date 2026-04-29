<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/sveltekit`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/sveltekit">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fsveltekit?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fsveltekit?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] is the runtime security platform that ships with your AI code. Stop bots and automated attacks from burning your AI budget, leaking data, or misusing tools with Arcjet's AI security building blocks. Every feature works with any SvelteKit application.

This is the [Arcjet][arcjet] SDK for [SvelteKit][sveltekit] **request protection** —
use it to protect HTTP route handlers and API endpoints. If you need to protect
AI agent tool calls, MCP server handlers, or background jobs (anything without
an HTTP request), see [`@arcjet/guard`](https://github.com/arcjet/arcjet-js/tree/main/arcjet-guard).

## Getting started

### Quick setup with an AI agent

1. Log in with the CLI:
   ```sh
   npx @arcjet/cli auth login
   ```
2. Install the request protection skill to give your coding agent the docs it needs:
   ```sh
   npx skills add arcjet/skills --skill add-request-protection
   ```
3. Tell your agent what to protect — it handles the rest.

### Manual setup

1. **Log in** with the CLI (or at [`app.arcjet.com`](https://app.arcjet.com?utm_campaign=arcjet-js)):
   ```sh
   npx @arcjet/cli auth login
   ```
2. `npm install @arcjet/sveltekit`
3. Set `ARCJET_KEY=ajkey_yourkey` in your environment
4. Add Arcjet to your app — see the [quick start](#quick-start) below

[npm package](https://www.npmjs.com/package/@arcjet/sveltekit) |
[GitHub source](https://github.com/arcjet/arcjet-js/tree/main/arcjet-sveltekit) |
[Full docs][arcjet-reference-sveltekit] |
[Other SDKs on GitHub](https://github.com/arcjet)

## Features

All features below are available with `@arcjet/sveltekit` for request protection.
For guard protection (tool calls, MCP servers, queues) see
[`@arcjet/guard`](https://github.com/arcjet/arcjet-js/tree/main/arcjet-guard).

| Feature                         | `@arcjet/sveltekit` | `@arcjet/guard` |
| ------------------------------- | :-----------------: | :-------------: |
| Rate Limiting                   |         ✅          |       ✅        |
| Prompt Injection Detection      |         ✅          |       ✅        |
| Sensitive Information Detection |         ✅          |       ✅        |
| Bot Protection                  |         ✅          |        —        |
| Shield WAF                      |         ✅          |        —        |
| Email Validation                |         ✅          |        —        |
| Signup Form Protection          |         ✅          |        —        |
| Request Filters                 |         ✅          |        —        |
| IP Analysis                     |         ✅          |        —        |
| Custom Rules                    |          —          |       ✅        |

- 🔒 [Prompt Injection Detection][prompt-injection-docs] — detect and block
  prompt injection attacks before they reach your LLM.
- 🤖 [Bot Protection][bot-protection-docs] — stop scrapers, credential stuffers,
  and AI crawlers from abusing your endpoints.
- 🛑 [Rate Limiting][rate-limiting-docs] — token bucket, fixed window, and sliding
  window algorithms; model AI token budgets per user.
- 🕵️ [Sensitive Information Detection][sensitive-info-docs] — block
  PII, credit cards, and custom patterns from entering your AI pipeline.
- 🛡️ [Shield WAF][shield-docs] — protect against SQL injection, XSS, and other
  common web attacks.
- 📧 [Email Validation][email-validation-docs] — block disposable, invalid, and
  undeliverable addresses at signup.
- 📝 [Signup Form Protection][signup-protection-docs] — combines bot protection,
  email validation, and rate limiting to protect your signup forms.
- 🎯 [Request Filters][filters-docs] — expression-based rules on IP, path,
  headers, and custom fields.
- 🌐 [IP Analysis](#ip-analysis) — geolocation, ASN, VPN, proxy, Tor, and hosting
  detection included with every request.

## Quick start

This example protects a SvelteKit application with bot detection, Shield WAF,
and token bucket rate limiting. Arcjet is typically configured in
`src/hooks.server.ts` to run on every request.

```ts
// src/hooks.server.ts
import { env } from "$env/dynamic/private";
import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/sveltekit";
import { isSpoofedBot } from "@arcjet/inspect";
import { error, type RequestEvent } from "@sveltejs/kit";

const aj = arcjet({
  key: env.ARCJET_KEY, // Get your key with: npx @arcjet/cli sites get-key
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
});

export async function handle({
  event,
  resolve,
}: {
  event: RequestEvent;
  resolve(event: RequestEvent): Response | Promise<Response>;
}): Promise<Response> {
  const decision = await aj.protect(event, { requested: 5 }); // Deduct 5 tokens
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return error(429, "Too many requests");
    } else if (decision.reason.isBot()) {
      return error(403, "No bots allowed");
    } else {
      return error(403, "Forbidden");
    }
  }

  // Requests from hosting IPs are likely from bots.
  // https://docs.arcjet.com/blueprints/vpn-proxy-detection
  if (decision.ip.isHosting()) {
    return error(403, "Forbidden");
  }

  // Verifies the authenticity of common bots using IP data.
  // Verification isn't always possible, so check the results separately.
  // https://docs.arcjet.com/bot-protection/reference#bot-verification
  if (decision.results.some(isSpoofedBot)) {
    return error(403, "Forbidden");
  }

  return resolve(event);
}
```

For the full reference, see the [Arcjet SvelteKit SDK docs][arcjet-reference-sveltekit].

## Prompt injection detection

Detect and block prompt injection attacks — attempts to override your AI
model's instructions — before they reach your model. Pass the user's message
via `detectPromptInjectionMessage` on each `protect()` call.

```ts
// src/routes/chat/+server.ts
import { env } from "$env/dynamic/private";
import arcjet, { detectPromptInjection } from "@arcjet/sveltekit";
import { error, json, type RequestEvent } from "@sveltejs/kit";

const aj = arcjet({
  key: env.ARCJET_KEY,
  rules: [
    detectPromptInjection({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
    }),
  ],
});

export async function POST(event: RequestEvent) {
  const { message } = await event.request.json();

  const decision = await aj.protect(event, {
    detectPromptInjectionMessage: message,
  });

  if (decision.isDenied() && decision.reason.isPromptInjection()) {
    return error(
      400,
      "Prompt injection detected — please rephrase your message",
    );
  }

  // Forward to your AI model...
}
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

```ts
import arcjet, { detectBot } from "@arcjet/sveltekit";
import { isSpoofedBot } from "@arcjet/inspect";

const aj = arcjet({
  key: env.ARCJET_KEY,
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

// In your handle or server route:
const decision = await aj.protect(event);

if (decision.isDenied() && decision.reason.isBot()) {
  return error(403, "No bots allowed");
}

// Verifies the authenticity of common bots using IP data.
if (decision.results.some(isSpoofedBot)) {
  return error(403, "Forbidden");
}
```

### Bot categories

Bots can be configured by [category][bot-categories-docs] and/or by [specific
bot name][bot-list]. For example, to allow search engines and the OpenAI
crawler, but deny all other bots:

```ts
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
  return error(403, "Forbidden");
}
```

## Rate limiting

Arcjet supports token bucket, fixed window, and sliding window algorithms.
Token buckets are ideal for controlling AI token budgets — set `capacity` to
the max tokens a user can spend, `refillRate` to how many tokens are restored
per `interval`, and deduct tokens per request via `requested` in `protect()`.
The `interval` accepts strings (`"1s"`, `"1m"`, `"1h"`, `"1d"`) or seconds as
a number. Use `characteristics` to track limits per user instead of per IP.

```ts
import arcjet, {
  tokenBucket,
  slidingWindow,
  fixedWindow,
} from "@arcjet/sveltekit";

const aj = arcjet({
  key: env.ARCJET_KEY,
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

const decision = await aj.protect(event, {
  userId: "user-123",
  requested: estimate, // Number of tokens to deduct
});

if (decision.isDenied() && decision.reason.isRateLimit()) {
  return error(429, "Rate limit exceeded");
}
```

## Sensitive information detection

Detect and block PII in request content. Pass the content to scan via
`sensitiveInfoValue` on each `protect()` call. Built-in entity types:
`CREDIT_CARD_NUMBER`, `EMAIL`, `PHONE_NUMBER`, `IP_ADDRESS`. You can also
provide a custom `detect` callback for additional patterns.

```ts
import arcjet, { sensitiveInfo } from "@arcjet/sveltekit";

const aj = arcjet({
  key: env.ARCJET_KEY,
  rules: [
    sensitiveInfo({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      deny: ["CREDIT_CARD_NUMBER", "EMAIL", "PHONE_NUMBER"],
    }),
  ],
});

const decision = await aj.protect(event, {
  sensitiveInfoValue: userMessage, // The text content to scan
});

if (decision.isDenied() && decision.reason.isSensitiveInfo()) {
  return error(400, "Sensitive information detected");
}
```

## Shield WAF

Protect your application against common web attacks, including the OWASP
Top 10.

```ts
import arcjet, { shield } from "@arcjet/sveltekit";

const aj = arcjet({
  key: env.ARCJET_KEY,
  rules: [
    shield({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
    }),
  ],
});
```

## Email validation

Validate and verify email addresses. Deny types: `DISPOSABLE`, `FREE`,
`NO_MX_RECORDS`, `NO_GRAVATAR`, `INVALID`.

```ts
import arcjet, { validateEmail } from "@arcjet/sveltekit";

const aj = arcjet({
  key: env.ARCJET_KEY,
  rules: [
    validateEmail({
      mode: "LIVE",
      deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
    }),
  ],
});

const decision = await aj.protect(event, {
  email: "user@example.com",
});

if (decision.isDenied() && decision.reason.isEmail()) {
  return error(400, "Invalid email address");
}
```

## Request filters

Filter requests using expression-based rules against request properties (IP,
headers, path, method, etc.).

```ts
import arcjet, { filter } from "@arcjet/sveltekit";

const aj = arcjet({
  key: env.ARCJET_KEY,
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

```ts
filter({
  mode: "LIVE",
  // Allow only US traffic — all other countries are denied
  allow: ['ip.src.country == "US"'],
});
```

### Block VPN and proxy traffic

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
const decision = await aj.protect(event);

if (decision.ip.isVpn() || decision.ip.isTor()) {
  return error(403, "VPN traffic not allowed");
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
const decision = await aj.protect(event);

if (decision.ip.isHosting()) {
  // Requests from cloud/hosting providers are often automated.
  // https://docs.arcjet.com/blueprints/vpn-proxy-detection
  return error(403, "Forbidden");
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

```ts
const aj = arcjet({
  key: env.ARCJET_KEY,
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
const decision = await aj.protect(event, {
  userId: "user-123", // Replace with your actual user ID
  requested: estimate,
});
```

## Best practices

See the [Arcjet best practices][best-practices] for detailed guidance. Key
recommendations:

**Create a single client instance** and reuse it with `withRule()` for
route-specific rules. The SDK caches decisions and configuration, so creating a
new instance per request wastes that work.

```ts
// src/lib/server/arcjet.ts — create once, import everywhere
import { env } from "$env/dynamic/private";
import arcjet, { shield } from "@arcjet/sveltekit";

export default arcjet({
  key: env.ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }), // base rules applied to every request
  ],
});
```

```ts
// src/routes/chat/+server.ts — extend per-route with withRule()
import aj from "$lib/server/arcjet.js";
import { detectBot, tokenBucket } from "@arcjet/sveltekit";
import type { RequestEvent } from "@sveltejs/kit";

const routeAj = aj.withRule(detectBot({ mode: "LIVE", allow: [] })).withRule(
  tokenBucket({
    mode: "LIVE",
    refillRate: 2_000,
    interval: "1h",
    capacity: 5_000,
  }),
);

export async function POST(event: RequestEvent) {
  const decision = await routeAj.protect(event, { requested: 500 });
  // ...
}
```

**Other recommendations:**

- **Start rules in `DRY_RUN` mode** to observe behavior before switching to
  `LIVE`. This lets you tune thresholds without affecting real traffic.
- **Configure proxies** if your app runs behind a load balancer or reverse proxy
  so Arcjet resolves the real client IP:
  ```ts
  arcjet({ key: env.ARCJET_KEY, rules: [], proxies: ["100.100.100.100"] });
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
[arcjet-reference-sveltekit]: https://docs.arcjet.com/reference/sveltekit
[sveltekit]: https://kit.svelte.dev/
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
