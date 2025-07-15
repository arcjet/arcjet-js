<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/rollup-config`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/rollup-config">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Frollup-config?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Frollup-config?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Custom rollup config for [Arcjet][arcjet] projects.

- [npm package (`@arcjet/rollup-config`)](https://www.npmjs.com/package/@arcjet/rollup-config)
- [GitHub source code (`rollup-config/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/rollup-config)

## Installation

```shell
npm install -D @arcjet/rollup-config
```

## Example

In your `rollup.config.js` file:

```ts
import { createConfig } from "@arcjet/rollup-config";

export default createConfig(import.meta.url);
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
