<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/tsconfig`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/tsconfig">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Ftsconfig?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Ftsconfig?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Custom tsconfig for [Arcjet][arcjet] projects.

- [npm package (`@arcjet/tsconfig`)](https://www.npmjs.com/package/@arcjet/tsconfig)
- [GitHub source code (`tsconfig/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/tsconfig)

## Installation

```shell
npm install -D @arcjet/tsconfig
```

## Example

In your `tsconfig.json` file:

```json
{
  "extends": "@arcjet/tsconfig/base",
  "include": ["*.ts"]
}
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
