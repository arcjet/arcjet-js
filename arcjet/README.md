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

## Getting started

Visit [docs.arcjet.com](https://docs.arcjet.com) to get started.

Generally, you'll want to use the Arcjet SDK for your specific framework, such
as [`@arcjet/next`](../arcjet-next/README.md) for Next.js. However, this package
can be used to interact with Arcjet if your framework does not have an
integration.

## Installation

```shell
npm install -S arcjet
```

## Example

```ts
import http from "http";
import arcjet, { createRemoteClient, defaultBaseUrl } from "arcjet";
import { createConnectTransport } from "@connectrpc/connect-node";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://www.npmjs.com/package/dotenv
  key: process.env.ARCJET_KEY,
  rules: [],
  client: createRemoteClient({
    transport: createConnectTransport({
      baseUrl: defaultBaseUrl(),
      httpVersion: "2",
    }),
  }),
});

const server = http.createServer(async function (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  // Any sort of additional context that might want to be included for the
  // execution of `protect()`. This is mostly only useful for writing adapters.
  const ctx = {};

  // Construct an object with Arcjet request details
  const path = new URL(req.url || "", `http://${req.headers.host}`);
  const details = {
    ip: req.socket.remoteAddress,
    method: req.method,
    host: req.headers.host,
    path: path.pathname,
  };

  const decision = await aj.protect(ctx, details);
  console.log(decision);

  if (decision.isDenied()) {
    res.writeHead(403, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Forbidden" }));
  } else {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ data: "Hello World!" }));
  }
});

server.listen(8000);
```

## API

Reference documentation is available at [docs.arcjet.com][ts-sdk-docs].

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[ts-sdk-docs]: https://docs.arcjet.com/reference/ts-js
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
