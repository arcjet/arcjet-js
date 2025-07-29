<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/next`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/next">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnext?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Bot detection. Rate limiting. Email validation. Attack protection. Data
redaction. A developer-first approach to security.

This is the [Arcjet][arcjet] SDK for the [Next.js][next-js] framework. **Find
our other [SDKs on GitHub][sdks-github]**.

- [npm package (`@arcjet/next`)](https://www.npmjs.com/package/@arcjet/next)
- [GitHub source code (`arcjet-next/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-next)

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## Features

Arcjet security features for protecting Next.js apps:

- 🤖 [Bot protection][bot-protection-quick-start] - manage traffic by automated
  clients and bots.
- 🛑 [Rate limiting][rate-limiting-quick-start] - limit the number of requests a
  client can make.
- 🛡️ [Shield WAF][shield-quick-start] - protect your application against common
  attacks.
- 📧 [Email validation][email-validation-quick-start] - prevent users from
  signing up with fake email addresses.
- 📝 [Signup form protection][signup-protection-quick-start] - combines rate
  limiting, bot protection, and email validation to protect your signup forms.
- 🕵️‍♂️ [Sensitive information detection][sensitive-info-quick-start] - block
  personally identifiable information (PII).
- 🚅 [Nosecone][nosecone-quick-start] - set security headers such as
  `Content-Security-Policy` (CSP).

## Quick start

This example will protect a Next.js API route with a rate limit, bot detection,
and Shield WAF.

You can also find this [quick start guide][quick-start] in the docs.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/next
```

## Use

```ts
import arcjet, { shield } from "@arcjet/next";
import { NextResponse } from "next/server";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  key: arcjetKey,
  rules: [
    // Shield protects your app from common attacks.
    // Use `DRY_RUN` instead of `LIVE` to only log.
    shield({ mode: "LIVE" }),
  ],
});

export async function GET(request: Request) {
  const decision = await aj.protect(request);

  if (decision.isDenied()) {
    return NextResponse.json({ message: "Forbidden" }, { status: 429 });
  }

  return NextResponse.json({ message: "Hello world" });
}
```

For more on how to configure Arcjet with Next.js and how to protect Next,
see the [Arcjet Next.js SDK reference][arcjet-reference-next] on our website.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet-reference-next]: https://docs.arcjet.com/reference/nextjs
[arcjet]: https://arcjet.com
[next-js]: https://nextjs.org/
[quick-start]: https://docs.arcjet.com/get-started?f=next-js
[example-url]: https://example.arcjet.com
[example-source]: https://github.com/arcjet/arcjet-js-example
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[bot-protection-quick-start]: https://docs.arcjet.com/bot-protection/quick-start?f=next-js
[rate-limiting-quick-start]: https://docs.arcjet.com/rate-limiting/quick-start?f=next-js
[shield-quick-start]: https://docs.arcjet.com/shield/quick-start?f=next-js
[email-validation-quick-start]: https://docs.arcjet.com/email-validation/quick-start?f=next-js
[signup-protection-quick-start]: https://docs.arcjet.com/signup-protection/quick-start?f=next-js
[sensitive-info-quick-start]: https://docs.arcjet.com/sensitive-info/quick-start?f=next-js
[nosecone-quick-start]: https://docs.arcjet.com/nosecone/quick-start?f=next-js
[sdks-github]: https://github.com/arcjet
