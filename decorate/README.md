<!-- trunk-ignore-all(markdownlint/MD024) -->
<!-- trunk-ignore-all(markdownlint/MD001) -->

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

## What is this?

This is a utility that lets you decorate responses based on Arcjet decisions.
It currently supports experimental rate limit headers.

## When should I use this?

You can use this package if you use the rate limit rule and want to set
experimental `RateLimit-Policy` and `RateLimit` headers.
See [_RateLimit header fields for HTTP_ on `ietf.org`][ietf-rate-limit] for
more info.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/decorate
```

## Use

```ts
import http from "node:http";
import { setRateLimitHeaders } from "@arcjet/decorate";
import arcjet, { shield } from "@arcjet/node";

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

const server = http.createServer(async function (
  request: http.IncomingMessage,
  response: http.ServerResponse,
) {
  const decision = await aj.protect(request);

  setRateLimitHeaders(response, decision);

  if (decision.isDenied()) {
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Forbidden" }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "Hello world" }));
});

server.listen(8000);
```

## API

This package exports the identifier
[`setRateLimitHeaders`][api-set-rate-limit-headers].
There is no default export.

This package exports the [TypeScript][] type
[`ArcjetCanDecorate`][api-arcjet-can-decorate].

### `ArcjetCanDecorate`

Decorable value (TypeScript type).

Something that looks like `Headers` (Fetch),
`OutgoingMessage` (Node.js), or
`Response` (Fetch).

###### Type

```ts
type ArcjetCanDecorate = HeaderLike | OutgoingMessageLike | ResponseLike;
```

### `setRateLimitHeaders(value, decision)`

Decorate something based on an Arcjet decision with rate limit headers.

Sets `RateLimit-Policy` and `RateLimit` and conform to the
[Rate Limit fields for
HTTP](https://ietf-wg-httpapi.github.io/ratelimit-headers/draft-ietf-httpapi-ratelimit-headers.html)
draft specification.

###### Parameters

- `value` ([`ArcjetCanDecorate`][api-arcjet-can-decorate])
  — decorable value
- `decision` (`ArcjetDecision`)
  — decision from `protect()`

###### Returns

Nothing (`undefined`).

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-arcjet-can-decorate]: #arcjetcandecorate
[api-set-rate-limit-headers]: #setratelimitheadersvalue-decision
[ietf-rate-limit]: https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-08
[typescript]: https://www.typescriptlang.org/
