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

## Implementation

Improvements of this library were informed by [std-env], which is licensed MIT
with licenses included in our source code.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[runtime-keys]: https://runtime-keys.proposal.wintercg.org/
[wintercg]: https://wintercg.org/
[std-env]: https://github.com/unjs/std-env
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
