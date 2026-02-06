<!-- trunk-ignore-all(markdownlint/MD024) -->
<!-- trunk-ignore-all(markdownlint/MD001) -->

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

- [npm package (`@arcjet/inspect`)](https://www.npmjs.com/package/@arcjet/inspect)
- [GitHub source code (`inspect/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/inspect)

## What is this?

Arcjet attaches lots of metadata to every decision.
This package exists to more easily interact with Arcjet decisions for common
patterns.

## When should I use this?

You can access metadata on decisions directly but you can use this package for
common patterns.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/inspect
```

## Use

```ts
import http from "node:http";
import arcjet, { detectBot } from "@arcjet/next";
import { isMissingUserAgent } from "@arcjet/inspect";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

const aj = arcjet({
  key: arcjetKey,
  rules: [
    // `detectBot` lets you manage automated clients and bots.
    detectBot({ allow: [], mode: "LIVE" }),
  ],
});

const server = http.createServer(async function (
  request: http.IncomingMessage,
  response: http.ServerResponse,
) {
  const decision = await aj.protect(request);

  if (decision.isDenied()) {
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "Forbidden" }));
    return;
  }

  if (decision.results.some(isMissingUserAgent)) {
    response.writeHead(403, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ message: "You are a bot!" }));
    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ message: "Hello world" }));
});

server.listen(8000);
```

## API

This package exports the identifier
[`isMissingUserAgent`][api-is-missing-user-agent].
[`isSpoofedBot`][api-is-spoofed-bot].
[`isVerifiedBot`][api-is-verified-bot].
There is no default export.

This package exports no [TypeScript][] types.

### `isMissingUserAgent(result)`

Check for a bot missing a `User-Agent` header.

You may want to block such requests because a missing `User-Agent` header is
a good indicator of a malicious request since it is recommended by
[_HTTP Semantics_ from IETF](https://datatracker.ietf.org/doc/html/rfc9110#field.user-agent).

###### Parameters

- `result` (`Result`)
  — rule result

###### Returns

`true` if the bot rule result was `LIVE` and the request had no `User-Agent` header,
`false` if the bot rule result was `LIVE` and the request had a `User-Agent` header,
`undefined` if the rule result was non-bot or `DRY_RUN` (`boolean | undefined`).

###### Availability

Bot protection is available if `detectBot` is used.
See [_Bot protection_ on
`docs.arcjet.com`](https://docs.arcjet.com/bot-protection/quick-start)
for more info.

Missing `User-Agent` detection is part of all plans including the free plans.
See [_Error handling_ on
`docs.arcjet.com`](https://docs.arcjet.com/bot-protection/reference#error-handling)
for more info.

### `isSpoofedBot(result)`

Check for a spoofed bot.

You may want to block such requests because they were likely spoofed.

###### Parameters

- `result` (`Result`)
  — rule result

###### Returns

`true` if the bot rule result was `LIVE` and detected a spoofed bot,
`false` if the bot rule result was `LIVE` and did not detect a spoofed bot,
`undefined` if the rule result was non-bot or `DRY_RUN` (`boolean | undefined`).

###### Availability

Bot protection is available if `detectBot` is used.
See [_Bot protection_ on
`docs.arcjet.com`](https://docs.arcjet.com/bot-protection/quick-start)
for more info.

Spoofed bot detection is part of advanced bot protection features which
are not available on free plans but are available on the starter and
business plans.
See [_Bot verification_ on
`docs.arcjet.com`](https://docs.arcjet.com/bot-protection/reference#bot-verification)
for more info.

### `isVerifiedBot(result)`

Check for a verified bot.

You may want to ignore other signals for such requests.

###### Parameters

- `result` (`Result`)
  — rule result

###### Returns

`true` if the bot rule result was `LIVE` and detected a verified bot,
`false` if the bot rule result was `LIVE` and did not detect a verified bot,
`undefined` if the rule result was non-bot or `DRY_RUN` (`boolean | undefined`).

###### Availability

Bot protection is available if `detectBot` is used.
See [_Bot protection_ on
`docs.arcjet.com`](https://docs.arcjet.com/bot-protection/quick-start)
for more info.

Verified bot detection is part of advanced bot protection features which
are not available on free plans but are available on the starter and
business plans.
See [_Bot verification_ on
`docs.arcjet.com`](https://docs.arcjet.com/bot-protection/reference#bot-verification)
for more info.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-is-missing-user-agent]: #ismissinguseragentresult
[api-is-spoofed-bot]: #isspoofedbotresult
[api-is-verified-bot]: #isverifiedbotresult
[arcjet]: https://arcjet.com
[typescript]: https://www.typescriptlang.org/
