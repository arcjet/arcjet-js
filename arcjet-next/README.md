<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
  </picture>
</a>

# `@arcjet/next`

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
    <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
  </picture>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification & defend
against common attacks.

This is the [Arcjet][arcjet] SDK for the [Next.js][next-js] framework.

## Getting started

Visit [docs.arcjet.com](https://docs.arcjet.com/get-started/nextjs) to get
started.

## Installation

```shell
npm install -S @arcjet/next
```

## Example

```ts
import arcjet from "@arcjet/next";
import { NextApiRequest, NextApiResponse } from "next";

const aj = arcjet({
  // Get your site key from https://app.arcjet.com
  // and set it as an environment variable rather than hard coding.
  // See: https://nextjs.org/docs/app/building-your-application/configuring/environment-variables
  key: process.env.AJ_KEY,
  rules: [],
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const decision = await aj.protect(req);

  if (decision.isDenied()) {
    return res
      .status(403)
      .json({ error: "Forbidden", reason: decision.reason });
  }

  res.status(200).json({ name: "Hello world" });
}
```

## API

Reference documentation is available at [docs.arcjet.com][next-sdk-docs].

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[next-js]: https://nextjs.org/
[next-sdk-docs]: https://docs.arcjet.com/reference/nextjs
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
