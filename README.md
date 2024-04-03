<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
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
code. Implement rate limiting, bot protection, email verification & defend
against common attacks.

This is the monorepo containing various [Arcjet][arcjet] open source packages
for JS.

## Quick start

- **Next.js?** Use the
  [`@arcjet/next`](https://www.npmjs.com/package/@arcjet/next) package with our
  [Next.js quick start guide](https://docs.arcjet.com/get-started/nextjs).
- **Node.js?** Use the
  [`@arcjet/node`](https://www.npmjs.com/package/@arcjet/node) package with our
  [Node.js quick start guide](https://docs.arcjet.com/get-started/nodejs).

## Get help

[Join our Discord server](https://discord.gg/TPra6jqZDC) or [reach out for
support](https://docs.arcjet.com/support).

## Examples

- [Next.js rate limits](https://github.com/arcjet/arcjet-js/tree/main/examples/nextjs-14-app-dir-rl)
- [Next.js email validation](https://github.com/arcjet/arcjet-js/tree/main/examples/nextjs-14-app-dir-validate-email)
- [Protect NextAuth login routes](https://github.com/arcjet/arcjet-js/tree/main/examples/nextjs-14-nextauth-4)
- [OpenAI chatbot protection](https://github.com/arcjet/arcjet-js/tree/main/examples/nextjs-14-openai)
- [Express.js rate limits](https://github.com/arcjet/arcjet-js/tree/main/examples/nodejs-express-rl)
- ... [more examples](https://github.com/arcjet/arcjet-js/tree/main/examples)

## Usage

Read the docs at [docs.arcjet.com][arcjet-docs].

### Next.js rate limit example

The [Arcjet rate
limit](https://docs.arcjet.com/rate-limiting/concepts) example below
applies a token bucket rate limit rule to a route where we identify the user
based on their ID e.g. if they are logged in. The bucket is configured with a
maximum capacity of 10 tokens and refills by 5 tokens every 10 seconds. Each
request consumes 5 tokens.

See the [Arcjet Next.js rate limit
documentation](https://docs.arcjet.com/rate-limiting/quick-start/nextjs) for
details.

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

The [Arcjet bot protection](https://docs.arcjet.com/bot-protection/concepts)
example below will return a 403 Forbidden response for all requests from clients
we are sure are automated.

See the [Arcjet Node.js bot protection
documentation](https://docs.arcjet.com/bot-protection/quick-start/nodejs) for
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

- [`@arcjet/next`](./arcjet-next/README.md): SDK for the Next.js framework.
- [`@arcjet/node`](./arcjet-node/README.md): SDK for Node.js.

### Analysis

- [`@arcjet/analyze`](./analyze/README.md): Local analysis engine.
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
[arcjet-docs]: https://docs.arcjet.com/
[arcjet-support]: https://docs.arcjet.com/support
[arcjet-security]: https://docs.arcjet.com/security
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
