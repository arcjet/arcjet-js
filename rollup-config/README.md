<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
  </picture>
</a>

# `@arcjet/rollup-config`

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/%E2%9C%A6Aj-1.0.0--alpha.0-5C5866?style=flat-square&labelColor=000000">
    <img src="https://img.shields.io/badge/%E2%9C%A6Aj-1.0.0--alpha.0-ECE6F0?style=flat-square&labelColor=ECE6F0">
  </picture>
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
