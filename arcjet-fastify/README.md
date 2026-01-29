<a href="https://arcjet.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img alt="Arcjet" height="128" src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" width="auto">
  </picture>
</a>

# `@arcjet/fastify`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/fastify">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Ffastify?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm" src="https://img.shields.io/npm/v/%40arcjet%2Ffastify?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][] helps developers protect their apps in just a few lines of
code.
Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][] SDK for [Fastify][].

## Getting started

Visit the [quick start guide][arcjet-quick-start-fastify] to get started.

## What is this?

This is our adapter to integrate Arcjet into Fastify.
Arcjet helps you secure your Fastify server.
This package exists so that we can provide the best possible experience to
Fastify users.

## When should I use this?

You can use this if you are using Fastify.
See our [_Get started_ guide][arcjet-get-started] for other supported
frameworks.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/fastify
```

<!--

## Example: app

TODO(@wooorm-arcjet): there is no fastify example there yet.

Try an Arcjet protected app live at [https://example.arcjet.com][arcjet-examples]
([source code][github-arcjet-examples]).

[arcjet-examples]: https://example.arcjet.com
[github-arcjet-examples]: https://github.com/arcjet/arcjet-js-example

-->

## Use

```js
import arcjetFastify, { shield } from "@arcjet/fastify";
import Fastify from "fastify";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const arcjet = arcjetFastify({
  key: arcjetKey,
  rules: [
    // Shield protects your app from common attacks.
    // Use `DRY_RUN` instead of `LIVE` to only log.
    shield({ mode: "LIVE" }),
  ],
});

const fastify = Fastify({ logger: true });

fastify.get("/", async function (request, reply) {
  const decision = await arcjet.protect(request);

  if (decision.isDenied()) {
    return reply
      .status(403)
      .header("Content-Type", "application/json")
      .send({ message: "Forbidden" });
  }

  return reply
    .status(200)
    .header("Content-Type", "application/json")
    .send({ message: "Hello world" });
});

await fastify.listen({ port: 8000 });
```

For more on how to configure Arcjet with Fastify and how to protect Fastify,
see the [Arcjet Fastify SDK reference][arcjet-reference-fastify] on our website.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet-get-started]: https://docs.arcjet.com/get-started
[arcjet-quick-start-fastify]: https://docs.arcjet.com/get-started/fastify
[arcjet-reference-fastify]: https://docs.arcjet.com/reference/fastify
[arcjet]: https://arcjet.com
[fastify]: https://fastify.dev/
