<a href="https://arcjet.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img alt="Arcjet" height="128" src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" width="auto">
  </picture>
</a>

# `@arcjet/fastify`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/fastify">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Ffastify?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm" src="https://img.shields.io/npm/v/%40arcjet%2Ffastify?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][] helps developers protect their apps in just a few lines of
code.
Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][] SDK for [Fastify][].

<!--

## Getting started

TODO(@wooorm-arcjet): this does not exist yet.

Visit the [quick start guide][arcjet-quick-start-fastify] to get started.

[arcjet-quick-start-fastify]: https://docs.arcjet.com/get-started/fastify

-->

## Install

```sh
npm install @arcjet/fastify
```

<!--

## Example: app

TODO(@wooorm-arcjet): there is no fastify example there yet.

Try an Arcjet protected app live at [https://example.arcjet.com][arcjet-examples]
([source code][github-arcjet-examples]).

[arcjet-examples]: https://example.arcjet.com

-->

## Example: Bot detection and rate limiting

This example shows a basic block of all automated clients and bots.
In a real world scenario you would probably
[allow several bots][arcjet-bot-categories] such as search engines.
It also shows how rate limiting could work for logged in users with a token
bucket strategy.

```js
import arcjetFastify, { detectBot, tokenBucket } from "@arcjet/fastify";
import Fastify from "fastify";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const arcjet = arcjetFastify({
  key: arcjetKey,
  rules: [
    // Manage automated clients and bots.
    // See <https://docs.arcjet.com/bot-protection/reference> for more info.
    detectBot({
      // This empty array for `allow` denies all bots.
      // You can allow specific bots from <https://arcjet.com/bot-list>.
      allow: [],
      mode: "LIVE", // Use `DRY_RUN` instead of `LIVE` to only log.
    }),

    // Rate limit with a token bucket.
    // Arcjet also supports other types (sliding window, fixed window).
    // See <https://docs.arcjet.com/rate-limiting/reference/> for more info.
    tokenBucket({
      capacity: 10, // Max capacity of `x` tokens.
      characteristics: ["userId"], // Track per ID of authenticated users.
      interval: 10, // Refill every `x` seconds.
      mode: "LIVE", // Use `DRY_RUN` instead of `LIVE` to only log.
      refillRate: 5, // Refill `x` tokens per interval.
    }),
  ],
});

const fastify = Fastify({ logger: true });

fastify.get("/", async function (request, reply) {
  // Replace with an authenticated user ID.
  const userId = "user123";
  // Deduct `5` tokens from the bucket.
  const decision = await arcjet.protect(request, { requested: 5, userId });

  if (decision.isDenied()) {
    return reply
      .status(403)
      .header("Content-Type", "application/json")
      .send({ message: "Forbidden" });
  }

  return reply
    .status(200)
    .header("Content-Type", "application/json")
    .send({ message: "Hello world" });
});

await fastify.listen({ port: 3000 });
```

## Example: Shield

This example shows _[Arcjet Shield][arcjet-shield-docs]_ which protects
against common attacks including the OWASP Top 10.

```js
import arcjetFastify, { shield } from "@arcjet/fastify";
import Fastify from "fastify";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const arcjet = arcjetFastify({
  key: arcjetKey,
  rules: [
    // Protect against common attacks.
    // See <https://docs.arcjet.com/shield/reference> for more info.
    shield({
      mode: "LIVE", // Use `DRY_RUN` instead of `LIVE` to only log.
    }),
  ],
});

const fastify = Fastify({ logger: true });

fastify.get("/", async function (request, reply) {
  const decision = await arcjet.protect(request);

  if (decision.isDenied()) {
    return reply
      .status(403)
      .header("Content-Type", "application/json")
      .send({ message: "Forbidden" });
  }

  return reply
    .status(200)
    .header("Content-Type", "application/json")
    .send({ message: "Hello world" });
});

await fastify.listen({ port: 3000 });
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[arcjet-shield-docs]: https://docs.arcjet.com/shield/concepts
[arcjet-bot-categories]: https://docs.arcjet.com/bot-protection/identifying-bots#bot-categories
[fastify]: https://fastify.dev/
[github-arcjet-examples]: https://github.com/arcjet/arcjet-js-example
