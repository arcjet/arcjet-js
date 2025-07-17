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

## Use

Configure Arcjet in `hooks.server.ts`:

```ts
import { env } from "$env/dynamic/private";
import arcjet, { shield } from "@arcjet/sveltekit";
import { type RequestEvent, error } from "@sveltejs/kit";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  key: arcjetKey,
  rules: [
    // Shield protects your app from common attacks.
    // Use `DRY_RUN` instead of `LIVE` to only log.
    shield({ mode: "LIVE" }),
  ],
});

export async function handle({
  event,
  resolve,
}: {
  event: RequestEvent;
  resolve(event: RequestEvent): Response | Promise<Response>;
}): Promise<Response> {
  const decision = await aj.protect(event);

  if (decision.isDenied()) {
    return error(403, "Forbidden");
  }

  // Continue with the route
  return resolve(event);
}
```

For more on how to configure Arcjet with SvelteKit and how to protect
SvelteKit,
see the [Arcjet SvelteKit SDK reference][arcjet-reference-sveltekit] on our
website.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet-reference-sveltekit]: https://docs.arcjet.com/reference/sveltekit
[arcjet]: https://arcjet.com
[sveltekit]: https://kit.svelte.dev/
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/sveltekit
[example-source]: https://github.com/arcjet/arcjet-js-example
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
