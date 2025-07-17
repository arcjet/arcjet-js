<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/astro`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/astro">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fastro?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fastro?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] SDK integration for [Astro][astro].

- [npm package (`@arcjet/astro`)](https://www.npmjs.com/package/@arcjet/astro)
- [GitHub source code (`arcjet-astro/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-astro)

## Getting started

Visit the [quick start guide][quick-start] to get started.

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Installation

```shell
npx astro add @arcjet/astro
```

## Usage

If installed via the Astro CLI command above, your `astro.config.mjs` should be
changed like:

```diff
  // @ts-check
  import { defineConfig } from "astro/config";
+ import arcjet from "@arcjet/astro";

  // https://astro.build/config
  export default defineConfig({
+   integrations: [
+     arcjet(),
+   ],
  });
```

However, if installed manually, you'll want to add the above lines to your Astro
configuration.

We also recommended validating your environment variables at build time. To do
this, update your `astro.config.mjs` to add the option:

```diff
  // @ts-check
  import { defineConfig } from "astro/config";
  import arcjet from "@arcjet/astro";

  // https://astro.build/config
  export default defineConfig({
+   env: {
+     validateSecrets: true
+   },
    integrations: [
      arcjet(),
    ],
  });
```

Once Arcjet is added as an integration, you'll want to start the Astro dev
server to build the `arcjet:client` virtual module and types. In your terminal,
run:

```sh
npx astro dev
```

You can now import from the `arcjet:client` module within your Astro project!

This example adds Arcjet to your middleware, but note this only works for
non-prerendered pages:

```ts
// src/middleware.ts
import { defineMiddleware } from "astro:middleware";
import aj from "arcjet:client";

export const onRequest = defineMiddleware(
  async ({ isPrerendered, request }, next) => {
    // Arcjet can be run in your middleware; however, Arcjet can only process a
    // request when the page is NOT prerendered.
    if (!isPrerendered) {
      // console.log(request);
      const decision = await aj.protect(request);

      // Deny decisions respond immediately to avoid any additional server
      // processing.
      if (decision.isDenied()) {
        return new Response(null, { status: 403, statusText: "Forbidden" });
      }
    }

    return next();
  },
);
```

## Rate limit + bot detection example

The [Arcjet rate limit][rate-limit-concepts-docs] example below applies a token
bucket rate limit rule to a route where we identify the user based on their ID
e.g. if they are logged in. The bucket is configured with a maximum capacity of
10 tokens and refills by 5 tokens every 10 seconds. Each request consumes 5
tokens.

The rule is defined in your `astro.config.mjs` file:

```js
// @ts-check
import { defineConfig } from "astro/config";
import arcjet, { tokenBucket, detectBot } from "@arcjet/astro";

// https://astro.build/config
export default defineConfig({
  env: {
    validateSecrets: true,
  },
  integrations: [
    arcjet({
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
    }),
  ],
});
```

Then Arcjet is called from within this page route:

```ts
// src/pages/api.json.ts
import type { APIRoute } from "astro";
import aj from "arcjet:client";

export const GET: APIRoute = async ({ request }) => {
  const userId = "user123"; // Replace with your authenticated user ID
  const decision = await aj.protect(request, { userId, requested: 5 }); // Deduct 5 tokens from the bucket
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  } else {
    return Response.json({ message: "Hello world" });
  }
};
```

## Shield example

[Arcjet Shield][shield-concepts-docs] protects your application against common
attacks, including the OWASP Top 10. You can run Shield on every request with
negligible performance impact.

The rule is defined in your `astro.config.mjs` file:

```js
// @ts-check
import { defineConfig } from "astro/config";
import arcjet, { shield } from "@arcjet/astro";

// https://astro.build/config
export default defineConfig({
  env: {
    validateSecrets: true,
  },
  integrations: [
    arcjet({
      rules: [
        shield({
          mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
        }),
      ],
    }),
  ],
});
```

Then Arcjet is called from within this page route:

```ts
// src/pages/api.json.ts
import type { APIRoute } from "astro";
import aj from "arcjet:client";

export const GET: APIRoute = async ({ request }) => {
  const decision = await aj.protect(request);

  if (decision.isDenied()) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  } else {
    return Response.json({ message: "Hello world" });
  }
};
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[astro]: https://astro.build/
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/astro
[example-source]: https://github.com/arcjet/arcjet-js-example
[rate-limit-concepts-docs]: https://docs.arcjet.com/rate-limiting/concepts
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
