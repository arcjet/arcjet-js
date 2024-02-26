<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
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

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
