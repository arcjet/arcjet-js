<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/node`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/node">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnode?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnode?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] SDK for [Node.js][node-js].

**Looking for our Next.js framework SDK?** Check out the
[`@arcjet/next`][alt-sdk] package.

- [npm package (`@arcjet/node`)](https://www.npmjs.com/package/@arcjet/node)
- [GitHub source code (`arcjet-node/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-node)

## Getting started

Visit the [quick start guide][quick-start] to get started.

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Installation

```shell
npm install -S @arcjet/node
```

## Use

```ts
import http from "node:http";
import arcjet, { shield } from "@arcjet/node";

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

const server = http.createServer(async function (
  request: http.IncomingMessage,
  response: http.ServerResponse,
) {
  const decision = await aj.protect(request);

  if (decision.isDenied()) {
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Forbidden" }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "Hello world" }));
});

server.listen(8000);
```

For more on how to configure Arcjet with Node.js and how to protect Node,
see the [Arcjet Node.js SDK reference][arcjet-reference-node] on our website.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet-reference-node]: https://docs.arcjet.com/reference/nodejs
[arcjet]: https://arcjet.com
[node-js]: https://nodejs.org/
[alt-sdk]: https://www.npmjs.com/package/@arcjet/next
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/nodejs
[example-source]: https://github.com/arcjet/arcjet-js-example
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
