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

- [npm package (`@arcjet/stable-hash`)](https://www.npmjs.com/package/@arcjet/stable-hash)
- [GitHub source code (`stable-hash/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/stable-hash)

## Installation

```shell
npm install -S @arcjet/stable-hash
```

## Example

```ts
import * as hasher from "@arcjet/stable-hash";

const id = await hasher.hash(
  hasher.string("type", "EMAIL"),
  hasher.uint32("version", 0),
  hasher.string("mode", "LIVE"),
  hasher.stringSliceOrdered("allow", []),
  hasher.stringSliceOrdered("deny", []),
);

console.log(id);
// => 49573b7df8d854c2cd5d8a755a4c03aff4014493a41b963490861a279ad675b2
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
