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

## What is this?

Nosecone makes it easy to add and configure security headers.
This package exists so that you can secure your server even if you do not use
Arcjet.

## When should I use this?

You can use this package with or without Arcjet to protect your server.
You can use `@nosecone/next` or `@nosecone/sveltekit` if you are using those
frameworks.

<!-- TODO(@wooorm-arcjet): discuss when someone should use Helmet instead. -->

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

Derivative work based on
[`josh-hemphill/csp-typed-directives`][github-csp-typed-directives]
licensed under
[MIT][github-csp-typed-directives-license] © Joshua Hemphill and
Tecnico Corporation.
Our work picks the couple types the we need.
It is also based on
[`helmetjs/helmet`][github-helmet] licensed under
[MIT][github-helmet-license] © Evan Hahn and Adam Baldwin.
We were inspired by their defaults.

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[github-csp-typed-directives-license]: https://github.com/josh-hemphill/csp-typed-directives/blob/6e2cbc6d3cc18bbdc9b13d42c4556e786e28b243/LICENSE
[github-csp-typed-directives]: https://github.com/josh-hemphill/csp-typed-directives/tree/6e2cbc6d3cc18bbdc9b13d42c4556e786e28b243
[github-helmet-license]: https://github.com/helmetjs/helmet/blob/9a8e6d5322aad6090394b0bb2e81448c5f5b3e74/LICENSE
[github-helmet]: https://github.com/helmetjs/helmet/tree/9a8e6d5322aad6090394b0bb2e81448c5f5b3e74
