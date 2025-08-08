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

## What is this?

This is an internal utility to help us create stable hashes.
It’s super minimal and matches similar internal code in other languages.
This exists to make sure things work the same across languages.

## When should I use this?

This is an internal Arcjet package not designed for public use.
See our [_Get started_ guide][arcjet-get-started] for how to use Arcjet in your
application.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/stable-hash
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

Derivative work based on [`feross/buffer`][github-buffer] licensed under
[MIT][github-buffer-license] © Feross Aboukhadijeh and contributors.
Our work picks its internal hex encoding logic adjusted for our use.

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[github-buffer-license]: https://github.com/feross/buffer/blob/5857e295f4d37e3ad02c3abcbf7e8e5ef51f3be6/LICENSE
[github-buffer]: https://github.com/feross/buffer/tree/5857e295f4d37e3ad02c3abcbf7e8e5ef51f3be6
