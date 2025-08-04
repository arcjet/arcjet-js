<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/remix`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/remix">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fremix?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fremix?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] SDK for [Remix][remix].

- [npm package (`@arcjet/remix`)](https://www.npmjs.com/package/@arcjet/remix)
- [GitHub source code (`arcjet-remix/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-remix)

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## What is this?

This is our adapter to integrate Arcjet into Remix.
Arcjet helps you secure your Remix website.
This package exists so that we can provide the best possible experience to
Remix users.

## When should I use this?

You can use this if you are using Remix.
See our [_Get started_ guide][arcjet-get-started] for other supported
frameworks.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/remix
```

## Use

```tsx
import arcjet, { shield } from "@arcjet/remix";
import { useLoaderData } from "@remix-run/react";
import { LoaderFunctionArgs } from "@remix-run/node";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

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

export async function loader(args: LoaderFunctionArgs) {
  const decision = await aj.protect(args);

  if (decision.isDenied()) {
    throw Response.json({ message: "Forbidden" }, { status: 403 });
  }

  return Response.json({ message: "Hello world" });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();
  return <h1>{data.message}</h1>;
}
```

For more on how to configure Arcjet with Remix and how to protect Remix,
see the [Arcjet Remix SDK reference][arcjet-reference-remix] on our website.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet-get-started]: https://docs.arcjet.com/get-started
[arcjet-reference-remix]: https://docs.arcjet.com/reference/remix
[arcjet]: https://arcjet.com
[remix]: https://remix.run/
[example-url]: https://example.arcjet.com
[example-source]: https://github.com/arcjet/arcjet-js-example
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
