<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/inspect`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/inspect">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Finspect?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Finspect?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] utilities for inspecting decisions made by an SDK.

## Installation

```shell
npm install -S @arcjet/inspect
```

## Example

```ts
import arcjet, { detectBot } from "@arcjet/next";
import { isSpoofedBot, isMissingUserAgent } from "@arcjet/inspect";
import { NextApiRequest, NextApiResponse } from "next";

const aj = arcjet({
  key: process.env.ARCJET_KEY!, // Get your site key from https://app.arcjet.com
  rules: [
    detectBot({
      mode: "LIVE", // will block requests. Use "DRY_RUN" to log only
      allow: [], // "allow none" will block all detected bots
    }),
  ],
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // We expect all non-bot clients to have the User-Agent header
  if (decision.results.some(isMissingUserAgent)) {
    return res.status(403).json({ error: "You are a bot!" });
  }

  if (decision.results.some(isSpoofedBot)) {
    return res
      .status(403)
      .json({ error: "You are pretending to be a good bot!" });
  }

  res.status(200).json({ name: "Hello world" });
}
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
