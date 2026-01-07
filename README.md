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

- 🤖 [Bot protection][feature-bot-protection]
  — detect bots, block bad bots, verify legitimate bots, and reduce unwanted
  automated requests before they reach your application.
- 🛑 [Rate limiting][feature-rate-limiting]
  — control how many requests a client can make to your application or API over
  a given period of time.
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

### Next.js bot detection

This example will enable [Arcjet bot protection][feature-bot-protection]
across your entire Next.js application. Next.js middleware runs before every
request, allowing Arcjet to protect your entire application before your code
runs.

It will return a 403 Forbidden response for all requests from bots not in the
allow list.

```ts
// middleware.ts
import arcjet, { ArcjetRuleResult, detectBot } from "@arcjet/next";
import { isSpoofedBot } from "@arcjet/inspect";
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
  if (decision.results.some(isSpoofedBot)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}
```

### Node.js bot protection example

This simple Node.js server is protected with [Arcjet bot
protection][feature-bot-protection]. It will return a 403 Forbidden
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
