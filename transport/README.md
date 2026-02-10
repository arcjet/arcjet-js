<!-- trunk-ignore-all(markdownlint/MD001) -->

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/transport`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/transport">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Ftransport?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Ftransport?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Transport mechanisms for the [Arcjet][arcjet] protocol.

- [npm package (`@arcjet/transport`)](https://www.npmjs.com/package/@arcjet/transport)
- [GitHub source code (`transport/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/transport)

## What is this?

This package provides a way to talk to our protocol.

## When should I use this?

This is an internal Arcjet package not designed for public use.
See our [_Get started_ guide][arcjet-get-started] for how to use Arcjet in your
application.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/transport
```

## Use

```ts
import { createTransport } from "@arcjet/transport";

const transport = createTransport("https://decide.arcjet.com");
// This can now be passed to `createClient` from `@arcjet/protocol`.
```

## API

This package exports the identifier
[`createTransport`][api-create-transport].
There is no default export.

This package exports no [TypeScript][] types.

### `createTransport(baseUrl)`

Create a transport that talks over
HTTP/2 (in Node.js, with `@connectrpc/connect-node`) and
HTTP (in Bun, Edge Light, and `workerd`, with `@connectrpc/connect-web`)

A thin wrapper around [`createConnectTransport`][connect-create-transport].

###### Parameters

- `baseUrl` (`string`, example: `https://example.com/my-api`)
  — base URI for all HTTP requests

###### Returns

Connect transport used to make RPC calls.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-create-transport]: #createtransportbaseurl
[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[connect-create-transport]: https://connectrpc.com/docs/web/choosing-a-protocol/
[typescript]: https://www.typescriptlang.org/
