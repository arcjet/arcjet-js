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

## Installation

```shell
npm install -S @arcjet/transport
```

## Example

```ts
import { createTransport } from "@arcjet/transport";

// The tranport can be used with the Arcjet protocol's `createClient` function.
const transport = createTransport("https://decide.arcjet.com");
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
