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

## Implementation

This package uses the Wasm bindings provided by `@arcjet/analyze-wasm` to
call various functions that are exported by our wasm bindings.

We chose to put this logic in a separate package because we need to change the
import structure for each runtime that we support in the wasm bindings. Moving
this to a separate package allows us not to have to duplicate code while providing
a combined higher-level api for calling our core functionality in Wasm.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
