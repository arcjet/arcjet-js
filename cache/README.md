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

## Installation

```shell
npm install -S @arcjet/cache
```

## Example

```ts
import { MemoryCache } from "@arcjet/cache";

const cache = new MemoryCache();

const namespace = "myNamespace";
const key = "myKey";

const ttlSeconds = 60; // seconds

const valueToCache = 1;

cache.set(namespace, key, valueToCache, ttlSeconds);

const [cachedValue, ttl] = await cache.get(namespace, key);
if (cachedValue && ttl > 0) {
  // do something with cached value
}
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
