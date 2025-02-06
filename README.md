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

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Bot detection. Rate limiting. Email validation. Attack protection. Data
redaction. A developer-first approach to security.

This is the monorepo containing various [Arcjet][arcjet] open source packages
for JS.

## Features

Arcjet security features for protecting JS apps:

- 🤖 [Bot protection][bot-protection-quick-start] - manage traffic by automated
  clients and bots.
- 🛑 [Rate limiting][rate-limiting-quick-start] - limit the number of requests a
  client can make.
- 🛡️ [Shield WAF][shield-quick-start] - protect your application against common
  attacks.
- 📧 [Email validation][email-validation-quick-start] - prevent users from
  signing up with fake email addresses.
- 📝 [Signup form protection][signup-protection-quick-start] - combines rate
  limiting, bot protection, and email validation to protect your signup forms.
- 🕵️‍♂️ [Sensitive information detection][sensitive-info-quick-start] - block
  personally identifiable information (PII).
- 🚅 [Nosecone][nosecone-quick-start] - set security headers such as
  `Content-Security-Policy` (CSP).

## Quick start

- [Bun][bun-quick-start]
- [Deno][deno-quick-start]
- [NestJS][nest-quick-start]
- [Next.js][next-quick-start]
- [Node.js][node-quick-start]
- [Remix][remix-quick-start]
- [SvelteKit][sveltekit-quick-start]

### Get help

[Join our Discord server][discord-invite] or [reach out for support][support].

## Example apps

- [NestJS][example-nestjs]
- [Next.js][example-nextjs] ([try live][example-url])
- [Remix][example-remix]
- ... [more examples][example-examples-folder]

## Blueprints

- [AI quota control][blueprint-ai-quota-control]
- [IP geolocation][blueprint-ip-geolocation]
- [Cookie banner][blueprint-cookie-banner]
- [Payment form protection][blueprint-payment-form-protection]
- [VPN & proxy detection][blueprint-vpn-proxy-detection]

## Usage

Read the docs at [docs.arcjet.com][arcjet-docs].

### Next.js bot detection

This example will enable [Arcjet bot protection][bot-protection-concepts-docs]
across your entire Next.js application. Next.js middleware runs before every
request, allowing Arcjet to protect your entire application before your code
runs.

It will return a 403 Forbidden response for all requests from bots not in the
allow list.

```ts
// middleware.ts
import arcjet, { ArcjetRuleResult, detectBot } from "@arcjet/next";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  // matcher tells Next.js which routes to run the middleware on.
  // This runs the middleware on all routes except for static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    detectBot({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
  ],
});

function isSpoofed(result: ArcjetRuleResult) {
  return (
    // You probably don't want DRY_RUN rules resulting in a denial
    // since they are generally used for evaluation purposes but you
    // could log here.
    result.state !== "DRY_RUN" &&
    result.reason.isBot() &&
    result.reason.isSpoofed()
  );
}

export default async function middleware(request: NextRequest) {
  const decision = await aj.protect(request);

  // Bots not in the allow list will be blocked
  if (decision.isDenied()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Arcjet Pro plan verifies the authenticity of common bots using IP data.
  // Verification isn't always possible, so we recommend checking the results
  // separately.
  // https://docs.arcjet.com/bot-protection/reference#bot-verification
  if (decision.results.some(isSpoofed)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}
```

### Node.js bot protection example

This simple Node.js server is protected with [Arcjet bot
protection][bot-protection-concepts-docs]. It will return a 403 Forbidden
response for all requests from bots not in the allow list.

```ts
// server.ts
import arcjet, { detectBot } from "@arcjet/node";
import http from "node:http";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    detectBot({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      // configured with a list of bots to allow from
      // https://arcjet.com/bot-list
      // Block all bots except the following
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
        // Uncomment to allow these other common bot categories
        // See the full list at https://arcjet.com/bot-list
        //"CATEGORY:MONITOR", // Uptime monitoring services
        //"CATEGORY:PREVIEW", // Link previews e.g. Slack, Discord
      ],
    }),
  ],
});

const server = http.createServer(async function (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  const decision = await aj.protect(req);
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Forbidden" }));
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Hello world" }));
  }
});

server.listen(8000);
```

## Packages

We provide the source code for various packages in this repository, so you can
find a specific one through the categories and descriptions below.

### SDKs

- [`@arcjet/bun`](./arcjet-bun/README.md): SDK for Bun.sh.
- [`@arcjet/deno`](./arcjet-deno/README.md): SDK for Deno.
- [`@arcjet/nest`](./arcjet-nest/README.md): SDK for NestJS.
- [`@arcjet/next`](./arcjet-next/README.md): SDK for Next.js.
- [`@arcjet/node`](./arcjet-node/README.md): SDK for Node.js.
- [`@arcjet/remix`](./arcjet-remix/README.md): SDK for Remix.
- [`@arcjet/sveltekit`](./arcjet-sveltekit/README.md): SDK for SvelteKit.

