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

[Arcjet][arcjet] utilities for getting the body from a Node.js Stream.

## Installation

```shell
npm install -S @arcjet/body
```

## Example

```ts
import { readBody } from "../index";

// Some stream.Readable-like object, such as node's `http.IncomingMessage`
const request = new IncomingMessage();

// Returns the body as a utf-8 encoded string
const body = await readBody(request, { limit: 1024 });
console.log(body);
```

## Implementation

The implementation of this library is based on the [raw-body][node-raw-body]
package. Licensed MIT with licenses included in our source code.

We've chosen to re-implement the logic to read the body from the stream to keep
the dependency tree for our packages as light as possible. Our implementation only
provides the functionality that we need, specifically it excludes the functionality
to return the stream as a buffer and always parses it as a utf-8 string. The interface
was also changed to only support promises rather than the sync implementation provided by `raw-body`.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[node-raw-body]: https://github.com/stream-utils/raw-body/blob/191e4b6506dcf77198eed01c8feb4b6817008342/test/index.js
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
