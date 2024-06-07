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
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the monorepo containing various [Arcjet][arcjet] open source packages
for JS.

## Quick start

- **Bun?** Use the [`@arcjet/bun`][npm-bun] package with our [Bun quick start
  guide][bun-quick-start].
- **Next.js?** Use the [`@arcjet/next`][npm-next] package with our [Next.js
  quick start guide][next-quick-start].
- **Node.js?** Use the [`@arcjet/node`][npm-node] package with our [Node.js
  quick start guide][node-quick-start].
- **SvelteKit?** Use the [`@arcjet/sveltekit`][npm-sveltekit] package with our
  [SvelteKit quick start guide][sveltekit-quick-start].

## Get help

[Join our Discord server][discord-invite] or [reach out for support][support].

## Examples

- [Next.js rate limits](./examples/nextjs-14-app-dir-rl)
- [Next.js email validation](./examples/nextjs-14-app-dir-validate-email)
- [Bun rate limits](./examples/bun-rl)
- [Protect NextAuth login routes](./examples/nextjs-14-nextauth-4)
- [OpenAI chatbot protection](./examples/nextjs-14-openai)
- [Express.js rate limits](./examples/nodejs-express-rl)
- [SvelteKit](./examples/sveltekit)
- ... [more examples](./examples)

### Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Usage

Read the docs at [docs.arcjet.com][arcjet-docs].

### Next.js rate limit example

The [Arcjet rate limit][rate-limit-concepts-docs] example below
applies a token bucket rate limit rule to a route where we identify the user
based on their ID e.g. if they are logged in. The bucket is configured with a
maximum capacity of 10 tokens and refills by 5 tokens every 10 seconds. Each
request consumes 5 tokens.

See the [Arcjet Next.js rate limit documentation][next-rate-limit-quick-start]
for details.

```ts
import arcjet, { tokenBucket } from "@arcjet/next";
import { NextResponse } from "next/server";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      characteristics: ["userId"], // track requests by a custom user ID
      refillRate: 5, // refill 5 tokens per interval
      interval: 10, // refill every 10 seconds
      capacity: 10, // bucket maximum capacity of 10 tokens
    }),
  ],
});

export async function GET(req: Request) {
  const userId = "user123"; // Replace with your authenticated user ID
  const decision = await aj.protect(req, { userId, requested: 5 }); // Deduct 5 tokens from the bucket
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Too Many Requests", reason: decision.reason },
      { status: 429 },
    );
  }

  return NextResponse.json({ message: "Hello world" });
}
```

### Node.js bot protection example

The [Arcjet bot protection][bot-protection-concepts-docs] example below will
return a 403 Forbidden response for all requests from clients we are sure are
automated.

See the [Arcjet Node.js bot protection documentation][node-bot-quick-start] for
details.

```ts
import arcjet, { detectBot } from "@arcjet/node";
import http from "node:http";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    detectBot({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      block: ["AUTOMATED"], // blocks all automated clients
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
- [`@arcjet/next`](./arcjet-next/README.md): SDK for the Next.js framework.
- [`@arcjet/node`](./arcjet-node/README.md): SDK for Node.js.
- [`@arcjet/sveltekit`](./arcjet-sveltekit/README.md): SDK for SvelteKit.

### Analysis

- [`@arcjet/analyze`](./analyze/README.md): Local analysis engine.
- [`@arcjet/headers`](./headers/README.md): Arcjet extension of the Headers
  class.
- [`@arcjet/ip`](./ip/README.md): Utilities for finding the originating IP of a
  request.

### Utilities

- [`arcjet`](./arcjet/README.md): JS SDK core.
- [`@arcjet/protocol`](./protocol/README.md): JS interface
  into the Arcjet protocol.
- [`@arcjet/logger`](./logger/README.md): Logging interface which mirrors the
  console interface but allows log levels.
- [`@arcjet/decorate`](./decorate/README.md): Utilities for decorating responses
  with information.
- [`@arcjet/duration`](./duration/README.md): Utilities for parsing duration
  strings into seconds integers.
- [`@arcjet/sprintf`](./sprintf/README.md): Platform-independent replacement for
  `util.format`.

### Internal development

- [`@arcjet/eslint-config`](./eslint-config/README.md): Custom eslint config for
  our projects.
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
[npm-bun]: https://www.npmjs.com/package/@arcjet/bun
[npm-next]: https://www.npmjs.com/package/@arcjet/next
[bun-quick-start]: https://docs.arcjet.com/get-started/bun
[next-quick-start]: https://docs.arcjet.com/get-started/nextjs
[npm-node]: https://www.npmjs.com/package/@arcjet/node
[node-quick-start]: https://docs.arcjet.com/get-started/nodejs
[sveltekit-quick-start]: https://docs.arcjet.com/get-started/sveltekit
[npm-sveltekit]: https://www.npmjs.com/package/@arcjet/sveltekit
[discord-invite]: https://discord.gg/TPra6jqZDC
[support]: https://docs.arcjet.com/support
[example-url]: https://example.arcjet.com
[example-source]: https://github.com/arcjet/arcjet-js-example
[rate-limit-concepts-docs]: https://docs.arcjet.com/rate-limiting/concepts
[next-rate-limit-quick-start]: https://docs.arcjet.com/rate-limiting/quick-start/nextjs
[bot-protection-concepts-docs]: https://docs.arcjet.com/bot-protection/concepts
[node-bot-quick-start]: https://docs.arcjet.com/bot-protection/quick-start/nodejs
[arcjet-docs]: https://docs.arcjet.com/
[arcjet-support]: https://docs.arcjet.com/support
[arcjet-security]: https://docs.arcjet.com/security
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
