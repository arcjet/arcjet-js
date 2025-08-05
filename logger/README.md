<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
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

[Arcjet][arcjet] lightweight logger which mirrors the [Pino][pino-api]
structured logger interface.

- [npm package (`@arcjet/logger`)](https://www.npmjs.com/package/@arcjet/logger)
- [GitHub source code (`logger/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/logger)

## What is this?

This is an internal utility to help us log things.
It provides a small interface, a bit like [Pino][github-pino],
so that users with custom needs can swap it for their own logger.

## When should I use this?

You should probably not use this but use one of the alternatives instead.
This package matches our current needs which are likely different from yours.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/logger
```

## Example

```ts
import { Logger } from "@arcjet/logger";

const logger = new Logger({ level: "debug" });

logger.debug("only printed in debug mode");
// Logs ✦Aj DEBUG only printed in debug mode

logger.error("%d + %d = %d", 1, 2, 3);
// Logs ✦Aj ERROR 1 + 2 = 3
```

## Log levels

Log levels can be changed by setting the `ARCJET_LOG_LEVEL` environment variable
to one of: `"DEBUG"`, `"LOG"`, `"WARN"`, or `"ERROR"`.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[github-pino]: https://github.com/pinojs/pino
[pino-api]: https://github.com/pinojs/pino/blob/8db130eba0439e61c802448d31eb1998cebfbc98/docs/api.md#logger
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
