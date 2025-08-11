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

## What is this?

This is an internal utility to help us figure out what platform we are running on.
It’s a fork of [`unjs/std-env`][std-env].
We chose to fork so that we can cut away functionality that we do not use
and keep our dependency tree as light as possible.
We only need the runtime detection.

## When should I use this?

You should not use this but use [`unjs/std-env`][std-env] or one of the
alternatives instead.
This package matches our current needs which are likely different from yours.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/runtime
```

## Use

```ts
import { runtime } from "@arcjet/runtime";

console.log(runtime()); // => "bun" or "node" and such
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
