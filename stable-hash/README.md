<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/stable-hash`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/stable-hash">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fstable-hash?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fstable-hash?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] stable hashing utility.

## Installation

```shell
npm install -S @arcjet/stable-hash
```

## Example

```ts
import * as hasher from "@arcjet/stable-hash";

const id = hasher.hash(
  hasher.string("type", "EMAIL"),
  hasher.uint32("version", 0),
  hasher.string("mode", "LIVE"),
  hasher.stringSliceOrdered("allow", []),
  hasher.stringSliceOrdered("deny", []),
);
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
