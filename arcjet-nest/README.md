<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/nest`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/nest">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnest?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnest?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] is the runtime security platform that ships with your AI code.
Stop bots and automated attacks from burning your AI budget, leaking data, or
misusing tools with Arcjet's AI security building blocks.

This is the [Arcjet][arcjet] SDK for [NestJS][nest-js].

**Looking for our Next.js framework SDK?** Check out the
[`@arcjet/next`][alt-sdk] package.

- [npm package (`@arcjet/nest`)](https://www.npmjs.com/package/@arcjet/nest)
- [GitHub source code (`arcjet-nest/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-nest)

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

This is our adapter to integrate Arcjet into NestJS.
Arcjet helps you secure your Nest server.
This package exists so that we can provide the best possible experience to
Nest users.

## When should I use this?

Use this if you are using NestJS.
See our [_Get started_ guide][arcjet-get-started] for other supported
frameworks and runtimes.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/nest
```

## Quick start

This example protects a NestJS application with a global guard using bot
detection, Shield WAF, and token bucket rate limiting.

First, register the `ArcjetModule` in your app module:

```ts
// app.module.ts
import { ArcjetModule, detectBot, shield, tokenBucket } from "@arcjet/nest";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
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
})
export class AppModule {}
```

Then protect a controller using `@InjectArcjet()`:

```ts
// app.controller.ts
import { ArcjetNest, InjectArcjet } from "@arcjet/nest";
import { isSpoofedBot } from "@arcjet/inspect";
import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

@Controller()
export class AppController {
  constructor(@InjectArcjet() private readonly arcjet: ArcjetNest) {}

  @Get("/")
  async index(@Req() req: Request) {
    const decision = await this.arcjet.protect(req, { requested: 5 });
    console.log("Arcjet decision", decision);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        throw new HttpException(
          "Too many requests",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      } else if (decision.reason.isBot()) {
        throw new HttpException("No bots allowed", HttpStatus.FORBIDDEN);
      } else {
        throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
      }
    }

    // Requests from hosting IPs are likely from bots.
    // https://docs.arcjet.com/blueprints/vpn-proxy-detection
    if (decision.ip.isHosting()) {
      throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    }

    // Verifies the authenticity of common bots using IP data.
    // Verification isn't always possible, so check the results separately.
    // https://docs.arcjet.com/bot-protection/reference#bot-verification
    if (decision.results.some(isSpoofedBot)) {
      throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
    }

    return { message: "Hello world" };
  }
}
```

For the full reference, see the [Arcjet NestJS SDK docs][arcjet-reference-nest].

## Prompt injection detection

Detect and block prompt injection attacks — attempts to override your AI
model's instructions — before they reach your model. Pass the user's message
via `detectPromptInjectionMessage` on each `protect()` call.

```ts
// app.module.ts
import { ArcjetModule, detectPromptInjection } from "@arcjet/nest";
import { Module } from "@nestjs/common";

@Module({
  imports: [
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!,
      rules: [
        detectPromptInjection({
          mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
          threshold: 0.5, // Score above which requests are blocked (default: 0.5)
        }),
      ],
    }),
  ],
})
export class AppModule {}
```

```ts
// chat.controller.ts
import { ArcjetNest, InjectArcjet } from "@arcjet/nest";
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";

@Controller("chat")
export class ChatController {
  constructor(@InjectArcjet() private readonly arcjet: ArcjetNest) {}

  @Post("/")
  async chat(@Req() req: Request, @Body() body: { message: string }) {
    const decision = await this.arcjet.protect(req, {
      detectPromptInjectionMessage: body.message,
    });

    if (decision.isDenied() && decision.reason.isPromptInjection()) {
      throw new HttpException(
        "Prompt injection detected — please rephrase your message",
        HttpStatus.BAD_REQUEST,
      );
    }

    // Forward to your AI model...
  }
}
```

## Bot protection

Arcjet allows you to configure a list of bots to allow or deny. Specifying
`allow` means all other bots are denied. An empty allow list blocks all bots.

```ts
import { ArcjetModule, detectBot } from "@arcjet/nest";

