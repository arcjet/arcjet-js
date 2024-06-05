<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
  </picture>
</a>

# `@arcjet/node`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/node">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnode?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnode?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defend
against common attacks.

This is the [Arcjet][arcjet] SDK for [Node.js][node-js].

**Looking for our Next.js framework SDK?** Check out the
[`@arcjet/next`][alt-sdk] package.

## Getting started

Visit the [quick start guide][quick-start] to get started.

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Installation

```shell
npm install -S @arcjet/node
```

## Rate limit example

The [Arcjet rate limit][rate-limit-concepts-docs] example below applies a token
bucket rate limit rule to a route where we identify the user based on their ID
e.g. if they are logged in. The bucket is configured with a maximum capacity of
10 tokens and refills by 5 tokens every 10 seconds. Each request consumes 5
tokens.

```ts
import arcjet, { tokenBucket } from "@arcjet/node";
import http from "node:http";

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

const server = http.createServer(async function (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  const userId = "user123"; // Replace with your authenticated user ID
  const decision = await aj.protect(req, { userId, requested: 5 }); // Deduct 5 tokens from the bucket
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    res.writeHead(429, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({ error: "Too Many Requests", reason: decision.reason }),
    );
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Hello world" }));
  }
});

server.listen(8000);
```

## Shield example

[Arcjet Shield][shield-concepts-docs] protects your application against common
attacks, including the OWASP Top 10. You can run Shield on every request with
negligible performance impact.

```ts
import arcjet, { shield } from "@arcjet/node";
import http from "node:http";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

const server = http.createServer(async function (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  const decision = await aj.protect(req);

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

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[node-js]: https://nodejs.org/
[alt-sdk]: https://www.npmjs.com/package/@arcjet/next
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/nodejs
[example-source]: https://github.com/arcjet/arcjet-js-example
[rate-limit-concepts-docs]: https://docs.arcjet.com/rate-limiting/concepts
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
