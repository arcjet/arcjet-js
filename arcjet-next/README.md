<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
  </picture>
</a>

# `@arcjet/next`

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/%E2%9C%A6Aj-1.0.0--alpha.1-5C5866?style=flat-square&labelColor=000000">
    <img src="https://img.shields.io/badge/%E2%9C%A6Aj-1.0.0--alpha.1-ECE6F0?style=flat-square&labelColor=ECE6F0">
  </picture>
</p>

[Arcjet][arcjet] helps developers protect their apps. Installed as an SDK, it
provides a set of core primitives such as rate limiting and bot protection.
These can be used independently or combined to create a set of layered defenses,
such as signup form protection.

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
  key: "ajkey_yourkey",
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