ArcjetModule.forRoot({
  isGlobal: true,
  key: process.env.ARCJET_KEY!,
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
// In your controller:
import { isSpoofedBot } from "@arcjet/inspect";

const decision = await this.arcjet.protect(req);

if (decision.isDenied() && decision.reason.isBot()) {
  throw new HttpException("No bots allowed", HttpStatus.FORBIDDEN);
}

// Verifies the authenticity of common bots using IP data.
if (decision.results.some(isSpoofedBot)) {
  throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
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
  throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
}
```

## Rate limiting

Arcjet supports multiple rate limiting algorithms. Token buckets are ideal for
controlling AI token budgets.

```ts
import {
  ArcjetModule,
  tokenBucket,
  slidingWindow,
  fixedWindow,
} from "@arcjet/nest";

ArcjetModule.forRoot({
  isGlobal: true,
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
```

```ts
// In your controller:
const decision = await this.arcjet.protect(req, {
  userId: "user-123",
  requested: estimate, // Number of tokens to deduct
});

if (decision.isDenied() && decision.reason.isRateLimit()) {
  throw new HttpException("Rate limit exceeded", HttpStatus.TOO_MANY_REQUESTS);
}
```

## Sensitive information detection

Detect and block PII in request content such as email addresses, phone
numbers, and credit card numbers. Pass the content to scan via
`sensitiveInfoValue` on each `protect()` call.

```ts
import { ArcjetModule, sensitiveInfo } from "@arcjet/nest";

ArcjetModule.forRoot({
  isGlobal: true,
  key: process.env.ARCJET_KEY!,
  rules: [
    sensitiveInfo({
      mode: "LIVE", // Blocks requests. Use "DRY_RUN" to log only
      deny: ["CREDIT_CARD_NUMBER", "EMAIL", "PHONE_NUMBER"],
    }),
  ],
});
```

```ts
// In your controller:
const decision = await this.arcjet.protect(req, {
  sensitiveInfoValue: userMessage, // The text content to scan
});

if (decision.isDenied() && decision.reason.isSensitiveInfo()) {
  throw new HttpException(
    "Sensitive information detected",
    HttpStatus.BAD_REQUEST,
  );
}
```

## Request filters

Filter requests using expression-based rules against request properties (IP,
headers, path, method, etc.).

```ts
import { ArcjetModule, filterRequest } from "@arcjet/nest";

ArcjetModule.forRoot({
  isGlobal: true,
  key: process.env.ARCJET_KEY!,
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
const decision = await this.arcjet.protect(req);

if (decision.ip.isHosting()) {
  // Requests from cloud/hosting providers are often automated.
  // https://docs.arcjet.com/blueprints/vpn-proxy-detection
  throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
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
ArcjetModule.forRoot({
  isGlobal: true,
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
```

```ts
// Pass the characteristic value at request time
const decision = await this.arcjet.protect(req, {
  userId: "user-123", // Replace with your actual user ID
  requested: estimate,
});
```

## Best practices

See the [Arcjet best practices][best-practices] for detailed guidance. Key
recommendations:

**Use `withRule()` for controller-specific rules** on top of the global base
rules. The SDK caches decisions and configuration, so this is more efficient
than creating a new instance per request.

```ts
// chat.controller.ts — extend per-route with withRule()
import { ArcjetNest, InjectArcjet, detectBot, tokenBucket } from "@arcjet/nest";
import { Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";

@Controller("chat")
export class ChatController {
  constructor(@InjectArcjet() private readonly arcjet: ArcjetNest) {}

  @Post("/")
  async chat(@Req() req: Request, @Body() body: { requested: number }) {
    const routeAj = this.arcjet
      .withRule(detectBot({ mode: "LIVE", allow: [] }))
      .withRule(
        tokenBucket({
          mode: "LIVE",
          refillRate: 2_000,
          interval: "1h",
          capacity: 5_000,
        }),
      );
    const decision = await routeAj.protect(req, { requested: body.requested });
    // ...
  }
}
```

**Other recommendations:**

- **Start rules in `DRY_RUN` mode** to observe behavior before switching to
  `LIVE`. This lets you tune thresholds without affecting real traffic.
- **Configure proxies** if your app runs behind a load balancer or reverse proxy
  so Arcjet resolves the real client IP:
  ```ts
  ArcjetModule.forRoot({
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

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[arcjet-reference-nest]: https://docs.arcjet.com/reference/nestjs
[nest-js]: https://nestjs.com/
[alt-sdk]: https://www.npmjs.com/package/@arcjet/next
[quick-start]: https://docs.arcjet.com/get-started/nestjs
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