### Analysis

- [`@arcjet/analyze`](./analyze/README.md): Local analysis engine.
- [`@arcjet/headers`](./headers/README.md): Arcjet extension of the Headers
  class.
- [`@arcjet/ip`](./ip/README.md): Utilities for finding the originating IP of a
  request.
- [`@arcjet/redact`](./redact/README.md): Redact & unredact sensitive
  information from strings.

### Nosecone

See [the docs][nosecone-docs] for details.

- [`nosecone`](./nosecone/README.md): Protect your `Response` with secure
  headers.
- [`@nosecone/next`](./nosecone-next/README.md): Protect your Next.js
  application with secure headers.
- [`@nosecone/sveltekit`](./nosecone-sveltekit/README.md): Protect your
  SvelteKit application with secure headers.

### Utilities

- [`arcjet`](./arcjet/README.md): JS SDK core.
- [`@arcjet/body`](./body/README.md): utilities for extracting the body from a
  Node.js IncomingMessage.
- [`@arcjet/decorate`](./decorate/README.md): Utilities for decorating responses
  with information.
- [`@arcjet/duration`](./duration/README.md): Utilities for parsing duration
  strings into seconds integers.
- [`@arcjet/env`](./env/README.md): Environment detection for Arcjet variables.
- [`@arcjet/logger`](./logger/README.md): Lightweight logger which mirrors the
  Pino structured logger interface.
- [`@arcjet/protocol`](./protocol/README.md): JS interface into the Arcjet
  protocol.
- [`@arcjet/runtime`](./runtime/README.md): Runtime detection.
- [`@arcjet/sprintf`](./sprintf/README.md): Platform-independent replacement for
  `util.format`.
- [`@arcjet/transport`](./transport/README.md): Transport mechanisms for the
  Arcjet protocol.

### Internal development

- [`@arcjet/eslint-config`](./eslint-config/README.md): Custom eslint config for
  our projects.
- [`@arcjet/redact-wasm`](./redact-wasm/README.md): Sensitive information
  redaction detection engine.
- [`@arcjet/rollup-config`](./rollup-config/README.md): Custom rollup config for
  our projects.
- [`@arcjet/tsconfig`](./tsconfig/README.md): Custom tsconfig for our projects.

## Support

This repository follows the [Arcjet Support Policy][arcjet-support].

## Security

This repository follows the [Arcjet Security Policy][arcjet-security].

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[bun-quick-start]: https://docs.arcjet.com/get-started?f=bun
[deno-quick-start]: https://docs.arcjet.com/get-started?f=deno
[nest-quick-start]: https://docs.arcjet.com/get-started?f=nest-js
[next-quick-start]: https://docs.arcjet.com/get-started?f=next-js
[node-quick-start]: https://docs.arcjet.com/get-started?f=node-js
[remix-quick-start]: https://docs.arcjet.com/get-started?f=remix
[sveltekit-quick-start]: https://docs.arcjet.com/get-started?f=sveltekit
[discord-invite]: https://arcjet.com/discord
[support]: https://docs.arcjet.com/support
[example-url]: https://example.arcjet.com
[bot-protection-concepts-docs]: https://docs.arcjet.com/bot-protection/concepts
[arcjet-docs]: https://docs.arcjet.com/
[arcjet-support]: https://docs.arcjet.com/support
[arcjet-security]: https://docs.arcjet.com/security
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[nosecone-docs]: https://docs.arcjet.com/nosecone/quick-start
[example-nestjs]: https://github.com/arcjet/example-nestjs
[example-nextjs]: https://github.com/arcjet/example-nextjs
[example-remix]: https://github.com/arcjet/example-remix
[example-examples-folder]: ./examples
[blueprint-ai-quota-control]: https://docs.arcjet.com/blueprints/ai-quota-control
[blueprint-ip-geolocation]: https://docs.arcjet.com/blueprints/ip-geolocation
[blueprint-cookie-banner]: https://docs.arcjet.com/blueprints/cookie-banner
[blueprint-payment-form-protection]: https://docs.arcjet.com/blueprints/payment-form
[blueprint-vpn-proxy-detection]: https://docs.arcjet.com/blueprints/vpn-proxy-detection
[bot-protection-quick-start]: https://docs.arcjet.com/bot-protection/quick-start
[rate-limiting-quick-start]: https://docs.arcjet.com/rate-limiting/quick-start
[shield-quick-start]: https://docs.arcjet.com/shield/quick-start
[email-validation-quick-start]: https://docs.arcjet.com/email-validation/quick-start
[signup-protection-quick-start]: https://docs.arcjet.com/signup-protection/quick-start
[sensitive-info-quick-start]: https://docs.arcjet.com/sensitive-info/quick-start
[nosecone-quick-start]: https://docs.arcjet.com/nosecone/quick-start
