<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/protocol`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/protocol">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fprotocol?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fprotocol?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

The TypeScript & JavaScript interface into the [Arcjet][arcjet] protocol.

- [npm package (`@arcjet/protocol`)](https://www.npmjs.com/package/@arcjet/protocol)
- [GitHub source code (`protocol/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/protocol)

## What is this?

This package provides access to our protocol.
It talks with our API from JavaScript.

## When should I use this?

This is an internal Arcjet package not designed for public use.
See our [_Get started_ guide][arcjet-get-started] for how to use Arcjet in your
application.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/protocol
```

## Example

```ts
import { botCategories } from "@arcjet/protocol";

console.log(botCategories);
// ==> {
//   'CATEGORY:ACADEMIC': [
//     'BLACKBOARD_CRAWLER',
//     'CISPA_CRAWLER',
//     'COMMONCRAWL_CRAWLER',
//     …
```

## API

In progress.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
