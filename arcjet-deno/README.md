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

## What is this?

This is our adapter to integrate Arcjet into Deno.
Arcjet helps you secure your Deno server.
This package exists so that we can provide the best possible experience to
Deno users.

## When should I use this?

You can use this if you are using Deno.
See our [_Get started_ guide][arcjet-get-started] for other supported
runtimes.

## Install

This package is ESM only.
Install with Deno:

```sh
deno install npm:@arcjet/deno
```

## Use

```ts
import "jsr:@std/dotenv/load";
import arcjet, { shield } from "npm:@arcjet/deno";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = Deno.env.get("ARCJET_KEY");

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

Deno.serve(
  aj.handler(async function (request: Request) {
    const decision = await aj.protect(request);

    if (decision.isDenied()) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    return Response.json({ message: "Hello world" });
  }),
);
```

<!--

TODO(@wooorm-arcjet): This is missing?

For more on how to configure Arcjet with Deno and how to protect Deno,
see the [Arcjet Deno SDK reference][arcjet-reference-deno] on our website.

[arcjet-reference-deno]: https://docs.arcjet.com/reference/deno

-->

## Test

This monorepo is tested with Node.js but this package targets Deno.
Run the tests from this package folder with:

```sh
deno test test/index.test.ts --allow-env --allow-net --no-check
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet-get-started]: https://docs.arcjet.com/get-started
[arcjet]: https://arcjet.com
[deno]: https://deno.com/
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
