<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
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
code. Implement rate limiting, bot protection, email verification & defend
against common attacks.

This is the [Arcjet][arcjet] SDK for the [Next.js][next-js] framework.

## Getting started

Visit [docs.arcjet.com](https://docs.arcjet.com/get-started/nextjs) to get
started.

## Installation

```shell
npm install -S @arcjet/next
```

## Rate limit example

The [Arcjet rate
limit](https://docs.arcjet.com/rate-limiting/concepts) example below
applies a token bucket rate limit rule to a route where we identify the user
based on their ID e.g. if they are logged in. The bucket is configured with a
maximum capacity of 10 tokens and refills by 5 tokens every 10 seconds. Each
request consumes 5 tokens.

See the [Arcjet rate limit
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

## Shield example

[Arcjet Shield](https://docs.arcjet.com/shield/concepts) protects your
application against common attacks, including the OWASP Top 10. It’s enabled by
default and runs on every request with negligible performance impact.

See the [Arcjet Shield
documentation](https://docs.arcjet.com/shield/quick-start/nextjs) for details.

```ts
import arcjet from "@arcjet/next";
import { NextResponse } from "next/server";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.ARCJET_KEY,
  rules: [], // Shield requires no rule configuration
});

export async function GET(req: Request) {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    return NextResponse.json(
      { error: "Too Many Requests", reason: decision.reason },
      { status: 429 },
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
[next-sdk-docs]: https://docs.arcjet.com/reference/nextjs
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
