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

- [npm package (`@arcjet/duration`)](https://www.npmjs.com/package/@arcjet/duration)
- [GitHub source code (`duration/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/duration)

## What is this?

This is an internal utility that exists so our users can pass meaningful
duration strings such as `1h` instead of having to manually calculate seconds
or milliseconds.
We turned the Go [`ParseDuration`][go-parser] into TypeScript so that we have
the exact same functionality in both languages.

## When should I use this?

You should not use this but use one of the many alternatives such as
[`vercel/ms`][github-vercel-ms].
This package matches our current needs which are likely different from yours.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/duration
```

## Example

```ts
import { parse } from "@arcjet/duration";

const seconds = parse("1h");
console.log(seconds); // prints 3600
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

Derivative work based on [`time.ParseDuration`][go-parse-duration] from
`golang/go` licensed under [BSD-3.0][go-parse-duration-license] © The Go Authors.
Our work ports to TypeScript.

[arcjet]: https://arcjet.com
[go-parse-duration-license]: https://github.com/golang/go/blob/c18ddc84e/LICENSE
[go-parse-duration]: https://github.com/golang/go/blob/c18ddc84e/src/time/format.go#L1589-L1686
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[github-vercel-ms]: https://github.com/vercel/ms
