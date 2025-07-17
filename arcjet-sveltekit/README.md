<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/sveltekit`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/sveltekit">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fsveltekit?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fsveltekit?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] SDK for [SvelteKit][sveltekit].

- [npm package (`@arcjet/sveltekit`)](https://www.npmjs.com/package/@arcjet/sveltekit)
- [GitHub source code (`arcjet-sveltekit/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-sveltekit)

## Getting started

Visit the [quick start guide][quick-start] to get started.

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Installation

```shell
npm install -S @arcjet/sveltekit
```

## Rate limit example

The example below applies a token bucket rate limit rule to a route where we
identify the user based on their ID e.g. if they are logged in. The bucket is
configured with a maximum capacity of 10 tokens and refills by 5 tokens every 10
seconds. Each request consumes 5 tokens.

Bot detection is also enabled to block requests from known bots.

```ts
// In your `+page.server.ts` file
import arcjet, { tokenBucket, detectBot } from "@arcjet/sveltekit";
import { error, type RequestEvent } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const aj = arcjet({
  key: env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
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

export async function load(event: RequestEvent) {
  const userId = "user123"; // Replace with your authenticated user ID
  const decision = await aj.protect(event, { userId, requested: 5 }); // Deduct 5 tokens from the bucket
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    return error(403, "Forbidden");
  }

  return { message: "Hello world" };
}
```

## Shield example

[Arcjet Shield][shield-concepts-docs] protects your application against common
attacks, including the OWASP Top 10. You can run Shield on every request with
negligible performance impact.

```ts
// In your `hooks.server.ts` file
import arcjet from "@arcjet/sveltekit";
import { error, type RequestEvent } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

const aj = arcjet({
  key: env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    shield({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
    }),
  ],
});

export async function handle({
  event,
  resolve,
}: {
  event: RequestEvent;
  resolve(event: RequestEvent): Response | Promise<Response>;
}): Promise<Response> {
  // Ignore routes that extend the Arcjet rules - they will call `.protect` themselves
  const filteredRoutes = ["/api/rate-limited", "/rate-limited"];
  if (filteredRoutes.includes(event.url.pathname)) {
    // The route will handle calling `aj.protect()`
    return resolve(event);
  }

  // Ensure every other route is protected with shield
  const decision = await aj.protect(event);
  if (decision.isDenied()) {
    return error(403, "Forbidden");
  }

  // Continue with the route
  return resolve(event);
}
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[sveltekit]: https://kit.svelte.dev/
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/sveltekit
[example-source]: https://github.com/arcjet/arcjet-js-example
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
