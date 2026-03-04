<!-- trunk-ignore-all(markdownlint/MD024) -->
<!-- trunk-ignore-all(markdownlint/MD001) -->

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

## Use

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

## API

This package exports the identifiers
[`bool`][api-bool],
[`hash`][api-hash],
[`makeHasher`][api-make-hasher],
[`stringSliceOrdered`][api-string-slice-ordered],
[`string`][api-string], and
[`uint32`][api-uint32].
There is no default export.

This package exports the [TypeScript][] types
[`FieldHasher`][api-field-hasher] and
[`StringWriter`][api-string-writer].

### `FieldHasher`

This type represents a function that hashes a single field. You get one of
these back from `bool`, `string`, `stringSliceOrdered`, and `uint32`.

###### Type

```ts
type FieldHasher = (data: StringWriter) => void;
```

### `StringWriter`

This type represents a writer that the hasher writes data into.

###### Fields

- `writeString(data: string): void`
  — writes data to the hash

### `bool(key, value)`

Creates a field hasher for a boolean value.

###### Parameters

- `key` (`string`)
  — the field name
- `value` (`boolean`)
  — the boolean value to hash

###### Returns

A field hasher ([`FieldHasher`][api-field-hasher]).

### `hash(…hashers)`

Hashes multiple fields together and returns a stable hash string. You pass
in the field hashers created by `bool`, `string`, `stringSliceOrdered`, and
`uint32`.

###### Parameters

- `hashers` ([`Array<FieldHasher>`][api-field-hasher])
  — the field hashers to combine

###### Returns

A `Promise` that resolves to the hash (`Promise<string>`).

### `makeHasher(subtle)`

Creates a new hash function using the provided `SubtleCrypto`
implementation. We use this internally to support different crypto
implementations across runtimes.

###### Parameters

- `subtle` (`SubtleCryptoLike`)
  — a `SubtleCrypto`-like implementation

###### Returns

A hash function ([`hash`][api-hash]).

### `stringSliceOrdered(key, values)`

Creates a field hasher for an ordered array of strings.

###### Parameters

- `key` (`string`)
  — the field name
- `values` (`ReadonlyArray<string>`)
  — the string array to hash

###### Returns

A field hasher ([`FieldHasher`][api-field-hasher]).

### `string(key, value)`

Creates a field hasher for a string value.

###### Parameters

- `key` (`string`)
  — the field name
- `value` (`string`)
  — the string value to hash

###### Returns

A field hasher ([`FieldHasher`][api-field-hasher]).

### `uint32(key, value)`

Creates a field hasher for an unsigned 32-bit integer.

###### Parameters

- `key` (`string`)
  — the field name
- `value` (`number`)
  — the integer value to hash

###### Returns

A field hasher ([`FieldHasher`][api-field-hasher]).

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

Derivative work based on [`feross/buffer`][github-buffer] licensed under
[MIT][github-buffer-license] © Feross Aboukhadijeh and contributors.
Our work picks its internal hex encoding logic adjusted for our use.

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-bool]: #boolkey-value
[api-field-hasher]: #fieldhasher
[api-hash]: #hashhashers
[api-make-hasher]: #makehashersubtle
[api-string-slice-ordered]: #stringsliceorderedkey-value
[api-string-writer]: #stringwriter
[api-string]: #stringkey-value
[api-uint32]: #uint32key-value
[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[github-buffer-license]: https://github.com/feross/buffer/blob/5857e295f4d37e3ad02c3abcbf7e8e5ef51f3be6/LICENSE
[github-buffer]: https://github.com/feross/buffer/tree/5857e295f4d37e3ad02c3abcbf7e8e5ef51f3be6
[typescript]: https://www.typescriptlang.org/
