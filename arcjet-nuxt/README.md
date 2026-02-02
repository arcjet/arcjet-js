<!-- trunk-ignore-all(markdownlint/MD024) -->
<!-- trunk-ignore-all(markdownlint/MD001) -->

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/nuxt`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/nuxt">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnuxt?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnuxt?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][] SDK for [Nuxt][].

- [GitHub source code (`arcjet-nuxt/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-nuxt)
- [npm package (`@arcjet/nuxt`)](https://www.npmjs.com/package/@arcjet/nuxt)

## Example

Try an Arcjet protected Next.js app live at
[`example.arcjet.com`][example-next-url]
([source code][example-next-source]).
See [`arcjet/example-nuxt`][example-nuxt-source] for a Nuxt example.

## What is this?

This adapter integrates Arcjet and Nuxt.
Arcjet helps you secure your Nuxt app.

## When should I use this?

You can use this if you are using Nuxt.
See our [_Get started_ guide][arcjet-get-started] for other supported
frameworks.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/nuxt
```

## Use

Add this package to `modules` and configure `arcjet.key` in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  arcjet: { key: process.env.ARCJET_KEY },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@arcjet/nuxt"],
});
```

Then in a route such as `server/routes/protected.get.ts` do something like:

```ts
import arcjet, { shield } from "#arcjet";

const aj = arcjet({
  rules: [
    // Shield protects your app from common attacks.
    // Use `DRY_RUN` instead of `LIVE` to only log.
    shield({ mode: "LIVE" }),
  ],
});

export default defineEventHandler(async (event) => {
  const decision = await aj.protect(event);

  if (decision.isDenied()) {
    throw createError({
      statusCode: 403,
      statusMessage: "Forbidden",
    });
  }

  return "Hello, world!";
});
```

<!--

TODO: enable when this exists.

For more on how to configure Arcjet with Nuxt and how to protect Nuxt,
see the [Arcjet Nuxt SDK reference][arcjet-reference-nuxt] on our website.

[arcjet-reference-nuxt]: https://docs.arcjet.com/reference/nuxt

-->

## API

> 👉 **Note**:
> after registering the Nuxt module `@arcjet/nuxt` in `nuxt.config.ts`,
> you must import the below API from `#arcjet`.

This package exports the identifier
[`createRemoteClient`][api-create-remote-client].
It also exports all identifiers from `arcjet` core.
The default export is [`arcjet`][api-arcjet].

This package exports the [TypeScript][] types
[`ArcjetH3Event`][api-arcjet-h3-event],
[`ArcjetNuxt`][api-arcjet-nuxt],
[`ArcjetOptions`][api-arcjet-options], and
[`RemoteClientOptions`][api-remote-client-options].
It also exports all types from `arcjet` core.

### `ArcjetH3Event`

H3 event (TypeScript type).

This is the minimum interface similar to `H3Event` from `h3`.

###### Type

```ts
import type { IncomingMessage } from "http";

interface ArcjetH3Event {
  node: ArcjetH3NodeEventContext;
}

interface ArcjetH3NodeEventContext {
  req: IncomingMessage;
}
```

### `ArcjetNuxt`

Instance of the Nuxt integration of Arcjet (TypeScript type).

Primarily has a `protect()` method to make a decision about how a request
should be handled.

#### `ArcjetNuxt#protect(details, properties?)`

Make a decision about how to handle a request.

This will analyze the request locally where possible and otherwise call
the Arcjet decision API.

###### Parameters

- `event`
  ([`ArcjetH3Event`][api-arcjet-h3-event], **required**)
  — H3 event that Arcjet needs to make a decision
- `properties`
  (`object`, optional)
  — additional properties required for running rules against a request.

###### Returns

Promise that resolves to an Arcjet decision indicating Arcjet’s decision about
the request (`Promise<ArcjetDecision>`).

#### `ArcjetNuxt#withRule(rule)`

Augment the client with another rule.

Useful for varying rules based on criteria in your handler such as
different rate limit for logged in users.

###### Parameters

- `rule`
  (`Array<Rule>`, **required**)
  — rule to add to Arcjet

###### Returns

Arcjet instance augmented with the given rule
([`ArcjetNuxt`][api-arcjet-nuxt]).

### `ArcjetOptions`

Configuration for the Nuxt integration of Arcjet (TypeScript type).

> 👉 **Note**:
> you cannot pass `key` here but instead have to configure it in
> `nuxt.config.ts`.

###### Fields

- `characteristics`
  (`Array<string>`, default: `["ip.src"]`)
  — characteristics to track a user by;
  can also be passed to rules
- `client`
  (`Client`, optional)
  — client used to make requests to the Arcjet API;
  this is configured by adapters (such as `@arcjet/nuxt`) but can be
  overwritten for testing purposes
- `log`
  (`ArcjetLogger`, optional)
  — log interface to emit useful information;
  this is configured by adapters (such as `@arcjet/nuxt`) but can be
  overwritten for testing purposes
- `proxies`
  (`Array<string>`, optional, example: `["100.100.100.100", "100.100.100.0/24"]`)
  — IP addresses and CIDR ranges of trusted load balancers and proxies
- `rules`
  (`Array<Array<Rule>>`, **required**)
  — rules to apply when protecting a request

### `RemoteClientOptions`

Configuration for [`createRemoteClient`][api-create-remote-client]
(TypeScript type).

###### Fields

- `baseUrl`
  (`string`, optional)
  — base URI for HTTP requests to Decide API;
  defaults to the environment variable `ARCJET_BASE_URL`
  (if that value is known and allowed)
  and the standard production API otherwise
- `timeout`
  (`number`, optional)
  — timeout in milliseconds for the Decide API;
  defaults to `500` in production and `1000` in development

### `arcjet`

Create a new Nuxt integration of Arcjet.

> 👉 **Tip**:
> build your initial base client with as many rules as possible outside of a
> request handler;
> if you need more rules inside handlers later then you can call `withRule()`
> on that base client.

###### Parameters

- `options`
  ([`ArcjetOptions`][api-arcjet-options], **required**)
  — configuration

###### Returns

Nuxt integration of Arcjet
([`ArcjetNuxt`][api-arcjet-nuxt]).

### `createRemoteClient`

Create a remote client.

###### Parameters

- `options`
  ([`RemoteClientOptions`][api-remote-client-options], optional)
  — configuration

###### Returns

Client (`Client`).

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-arcjet-options]: #arcjetoptions
[api-arcjet-h3-event]: #arcjeth3event
[api-arcjet-nuxt]: #arcjetnuxt
[api-arcjet]: #arcjetoptions
[api-create-remote-client]: #createremoteclient
[api-remote-client-options]: #remoteclientoptions
[arcjet-get-started]: https://docs.arcjet.com/get-started
[arcjet]: https://arcjet.com
[example-next-source]: https://github.com/arcjet/example-nextjs
[example-next-url]: https://example.arcjet.com
[example-nuxt-source]: https://github.com/arcjet/example-nuxt
[nuxt]: https://nuxt.com/
[typescript]: https://www.typescriptlang.org/
