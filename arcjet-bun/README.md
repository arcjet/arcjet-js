<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
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
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] SDK for [Bun.sh][bun-sh].

- [npm package (`@arcjet/bun`)](https://www.npmjs.com/package/@arcjet/bun)
- [GitHub source code (`arcjet-bun/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-bun)

## Getting started

Visit the [quick start guide][quick-start] to get started.

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Installation

```shell
bun add @arcjet/bun
```

## Use

```ts
import arcjet, { shield } from "@arcjet/bun";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = Bun.env.ARCJET_KEY;

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

export default {
  port: 8000,
  fetch: aj.handler(async function (request: Request) {
    const decision = await aj.protect(request);

    if (decision.isDenied()) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    return Response.json({ message: "Hello world" });
  }),
};
```

For more on how to configure Arcjet with Bun and how to protect Bun,
see the [Arcjet Bun SDK reference][arcjet-reference-bun] on our website.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet-reference-bun]: https://docs.arcjet.com/reference/bun
[arcjet]: https://arcjet.com
[bun-sh]: https://bun.sh/
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/bun
[example-source]: https://github.com/arcjet/arcjet-js-example
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
