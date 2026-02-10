<!-- trunk-ignore-all(markdownlint/MD024) -->
<!-- trunk-ignore-all(markdownlint/MD001) -->

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

## Use

```ts
import process from "node:process";
import { baseUrl, isDevelopment, logLevel, platform } from "@arcjet/env";

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
```

## API

This package exports the identifiers
[`baseUrl`][api-base-url],
[`isDevelopment`][api-is-development],
[`logLevel`][api-log-level], and
[`platform`][api-platform].
There is no default export.

This package exports the [TypeScript][] types
[`Env`][api-env] and
[`Platform`][api-platform-type].

### `Env`

Environment (TypeScript type).

###### Type

```ts
export type Env = {
  [key: string]: unknown;
  ARCJET_BASE_URL?: string | undefined;
  ARCJET_ENV?: string | undefined;
  ARCJET_LOG_LEVEL?: string | undefined;
  FIREBASE_CONFIG?: string | undefined;
  FLY_APP_NAME?: string | undefined;
  MODE?: string | undefined;
  NODE_ENV?: string | undefined;
  RENDER?: string | undefined;
  VERCEL?: string | undefined;
};
```

### `Platform`

Platform name (TypeScript type).

###### Type

```ts
type Platform = "firebase" | "fly-io" | "render" | "vercel";
```

### `baseUrl(environment)`

Get the base URL of an Arcjet API.

###### Parameters

- `environment` ([`Env`][api-env])
  — environment

###### Returns

Base URL of Arcjet API (`string`).

### `isDevelopment(environment)`

Check if the environment is development.

###### Parameters

- `environment` ([`Env`][api-env])
  — environment

###### Returns

Whether the environment is development (`boolean`).

### `logLevel(environment)`

Get the log level.

###### Parameters

- `environment` ([`Env`][api-env])
  — environment

###### Returns

Log level (`"debug" | "error" | "info" | "warn"`).

### `platform(environment)`

Detect the platform.

###### Parameters

- `environment` ([`Env`][api-env])
  — environment

###### Returns

Name of platform if found ([`Platform`][api-platform]).

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-env]: #env
[api-base-url]: #baseurlenvironment
[api-is-development]: #isdevelopmentenvironment
[api-log-level]: #loglevelenvironment
[api-platform-type]: #platform
[api-platform]: #platformenvironment
[typescript]: https://www.typescriptlang.org/
