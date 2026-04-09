<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `arcjet`

<p>
  <a href="https://www.npmjs.com/package/arcjet">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] is the runtime security platform that ships with your AI code. Stop bots and automated attacks from burning your AI budget, leaking data, or misusing tools with Arcjet's AI security building blocks.

This is the [Arcjet][arcjet] TypeScript and JavaScript SDK core. **Most users
should install a framework SDK instead** (`@arcjet/next`, `@arcjet/node`,
`@arcjet/bun`, etc.) — see the [framework SDKs][github-arcjet-sdks]. Use this
package directly only if you are building a custom adapter for a runtime not
yet supported. Every feature works with any JavaScript application.

[npm package](https://www.npmjs.com/package/arcjet) |
[GitHub source](https://github.com/arcjet/arcjet-js/tree/main/arcjet) |
[Full docs][ts-sdk-docs]

## Rules

The `arcjet` core exports the following protection rules. Each rule is passed
in the `rules` array when configuring the client.

### `shield(options)`

Protects your application against common web attacks, including the OWASP
Top 10.

```ts
import arcjet, { shield } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    shield({
      mode: "LIVE", // "LIVE" blocks requests | "DRY_RUN" logs only
    }),
  ],
});
```

### `detectBot(options)`

Detects and blocks automated clients and bots. Configure `allow` to permit
specific bot categories or named bots; all others are denied.

Available categories: `CATEGORY:ACADEMIC`, `CATEGORY:ADVERTISING`,
`CATEGORY:AI`, `CATEGORY:AMAZON`, `CATEGORY:APPLE`, `CATEGORY:ARCHIVE`,
`CATEGORY:BOTNET`, `CATEGORY:FEEDFETCHER`, `CATEGORY:GOOGLE`,
`CATEGORY:META`, `CATEGORY:MICROSOFT`, `CATEGORY:MONITOR`,
`CATEGORY:OPTIMIZER`, `CATEGORY:PREVIEW`, `CATEGORY:PROGRAMMATIC`,
`CATEGORY:SEARCH_ENGINE`, `CATEGORY:SLACK`, `CATEGORY:SOCIAL`,
`CATEGORY:TOOL`, `CATEGORY:UNKNOWN`, `CATEGORY:VERCEL`,
`CATEGORY:WEBHOOK`, `CATEGORY:YAHOO`.

```ts
import arcjet, { detectBot } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // "CATEGORY:MONITOR",    // Uptime monitoring services
        // "CATEGORY:PREVIEW",    // Link previews e.g. Slack, Discord
        // "OPENAI_CRAWLER_SEARCH",
        // See the full list at https://arcjet.com/bot-list
      ],
    }),
  ],
});
```

### `tokenBucket(options)`

Token bucket rate limit. Ideal for controlling AI token budgets. Set `capacity`
to the max tokens a user can spend, `refillRate` to how many tokens are
restored per `interval`, and deduct tokens per request via `requested` in
`protect()`. The `interval` accepts strings (`"1s"`, `"1m"`, `"1h"`, `"1d"`)
or seconds as a number.

```ts
import arcjet, { tokenBucket } from "arcjet";

const aj = arcjet({
  // ...
  characteristics: ["userId"], // Track per user (or "ip.src" for IP-based)
  rules: [
    tokenBucket({
      mode: "LIVE",
      refillRate: 2_000, // Tokens added per interval
      interval: "1h", // Refill interval (supports "s", "m", "h", "d" or seconds)
      capacity: 5_000, // Maximum bucket size
    }),
  ],
});

// Deduct tokens at request time:
const decision = await aj.protect(context, {
  userId: "user-123",
  requested: 500, // Tokens to deduct
});
```

### `slidingWindow(options)`

Sliding window rate limit. Smoothly limits request rates over a rolling time
window.

```ts
import arcjet, { slidingWindow } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    slidingWindow({
      mode: "LIVE",
      interval: 60, // Window size in seconds
      max: 100, // Maximum requests per window
    }),
  ],
});
```

### `fixedWindow(options)`

Fixed window rate limit. Resets the counter at the start of each window.

```ts
import arcjet, { fixedWindow } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    fixedWindow({
      mode: "LIVE",
      window: "1m", // Window duration
      max: 100, // Maximum requests per window
    }),
  ],
});
```

### `detectPromptInjection(options)`

Detects prompt injection attacks — attempts to override your AI model's
instructions via user input. Pass the user's message via
`detectPromptInjectionMessage` on each `protect()` call.

```ts
import arcjet, { detectPromptInjection } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    detectPromptInjection({
      mode: "LIVE", // "LIVE" blocks | "DRY_RUN" logs only
    }),
  ],
});

const decision = await aj.protect(context, {
  detectPromptInjectionMessage: userMessage,
});

if (decision.isDenied() && decision.reason.isPromptInjection()) {
  // Block the request
}
```

### `sensitiveInfo(options)`

Detects and blocks sensitive information (PII) in request content. Pass the
content to scan via `sensitiveInfoValue` on each `protect()` call. Built-in
entity types: `CREDIT_CARD_NUMBER`, `EMAIL`, `PHONE_NUMBER`, `IP_ADDRESS`.
You can also provide a custom `detect` callback for additional patterns.

```ts
import arcjet, { sensitiveInfo } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    sensitiveInfo({
      mode: "LIVE",
      deny: [
        "CREDIT_CARD_NUMBER",
        "EMAIL",
        "PHONE_NUMBER",
        // See https://docs.arcjet.com/sensitive-info/reference for all types
      ],
    }),
  ],
});

const decision = await aj.protect(context, {
  sensitiveInfoValue: userMessage,
});
```

### `validateEmail(options)`

Validates and verifies email addresses. Deny types: `DISPOSABLE`, `FREE`,
`NO_MX_RECORDS`, `NO_GRAVATAR`, `INVALID`.

```ts
import arcjet, { validateEmail } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    validateEmail({
      mode: "LIVE",
      deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
    }),
  ],
});

const decision = await aj.protect(context, {
  email: "user@example.com",
});
```

### `filter(options)`

Filters requests using expression-based rules against request properties (IP,
headers, path, method, etc.).

```ts
import arcjet, { filter } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    filter({
      mode: "LIVE",
      deny: [
        'ip.src == "1.2.3.4"',
        'http.request.uri.path contains "/admin"',
        // See https://docs.arcjet.com/filters/reference#expression-language
      ],
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
const decision = await aj.protect(context, {});

if (decision.ip.isVpn() || decision.ip.isTor()) {
  // Block VPN traffic
}
```

See the [filter expression reference][filter-reference] for the full list of
supported fields and operators.

### `protectSignup(options)`

Combines bot protection, email validation, and rate limiting in a single rule,
optimized for protecting signup and lead capture forms.

```ts
import arcjet, { protectSignup } from "arcjet";

const aj = arcjet({
  // ...
  rules: [
    protectSignup({
      rateLimit: {
        mode: "LIVE",
        interval: "10m",
        max: 5,
      },
      bots: {
        mode: "LIVE",
      },
      email: {
        mode: "LIVE",
        deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
      },
    }),
  ],
});

const decision = await aj.protect(context, {
  email: "user@example.com",
});
```

## Inspecting decisions

The `decision` object returned by `aj.protect()` provides information about
why a request was allowed or denied.

```ts
const decision = await aj.protect(context, props);

// Top-level verdict
decision.isAllowed(); // true if the request should proceed
decision.isDenied(); // true if the request should be blocked
decision.isErrored(); // true if an error occurred evaluating rules

// Reason for the decision
decision.reason.isBot(); // detectBot rule triggered
decision.reason.isRateLimit(); // rate limit rule triggered
decision.reason.isShield(); // shield rule triggered
decision.reason.isSensitiveInfo(); // sensitiveInfo rule triggered
decision.reason.isPromptInjection(); // detectPromptInjection rule triggered
decision.reason.isEmail(); // validateEmail rule triggered

// IP intelligence
decision.ip.isHosting(); // Cloud/hosting provider IP
decision.ip.isVpn(); // VPN IP
decision.ip.isProxy(); // Proxy IP
decision.ip.isTor(); // Tor exit node IP
decision.ip.country; // ISO 3166-1 alpha-2 country code
decision.ip.city; // City name
decision.ip.asn; // Autonomous system number

// Per-rule results (array, one entry per rule)
decision.results; // ArcjetRuleResult[]
```

### Bot verification details

```ts
import { isSpoofedBot } from "@arcjet/inspect";

// Check if any result is from a bot claiming to be a known crawler but failing
// IP verification:
if (decision.results.some(isSpoofedBot)) {
  // Block spoofed bot
}

// Inspect individual bot rule results:
for (const result of decision.results) {
  if (result.reason.isBot()) {
    console.log("Bot type:", result.reason.botType);
    console.log("Bot name:", result.reason.botName);
    console.log("Verified:", result.reason.verified);
    console.log("Spoofed:", result.reason.spoofed);
  }
}
```

## IP analysis

Arcjet enriches every request with IP metadata. Use these helpers to make
policy decisions based on network signals:

```ts
const decision = await aj.protect(context, {});

if (decision.ip.isHosting()) {
  // Requests from cloud/hosting providers are often automated.
  // https://docs.arcjet.com/blueprints/vpn-proxy-detection
}

if (decision.ip.isVpn() || decision.ip.isProxy() || decision.ip.isTor()) {
  // Handle VPN/proxy traffic according to your policy
}

// Access geolocation and network details
console.log(decision.ip.country, decision.ip.city, decision.ip.asn);
```

## Custom adapter example

The following shows the minimal adapter interface required to build a custom
integration. Framework adapters take care of this automatically; this example
illustrates the low-level API.

```ts
import http from "node:http";
import { readBody } from "@arcjet/body";
import arcjet, { ArcjetAllowDecision, ArcjetReason, shield } from "arcjet";

const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  // Your adapter takes care of this: this is a naïve example.
  client: {
    async decide() {
      return new ArcjetAllowDecision({
        reason: new ArcjetReason(),
        results: [],
        ttl: 0,
      });
    },
    report() {},
  },
  key: arcjetKey,
  log: console,
  rules: [shield({ mode: "LIVE" })],
});

const server = http.createServer(async function (
  request: http.IncomingMessage,
  response: http.ServerResponse,
) {
  const url = new URL(request.url || "", "http://" + request.headers.host);
  // Your adapter takes care of this: this is a naïve example.
  const context = {
    getBody() {
      return readBody(request, { limit: 1024 });
    },
    host: request.headers.host,
    ip: request.socket.remoteAddress,
    method: request.method,
    path: url.pathname,
  };

  const decision = await aj.protect(context, {});

  if (decision.isDenied()) {
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Forbidden" }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "Hello world" }));
});

server.listen(8000);
```

## Best practices

See the [Arcjet best practices][best-practices] for detailed guidance. Key
recommendations:

**Create a single client instance** and reuse it with `withRule()` for
route-specific rules. The SDK caches decisions and configuration, so creating a
new instance per request wastes that work.

```ts
// lib/arcjet.ts — create once, import everywhere
import arcjet, { shield } from "@arcjet/node"; // or @arcjet/next, @arcjet/bun, etc.

export default arcjet({
  key: process.env.ARCJET_KEY!,
  rules: [
    shield({ mode: "LIVE" }), // base rules applied to every request
  ],
});
```

```ts
// routes/chat.ts — extend per-route with withRule()
import aj from "./lib/arcjet.js";
import { detectBot, tokenBucket } from "@arcjet/node";

const routeAj = aj.withRule(detectBot({ mode: "LIVE", allow: [] })).withRule(
  tokenBucket({
    mode: "LIVE",
    refillRate: 2_000,
    interval: "1h",
    capacity: 5_000,
  }),
);
```

**Other recommendations:**

- **Call `protect()` once per request** in the handler where you need it.
- **Start rules in `DRY_RUN` mode** to observe behavior before switching to
  `LIVE`. This lets you tune thresholds without affecting real traffic.
- **Configure proxies** if your app runs behind a load balancer or reverse proxy
  so Arcjet resolves the real client IP:
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

## API

Reference documentation is available at [docs.arcjet.com][ts-sdk-docs].

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[ts-sdk-docs]: https://docs.arcjet.com/reference/ts-js
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[github-arcjet-sdks]: https://github.com/arcjet/arcjet-js#sdks
[best-practices]: https://docs.arcjet.com/best-practices
[filter-reference]: https://docs.arcjet.com/filters/reference#expression-language
