<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/eslint-config`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/eslint-config">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Feslint-config?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Feslint-config?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Custom eslint config for [Arcjet][arcjet] projects.

- [npm package (`@arcjet/eslint-config`)](https://www.npmjs.com/package/@arcjet/eslint-config)
- [GitHub source code (`eslint-config/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/eslint-config)

## Installation

```shell
npm install -D @arcjet/eslint-config
```

## Example

In your `.eslintrc.cjs` file:

```ts
module.exports = {
  root: true,
  extends: ["@arcjet/eslint-config"],
};
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
