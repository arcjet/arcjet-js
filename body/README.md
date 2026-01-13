<!-- trunk-ignore-all(markdownlint/MD001) -->
<!-- trunk-ignore-all(markdownlint/MD024) -->

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/body`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/body">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fbody?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fbody?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] utilities for getting the body from a stream.

- [npm package (`@arcjet/body`)](https://www.npmjs.com/package/@arcjet/body)
- [GitHub source code (`body/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/body)

## What is this?

This is an internal utility to help us read streams from various frameworks.
It’s in part a fork of [`stream-utils/raw-body`][node-raw-body].
We chose to fork so that we can cut away functionality that we do not use
and keep our dependency tree as light as possible.
Specifically it always parses the stream as a UTF-8 string instead of a `Buffer`
and only supports promises instead of callbacks.

## When should I use this?

You should not use this but use [`stream-utils/raw-body`][node-raw-body] or one
of the alternatives instead.
This package matches our current needs which are likely different from yours.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/body
```

## Use

```ts
import fs from "node:fs";
import { readBody } from "@arcjet/body";

const body = await readBody(fs.createReadStream("example.ts"), { limit: 1024 });
console.log(body);
```

## API

This package exports the identifiers
[`readBodyWeb`][api-read-body-web] and
[`readBody`][api-read-body].
There is no default export.

This package exports the [TypeScript][] types
[`ReadBodyOpts`][api-read-body-opts] and
[`ReadableStreamLike`][api-readable-stream-like].

### `ReadBodyOpts`

Configuration (TypeScript type).

###### Fields

- `expectedLength` (`number`, optional)
  — length of the stream in bytes;
  rejects an error if the contents of the stream do not add up to this length;
  useful when the exact size is known
- `limit` (`number`, required)
  — limit of the body in bytes;
  rejects an error if the body ends up being larger than this limit;
  used to prevent reading too much data from malicious clients.

### `ReadableStreamLike`

Minimal Node.js stream interface (TypeScript type).

```ts
interface ReadableStreamLike {
  on?: EventHandlerLike | null | undefined;
  readable?: boolean | null | undefined;
  removeListener?: EventHandlerLike | null | undefined;
}
```

### `readBodyWeb(stream, options)`

Read the body of a
[web stream][web-stream].

###### Parameters

- `stream` (`ReadableStream`)
  — stream
- `options` ([`ReadBodyOpts`][api-read-body-opts], required)
  — configuration

###### Returns

Promise that resolves to a concatenated body (`Promise<string>`).

### `readBody(stream, options)`

Read the body of a Node.js stream.

###### Parameters

- `stream` (`ReadableStream`)
  — stream
- `options` ([`ReadBodyOpts`][api-read-body-opts], required)
  — configuration

###### Returns

Promise that resolves to a concatenated body (`Promise<string>`).

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

Derivative work based on [`raw-body`][node-raw-body] licensed under
[MIT][node-raw-body-license] © Jonathan Ong and Douglas Christopher Wilson.
Our work removes features that we do not use: no buffers, no sync interface.
It adds a version for web streams.

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-read-body-opts]: #readbodyopts
[api-read-body-web]: #readbodywebstream-options
[api-read-body]: #readbodystream-options
[api-readable-stream-like]: #readablestreamlike
[arcjet]: https://arcjet.com
[node-raw-body-license]: https://github.com/stream-utils/raw-body/blob/191e4b6/LICENSE
[node-raw-body]: https://github.com/stream-utils/raw-body/blob/191e4b6/test/index.js
[typescript]: https://www.typescriptlang.org
[web-stream]: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
