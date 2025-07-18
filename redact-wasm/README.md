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

## Installation

```shell
npm install -S @arcjet/redact-wasm
```

## Use

Use [`@arcjet/redact`][file-redact] instead.

## Implementation

This package provides sensitive information identification and redaction logic implemented as a
WebAssembly module which will run local analysis on the provided string.

The generated `_virtual/arcjet_analyze_bindings_redact.component.js` file contains the binary inlined as
a base64 [Data URL][mdn-data-url] with the `application/wasm` MIME type.

This was chosen to save on storage space over inlining the file directly as a
Uint8Array, which would take up ~3x the space of the Wasm file. See
[Better Binary Batter: Mixing Base64 and Uint8Array][wasm-base64-blog] for more
details.

It is then decoded into an ArrayBuffer to be used directly via WebAssembly's
`compile()` function in our entry point file.

This is all done to avoid trying to read or bundle the Wasm asset in various
ways based on the platform or bundler a user is targeting. One example being
that Next.js requires special `asyncWebAssembly` webpack config to load our
Wasm file if we don't do this.

In the future, we hope to do away with this workaround when all bundlers
properly support consistent asset bundling techniques.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[file-redact]: ../redact/
[mdn-data-url]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs
[wasm-base64-blog]: https://blobfolio.com/2019/better-binary-batter-mixing-base64-and-uint8array/
