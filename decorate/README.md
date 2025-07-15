<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/decorate`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/decorate">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fdecorate?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fdecorate?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] utilities for decorating responses with information.

- [npm package (`@arcjet/decorate`)](https://www.npmjs.com/package/@arcjet/decorate)
- [GitHub source code (`decorate/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/decorate)

## Installation

```shell
npm install -S @arcjet/decorate
```

## Example

```ts
import arcjet, { fixedWindow } from "@arcjet/next";
import { setRateLimitHeaders } from "@arcjet/decorate";
import { NextApiRequest, NextApiResponse } from "next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    // Create a fixed window rate limit. Other algorithms are supported.
    fixedWindow({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      window: "1m", // 1 min fixed window
      max: 1, // allow a single request
    }),
  ],
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const decision = await aj.protect(req);

  setRateLimitHeaders(res, decision);

  if (decision.isDenied()) {
    return res.status(429).json({
      error: "Too Many Requests",
      reason: decision.reason,
    });
  }

  res.status(200).json({ name: "Hello world" });
}
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
