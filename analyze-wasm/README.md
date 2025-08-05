<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/analyze-wasm`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/analyze-wasm">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fanalyze-wasm?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fanalyze-wasm?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This package provides WebAssembly bindings to [Arcjet's][arcjet] local analysis engine.

- [npm package (`@arcjet/analyze-wasm`)](https://www.npmjs.com/package/@arcjet/analyze-wasm)
- [GitHub source code (`analyze-wasm/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/analyze-wasm)

## What is this?

This package provides logic in WebAssembly to locally analyze requests.

To load these binary files everywhere until something like
[_Import Bytes_][tc39-proposal-import-bytes] is available,
we settled on a technique that seems to work well everywhere.
This technique gives us compatibility with for example Next.js which right now
requires a special experimental `asyncWebAssembly` webpack configuration,

The file `_virtual/arcjet_analyze_js_req.component.core.js` contains the
WebAssembly inlined as a [`data:` URL][mdn-data-url].
This is about 3 times smaller than using a `Uint8Array` (see
[_Better Binary Batter: Mixing Base64 and Uint8Array_][wasm-base64-blog] for more
info).
That URL is then turned into an `ArrayBuffer` and passed to
`WebAssembly.compile`.

The files here are generated.
They are wrapped up into [`@arcjet/analyze`][github-arcjet-analyze] for use in
JavaScript,
in turn exposed in our core package
([`arcjet`][github-arcjet-arcjet])
and our adapters (such as `@arcjet/next`).

<!-- TODO(@wooorm-arcjet): link `adapters` above when the main repo is up to date. -->

## When should I use this?

This is an internal Arcjet package not designed for public use.
See our [_Get started_ guide][arcjet-get-started] for how to use Arcjet in your
application.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/analyze-wasm
```

## Use

Use [`@arcjet/analyze`][file-analyze] instead.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[file-analyze]: ../analyze/
[mdn-data-url]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs
[wasm-base64-blog]: https://blobfolio.com/2019/better-binary-batter-mixing-base64-and-uint8array/
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[github-arcjet-analyze]: https://github.com/arcjet/arcjet-js/tree/main/analyze
[tc39-proposal-import-bytes]: https://github.com/tc39/proposal-import-bytes
