<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
  </picture>
</a>

# `@arcjet/deno`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/deno">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fdeno?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fdeno?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification & defense
against common attacks.

This is the [Arcjet][arcjet] SDK for [Deno][deno].

- [npm package (`@arcjet/deno`)](https://www.npmjs.com/package/@arcjet/deno)
- [GitHub source code (`arcjet-deno/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-deno)

## Rate limit + bot detection example

The [Arcjet rate limit][rate-limit-concepts-docs] example below applies a token
bucket rate limit rule to a route where we identify the user based on their ID
e.g. if they are logged in. The bucket is configured with a maximum capacity of
10 tokens and refills by 5 tokens every 10 seconds. Each request consumes 5
tokens.

```ts
import "jsr:@std/dotenv/load";

import arcjet, { tokenBucket, detectBot } from "npm:@arcjet/deno";

const aj = arcjet({
  key: Deno.env.get("ARCJET_KEY")!, // Get your site key from https://app.arcjet.com
  characteristics: ["userId"], // track requests by a custom user ID
  rules: [
    // Create a token bucket rate limit. Other algorithms are supported.
    tokenBucket({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      refillRate: 5, // refill 5 tokens per interval
      interval: 10, // refill every 10 seconds
      capacity: 10, // bucket maximum capacity of 10 tokens
    }),
    detectBot({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      // configured with a list of bots to allow from
      // https://arcjet.com/bot-list
      allow: [], // "allow none" will block all detected bots
    }),
  ],
});

Deno.serve(
  aj.handler(async function (req: Request) {
    const userId = "user123"; // Replace with your authenticated user ID
    const decision = await aj.protect(req, { userId, requested: 5 }); // Deduct 5 tokens from the bucket
    console.log("Arcjet decision", decision);

    if (decision.isDenied()) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    } else {
      return Response.json({ message: "Hello world" });
    }
  }),
);
```

## Shield example

[Arcjet Shield][shield-concepts-docs] protects your application against common
attacks, including the OWASP Top 10. You can run Shield on every request with
negligible performance impact.

```ts
import "jsr:@std/dotenv/load";

import arcjet, { shield } from "npm:@arcjet/deno";

const aj = arcjet({
  key: Deno.env.get("ARCJET_KEY")!, // Get your site key from https://app.arcjet.com
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

Deno.serve(
  aj.handler(async function (req: Request) {
    const decision = await aj.protect(req);

    if (decision.isDenied()) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    } else {
      return Response.json({ message: "Hello world" });
    }
  }),
);
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[deno]: https://deno.com/
[rate-limit-concepts-docs]: https://docs.arcjet.com/rate-limiting/concepts
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
