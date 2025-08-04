<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/inspect`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/inspect">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Finspect?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Finspect?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] utilities for inspecting decisions made by an SDK.

- [npm package (`@arcjet/inspect`)](https://www.npmjs.com/package/@arcjet/inspect)
- [GitHub source code (`inspect/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/inspect)

## What is this?

Arcjet attaches lots of metadata to every decision.
This package exists to more easily interact with Arcjet decisions for common
patterns.

## When should I use this?

You can access metadata on decisions directly but you can use this package for
common patterns.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/inspect
```

## Example

```ts
import http from "node:http";
import arcjet, { detectBot } from "@arcjet/next";
import { isMissingUserAgent } from "@arcjet/inspect";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  key: arcjetKey,
  rules: [
    // `detectBot` lets you manage automated clients and bots.
    detectBot({ allow: [], mode: "LIVE" }),
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

  if (decision.results.some(isMissingUserAgent)) {
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "You are a bot!" }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "Hello world" }));
});

server.listen(8000);
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
