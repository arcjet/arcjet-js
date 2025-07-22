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

## Use

Configure Arcjet in `astro.config.mjs`:

```js
import arcjet, { shield } from "@arcjet/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  // We recommend setting
  // [`validateSecrets`](https://docs.astro.build/en/reference/configuration-reference/#envvalidatesecrets).
  env: { validateSecrets: true },
  integrations: [
    arcjet({
      rules: [
        // Shield protects your app from common attacks.
        // Use `DRY_RUN` instead of `LIVE` to only log.
        shield({ mode: "LIVE" }),
      ],
    }),
  ],
});
```

…then use Arcjet in on-demand routes (such as `src/pages/api.json.ts`):

```ts
import type { APIRoute } from "astro";
import aj from "arcjet:client";

export const GET: APIRoute = async ({ request }) => {
  const decision = await aj.protect(request);

  if (decision.isDenied()) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  return Response.json({ message: "Hello world" });
};
```

For more on how to configure Arcjet with Astro and how to protect Astro,
see the [Arcjet Astro SDK reference][arcjet-reference-astro] on our website.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet-reference-astro]: https://docs.arcjet.com/reference/astro
[arcjet]: https://arcjet.com
[astro]: https://astro.build/
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/astro
[example-source]: https://github.com/arcjet/arcjet-js-example
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
