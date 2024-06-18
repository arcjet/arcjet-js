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

## Installation

```shell
npm install -S @arcjet/env
```

## Example

```ts
import * as env from "@arcjet/env";

env.platform({ FLY_APP_NAME: "foobar" }) === "fly-io";
env.platform({}) === undefined;

env.isDevelopment({ NODE_ENV: "production" }) === false;
env.isDevelopment({ NODE_ENV: "development" }) === true;
env.isDevelopment({ ARCJET_ENV: "production" }) === false;
env.isDevelopment({ ARCJET_ENV: "development" }) === true;

env.logLevel({ ARCJET_LOG_LEVEL: "debug" }) === "debug";
env.logLevel({ ARCJET_LOG_LEVEL: "info" }) === "info";
env.logLevel({ ARCJET_LOG_LEVEL: "warn" }) === "warn";
env.logLevel({ ARCJET_LOG_LEVEL: "error" }) === "error";
env.logLevel({ ARCJET_LOG_LEVEL: "" }) === "warn"; // default

// Will use various environment variables to detect the proper base URL
env.baseUrl(process.env);

env.apiKey({ ARCJET_KEY: "ajkey_abc123" }) === "ajkey_abc123";
env.apiKey({ ARCJET_KEY: "invalid" }) === undefined;
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
