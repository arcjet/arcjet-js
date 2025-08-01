<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/redact`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/redact">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fredact?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fredact?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] TypeScript and JavaScript sensitive information
redaction library.

- [npm package (`@arcjet/redact`)](https://www.npmjs.com/package/@arcjet/redact)
- [GitHub source code (`redact/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/redact)

## What is this?

This package provides functionality to redact sensitive info.
The work is done in WebAssembly but is called here from JavaScript.

The WebAssembly files are in [`@arcjet/redact-wasm`][github-arcjet-redact-wasm].
For more info on why we maintain our WebAssembly and JavaScript projects like
this,
see [“What is this?” in the readme of
`@arcjet/analyze-wasm`][github-arcjet-analyze-wasm-what].

## When should I use this?

You can use this package to redact sensitive information locally.
You can redact email addresses, credit card numbers, and more.
It is also possible to reverse the process: to un-redact what was found.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/redact
```

## Reference

The full reference documentation can be found in the [Arcjet docs][redact-ref].

## Use

```ts
import { redact } from "@arcjet/redact";

const value = "Hi, my name is John and my email adress is john@example.com";

const [redacted, unredact] = await redact(value, {
  entities: ["email", "phone-number"],
});
console.log(redacted);
// => "Hi, my name is John and my email adress is <Redacted email #0>"

const unredacted = unredact("Your email address is <Redacted email #0>");
console.log(unredacted); // "Your email address is john@example.com"
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[redact-ref]: https://docs.arcjet.com/redact/reference
[github-arcjet-analyze-wasm-what]: https://github.com/arcjet/arcjet-js/tree/main/analyze-wasm#what-is-this
[github-arcjet-redact-wasm]: https://github.com/arcjet/arcjet-js/tree/main/redact-wasm
