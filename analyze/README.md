<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/analyze`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/analyze">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fanalyze?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fanalyze?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] local analysis engine.

- [npm package (`@arcjet/analyze`)](https://www.npmjs.com/package/@arcjet/analyze)
- [GitHub source code (`analyze/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/analyze)

## What is this?

This package provides functionality to analyze requests.
The work is done in WebAssembly but is called here from JavaScript.
The functionality is wrapped up into rules in our core package
([`arcjet`][github-arcjet-arcjet]),
in turn exposed from our adapters (such as `@arcjet/next`).

<!-- TODO(@wooorm-arcjet): link `adapters` above when the main repo is up to date. -->

The WebAssembly files are in
[`@arcjet/analyze-wasm`][github-arcjet-analyze-wasm].
They are separate because we need to change the import structure for each
runtime that we support in the bindings.
Separate packages lets us not duplicate code while providing a combined
higher-level API for calling our core functionality.

## When should I use this?

This is an internal Arcjet package not designed for public use.
See our [_Get started_ guide][arcjet-get-started] for how to use Arcjet in your
application.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/analyze
```

## Use

```js
import { generateFingerprint, isValidEmail } from "@arcjet/analyze";

const fingerprint = await generateFingerprint(
  { characteristics: [] },
  { ip: "127.0.0.1" },
);
console.log(fingerprint);
// => "fp::2::0d219da6100b99f95cf639b77e088c6df3c096aa5fd61dec5287c5cf94d5e545"

const result = await isValidEmail({}, "hello@example.com", {
  tag: "allow-email-validation-config",
  val: {
    allowDomainLiteral: false,
    allow: [],
    requireTopLevelDomain: true,
  },
});
console.log(result);
// => { blocked: [], validity: "valid" }
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[github-arcjet-analyze-wasm]: https://github.com/arcjet/arcjet-js/tree/main/analyze-wasm
[github-arcjet-arcjet]: https://github.com/arcjet/arcjet-js/tree/main/arcjet
