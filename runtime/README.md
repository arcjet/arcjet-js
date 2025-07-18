<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/runtime`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/runtime">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fruntime?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fruntime?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] runtime detection.

This package attempts to discover and provide [runtime keys][runtime-keys] as
defined by the [WinterCG][wintercg].

- [npm package (`@arcjet/runtime`)](https://www.npmjs.com/package/@arcjet/runtime)
- [GitHub source code (`runtime/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/runtime)

## Installation

```shell
npm install -S @arcjet/runtime
```

## Example

```ts
import { runtime, hasWebAssembly } from "@arcjet/runtime";

runtime() === "node"; // in Node.js
runtime() === "bun"; // in Bun.sh
runtime() === "edge-light"; // in Vercel Edge
runtime() === "workerd"; // in Cloudflare Workers
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

Derivative work based on [`std-env`][std-env] licensed under
[MIT][std-env-license] © Pooya Parsa.
Our work cherry picks only what we need.

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[runtime-keys]: https://runtime-keys.proposal.wintercg.org/
[wintercg]: https://wintercg.org/
[std-env-license]: https://github.com/unjs/std-env/blob/7e8cb7b/LICENCE
[std-env]: https://github.com/unjs/std-env/blob/d57a5d8/src/runtimes.ts
