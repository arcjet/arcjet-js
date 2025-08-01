<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/redact-wasm`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/redact-wasm">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fredact-wasm?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fredact-wasm?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] sensitive information redaction detection engine.

- [npm package (`@arcjet/redact-wasm`)](https://www.npmjs.com/package/@arcjet/redact-wasm)
- [GitHub source code (`redact-wasm/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/redact-wasm)

## What is this?

This package provides logic in WebAssembly to locally redact sensitive info.
The files here are generated.
They are wrapped up into [`@arcjet/redact`][github-arcjet-redact] for use in
JavaScript.
For more info on why we maintain our WebAssembly and JavaScript projects like
this,
see [“What is this?” in the readme of
`@arcjet/analyze-wasm`][github-arcjet-analyze-wasm-what].

## When should I use this?

You should not use this but use [`@arcjet/redact`][github-arcjet-redact] instead.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/redact-wasm
```

## Use

Use [`@arcjet/redact`][file-redact] instead.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[file-redact]: ../redact/
[github-arcjet-analyze-wasm-what]: https://github.com/arcjet/arcjet-js/tree/main/analyze-wasm#what-is-this
[github-arcjet-redact]: https://github.com/arcjet/arcjet-js/tree/main/redact
