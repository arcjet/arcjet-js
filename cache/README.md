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

## API

Caches implement the `Cache` interface over a specific type:

```ts
interface Cache<T = unknown> {
  /**
   * Attempts to retrieve a value from the cache. If a value exists, it will be
   * returned with the remaining time-to-live (in seconds).
   *
   * @param namespace A isolated segement of the cache where keys are tracked.
   * @param key The identifier used to retrieve the value.
   * @returns A promise for a 2-element tuple containing the value and TTL in
   * seconds. If no value is retrieved, the value will be `undefined` and the
   * TTL will be `0`.
   */
  get(namespace: string, key: string): Promise<[T | undefined, number]>;
  /**
   * If the cache implementation supports storing values, `set` makes a best
   * attempt at storing the value provided until the time-to-live specified.
   *
   * @param namespace A isolated segement of the cache where keys are tracked.
   * @param key The identifier used to store the value.
   * @param value The value to be stored under the key.
   * @param ttl The amount of seconds the value stays valid in the cache.
   */
  set(namespace: string, key: string, value: T, ttl: number): void;
}
```

One such implementation is provided as `MemoryCache`:

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
