<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/cache`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/cache">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fcache?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fcache?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] cache interface and implementations.

- [npm package (`@arcjet/cache`)](https://www.npmjs.com/package/@arcjet/cache)
- [GitHub source code (`cache/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/cache)

## What is this?

This is an internal utility to help us cache some things in memory.

## When should I use this?

This is an internal Arcjet package not designed for public use.
See our [_Get started_ guide][arcjet-get-started] for how to use Arcjet in your
application.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/cache
```

## Use

```ts
import { setTimeout } from "node:timers/promises";
import { MemoryCache } from "@arcjet/cache";

const cache = new MemoryCache<string>();

cache.set("namespace", "key", "value", 2);

console.log(await cache.get("namespace", "key"));
// => [ 'value', 2 ]

await setTimeout(2001);

console.log(await cache.get("namespace", "key"));
// => [ undefined, 0 ]
```

## API

### `MemoryCache#constructor()`

Instantiate the `MemoryCache` using `new MemoryCache()` without any arguments.

### `MemoryCache#get(namespace: string, key: string): Promise<[T | undefined, number]>`

Attempts to retrieve a value from the cache. If a value exists, it will be
returned with the remaining time-to-live (in seconds).

Non-string arguments will cause the returned promise to reject.

### `MemoryCache#set(namespace: string, key: string, value: T, ttl: number): void`

Makes a best attempt at storing the value provided until the time-to-live
specified.

Non-string arguments will cause the function to throw.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
