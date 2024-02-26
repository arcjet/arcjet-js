<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
  </picture>
</a>

# `@arcjet/logger`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/logger">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Flogger?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Flogger?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] logging interface which mirrors the `console` interface but
allows log levels.

## Installation

```shell
npm install -S @arcjet/logger
```

## Example

```ts
import logger from "@arcjet/logger";

logger.debug("only printed in debug mode");
logger.log("only printed in log mode");
logger.warn("printed in default mode");
// printf-style printing
logger.error("printed always: %s", new Error("oops"));
```

## Log levels

Log levels can be changed by setting the `ARCJET_LOG_LEVEL` environment variable
to one of: `"DEBUG"`, `"LOG"`, `"WARN"`, or `"ERROR"`.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
