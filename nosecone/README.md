<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `nosecone`

<p>
  <a href="https://www.npmjs.com/package/nosecone">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/nosecone?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/nosecone?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Protect your `Response` with secure headers.

- [npm package (`nosecone`)](https://www.npmjs.com/package/nosecone)
- [GitHub source code (`nosecone/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/nosecone)

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install nosecone
```

## Example

```ts
import nosecone from "nosecone";

const response = new Response(null, { headers: nosecone() });

console.log(response);
// => Response {
//   status: 200,
//   statusText: '',
//   headers: Headers {
//     'content-security-policy': "base-uri 'none'; …",
//     …
//   }
//   …
// }
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
