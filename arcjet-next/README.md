<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/next`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/next">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] SDK for the [Next.js][next-js] framework.

**Looking for our Node.js SDK?** Check out the [`@arcjet/node`][alt-sdk]
package.

## Getting started

Visit the [quick start guide][quick-start] to get started.

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Installation

```shell
npm install -S @arcjet/next
```

## Rate limit example

The [Arcjet rate limit][rate-limit-concepts-docs] example below applies a token
bucket rate limit rule to a route where we identify the user based on their ID
e.g. if they are logged in. The bucket is configured with a maximum capacity of
10 tokens and refills by 5 tokens every 10 seconds. Each request consumes 5
tokens.

See the [Arcjet rate limit documentation][rate-limit-quick-start] for details.

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

## Shield example

[Arcjet Shield][shield-concepts-docs] protects your application against common
attacks, including the OWASP Top 10. You can run Shield on every request with
negligible performance impact.

See the [Arcjet Shield documentation][shield-quick-start] for details.

```ts
import arcjet, { shield } from "@arcjet/next";
import { NextResponse } from "next/server";

const aj = arcjet({
  key: process.env.ARCJET_KEY, // Get your site key from https://app.arcjet.com
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

export async function GET(req: Request) {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Forbidden", reason: decision.reason },
      { status: 403 },
    );
  }

  return NextResponse.json({ message: "Hello world" });
}
```

## API

Reference documentation is available at [docs.arcjet.com][next-sdk-docs].

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[next-js]: https://nextjs.org/
[alt-sdk]: https://www.npmjs.com/package/@arcjet/node
[quick-start]: https://docs.arcjet.com/get-started/nextjs
[next-sdk-docs]: https://docs.arcjet.com/reference/nextjs
[example-url]: https://example.arcjet.com
[example-source]: https://github.com/arcjet/arcjet-js-example
[rate-limit-concepts-docs]: https://docs.arcjet.com/rate-limiting/concepts
[rate-limit-quick-start]: https://docs.arcjet.com/rate-limiting/quick-start/nextjs
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[shield-quick-start]: https://docs.arcjet.com/shield/quick-start/nextjs
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
