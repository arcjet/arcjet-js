<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/env`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/env">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fenv?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fenv?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] environment detection.

Currently operates on an environment object with the type:

```ts
type Env = {
  FLY_APP_NAME?: string;
  NODE_ENV?: string;
  ARCJET_KEY?: string;
  ARCJET_ENV?: string;
  ARCJET_LOG_LEVEL?: string;
  ARCJET_BASE_URL?: string;
};
```

- [npm package (`@arcjet/env`)](https://www.npmjs.com/package/@arcjet/env)
- [GitHub source code (`env/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/env)

## What is this?

This is a utility that reads configuration for us from `process.env` and
similar.
It exists so that we can access that configuration throughout our packages.

## When should I use this?

You should probably not use this but there are some edge cases where we let
users swap more advanced features out and then it may be useful.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/env
```

## Example

```ts
import process from "node:process";
import {
  apiKey,
  baseUrl,
  isDevelopment,
  logLevel,
  platform,
} from "@arcjet/env";

console.log(platform({ FLY_APP_NAME: "foobar" })); // => "fly-io"
console.log(platform({})); // => undefined
console.log(isDevelopment({ NODE_ENV: "production" })); // => false
console.log(isDevelopment({ NODE_ENV: "development" })); // => true
console.log(isDevelopment({ ARCJET_ENV: "production" })); // => false
console.log(isDevelopment({ ARCJET_ENV: "development" })); // => true
console.log(logLevel({ ARCJET_LOG_LEVEL: "debug" })); // => "debug"
console.log(logLevel({ ARCJET_LOG_LEVEL: "info" })); // => "info"
console.log(logLevel({ ARCJET_LOG_LEVEL: "warn" })); // => "warn"
console.log(logLevel({ ARCJET_LOG_LEVEL: "error" })); // => "error"
console.log(logLevel({ ARCJET_LOG_LEVEL: "" })); // => "warn"
console.log(baseUrl(process.env)); // => "https://decide.arcjet.com"
console.log(apiKey({ ARCJET_KEY: "ajkey_abc123" })); // => "ajkey_abc123"
console.log(apiKey({ ARCJET_KEY: "invalid" })); // => undefined
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
