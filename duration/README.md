<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/duration`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/duration">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fduration?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fduration?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] utilities for parsing duration strings.

## Installation

```shell
npm install -S @arcjet/duration
```

## Example

```ts
import { parse } from "@arcjet/duration";

const seconds = parse("1h");
console.log(seconds); // prints 3600
```

## Implementation

The implementation of this library is based on the [ParseDuration][go-parser]
function in the Go stdlib. Originally licensed BSD-3.0 with the license included
in our source code.

We've chosen the approach of porting this to TypeScript because our protocol
operates exclusively on unsigned 32-bit integers representing seconds. However,
we don't want to require our SDK users to manually calculate seconds. By
providing this utility, our SDK can accept duration strings and numbers while
normalizing the values for our protocol.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[go-parser]: https://github.com/golang/go/blob/c18ddc84e1ec6406b26f7e9d0e1ee3d1908d7c27/src/time/format.go#L1589-L1686
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
