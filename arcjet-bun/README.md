<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
  </picture>
</a>

# `@arcjet/bun`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/bun">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fbun?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fbun?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification & defense
against common attacks.

This is the [Arcjet][arcjet] SDK for [Bun.sh][bun-sh].

## Example app

Try an Arcjet protected app live at
[https://example.arcjet.com](https://example.arcjet.com) ([source
code](https://github.com/arcjet/arcjet-js-example)).

## Installation

```shell
bun add @arcjet/bun
```

## Rate limit example

The [Arcjet rate limit][rate-limit-concepts-docs] example below applies a token
bucket rate limit rule to a route where we identify the user based on their ID
e.g. if they are logged in. The bucket is configured with a maximum capacity of
10 tokens and refills by 5 tokens every 10 seconds. Each request consumes 5
tokens.

```ts
import arcjet, { tokenBucket } from "@arcjet/bun";

const aj = arcjet({
  key: Bun.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
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

export default {
  port: 8000,
  fetch: aj.handler(async function (req: Request) {
    const userId = "user123"; // Replace with your authenticated user ID
    const decision = await aj.protect(req, { userId, requested: 5 }); // Deduct 5 tokens from the bucket
    console.log("Arcjet decision", decision);

    if (decision.isDenied()) {
      return Response.json(
        { error: "Too Many Requests", reason: decision.reason },
        { status: 429 },
      );
    } else {
      return Response.json({ message: "Hello world" });
    }
  }),
};
```

## Shield example

[Arcjet Shield][shield-concepts-docs] protects your application against common
attacks, including the OWASP Top 10. You can run Shield on every request with
negligible performance impact.

```ts
import arcjet, { shield } from "@arcjet/bun";

const aj = arcjet({
  key: Bun.env.ARCJET_KEY, // Get your site key from https://app.arcjet.com
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

export default {
  port: 8000,
  fetch: aj.handler(async function (req: Request) {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    } else {
      return Response.json({ message: "Hello world" });
    }
  }),
};
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[bun-sh]: https://bun.sh/
[rate-limit-concepts-docs]: https://docs.arcjet.com/rate-limiting/concepts
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
