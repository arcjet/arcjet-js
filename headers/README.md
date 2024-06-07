<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/headers`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/headers">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fheaders?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fheaders?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] extension of the Headers class.

## Installation

```shell
npm install -S @arcjet/headers
```

## Example

```ts
import ArcjetHeaders from "@arcjet/headers";

const headers = new ArcjetHeaders({ abc: "123" });

console.log(headers.get("abc"));
```

## Considerations

This package will filter the `cookie` header and all headers with keys or values
that are not strings, such as `{ "abc": undefined }`.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
