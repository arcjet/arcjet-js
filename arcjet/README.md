<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `arcjet`

<p>
  <a href="https://www.npmjs.com/package/arcjet">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] TypeScript and JavaScript SDK core.

- [npm package (`arcjet`)](https://www.npmjs.com/package/arcjet)
- [GitHub source code (`arcjet/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet)

## Getting started

Visit [docs.arcjet.com](https://docs.arcjet.com) to get started.

## What is this?

This is our core package.
It exposes the functionality for the many types of protection that Arcjet
provides which can be configured and combined by users.
The functionality here is exposed from our adapters (such as `@arcjet/next`)
that each integrate with a particular framework.

<!-- TODO(@wooorm-arcjet): link `adapters` above when the main repo is up to date. -->

## When should I use this?

We recommend using one of our runtime or framework specific packages rather
than this one.
See our [_Get started_ guide][arcjet-get-started] for more info.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install arcjet
```

## Use

```ts
import http from "node:http";
import { readBody } from "@arcjet/body";
import arcjet, { ArcjetAllowDecision, ArcjetReason, shield } from "arcjet";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  // Your adapter takes care of this: this is a naïve example.
  client: {
    async decide() {
      return new ArcjetAllowDecision({
        reason: new ArcjetReason(),
        results: [],
        ttl: 0,
      });
    },
    report() {},
  },
  key: arcjetKey,
  log: console,
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
  const url = new URL(request.url || "", "http://" + request.headers.host);
  // Your adapter takes care of this: this is a naïve example.
  const context = {
    getBody() {
      return readBody(request, { limit: 1024 });
    },
    host: request.headers.host,
    ip: request.socket.remoteAddress,
    method: request.method,
    path: url.pathname,
  };

  const decision = await aj.protect(context, {});

  console.log(decision);

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

## API

Reference documentation is available at [docs.arcjet.com][ts-sdk-docs].

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[ts-sdk-docs]: https://docs.arcjet.com/reference/ts-js
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
