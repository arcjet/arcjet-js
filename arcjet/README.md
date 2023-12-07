<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `arcjet`

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
    <img alt="npm badge" src="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
  </picture>
</p>

[Arcjet][arcjet] helps developers protect their apps. Installed as an SDK, it
provides a set of core primitives such as rate limiting and bot protection.
These can be used independently or combined to create a set of layered defenses,
such as signup form protection.

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
  key: "ajkey_mykey",
  rules: [],
  client: createRemoteClient({
    transport: createConnectTransport({
      baseUrl: defaultBaseUrl(),
      httpVersion: "1.1",
    }),
  }),
});

const server = http.createServer(async function (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) {
  // Construct an object with Arcjet request details
  const details = {
    ip: req.socket.remoteAddress,
  };

  const decision = await aj.protect(details);

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
