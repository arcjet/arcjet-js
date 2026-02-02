<!-- trunk-ignore-all(markdownlint/MD024) -->
<!-- trunk-ignore-all(markdownlint/MD001) -->

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/react-router`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/react-router">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Freact-router?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Freact-router?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] SDK for [React Router][react-router].

- [GitHub source code (`arcjet-react-router/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-react-router)
- [npm package (`@arcjet/react-router`)](https://www.npmjs.com/package/@arcjet/react-router)

## Example

Try an Arcjet protected Next.js app live at
[`example.arcjet.com`][example-next-url]
([source code][example-next-source]).
See [`arcjet/example-react-router`][example-react-router-source] for a
React Router example.

## What is this?

This adapter integrates Arcjet and React Router.
Arcjet helps you secure your React Router website.

## When should I use this?

You can use this if you are using React Router.
See our [_Get started_ guide][arcjet-get-started] for other supported
frameworks.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/react-router
```

## Use

In a route such as `app/routes/home.tsx` do something like:

```tsx
import arcjet, { shield } from "@arcjet/react-router";
import type { ReactNode } from "react";
import type { Route } from "../routes/+types/home";

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

export default function Home(): ReactNode {
  return <h1>Hello!</h1>;
}

export async function loader(
  loaderArguments: Route.LoaderArgs,
): Promise<undefined> {
  const decision = await aj.protect(loaderArguments);

  if (decision.isDenied()) {
    throw new Response(
      undefined,
      decision.reason.isRateLimit()
        ? { statusText: "Too many requests", status: 429 }
        : { statusText: "Forbidden", status: 403 },
    );
  }
}
```

<!--

TODO: enable when this exists.

For more on how to configure Arcjet with React Router and how to protect
React Router,
see the [Arcjet React Router SDK reference][arcjet-reference-react-router] on our website.

[arcjet-reference-react-router]: https://docs.arcjet.com/reference/react-router

-->

## API

This package exports the identifier
[`createRemoteClient`][api-create-remote-client].
The default export is [`arcjet`][api-arcjet].
It also exports all identifiers from `arcjet` core.

This package exports the [TypeScript][] types
[`ArcjetOptions`][api-arcjet-options],
[`ArcjetReactRouterRequest`][api-arcjet-react-router-request],
[`ArcjetReactRouter`][api-arcjet-react-router], and
[`RemoteClientOptions`][api-remote-client-options].
It also exports all types from `arcjet` core.

### `ArcjetOptions`

Configuration for the React Router integration of Arcjet (TypeScript type).

###### Fields

- `characteristics`
  (`Array<string>`, default: `["ip.src"]`)
  — characteristics to track a user by;
  can also be passed to rules
- `client`
  (`Client`, optional)
  — client used to make requests to the Arcjet API;
  this is configured by adapters (such as `@arcjet/react-router`) but can be
  overwritten for testing purposes
- `key`
  (`string`, **required**)
  — API key to identify the site in Arcjet
- `log`
  (`ArcjetLogger`, optional)
  — log interface to emit useful information;
  this is configured by adapters (such as `@arcjet/react-router`) but can be
  overwritten for testing purposes
- `proxies`
  (`Array<string>`, optional, example: `["100.100.100.100", "100.100.100.0/24"]`)
  — IP addresses and CIDR ranges of trusted load balancers and proxies
- `rules`
  (`Array<Array<Rule>>`, **required**)
  — rules to apply when protecting a request

### `ArcjetReactRouterRequest`

Request for the React Router integration of Arcjet (TypeScript type).

###### Fields

- `context`
  (`unknown`, optional)
  — context for the React Router request;
  the `ip` (`string`) field is used if available
- `request`
  (`Request`, **required**)
  — DOM request

### `ArcjetReactRouter`

Instance of the React Router integration of Arcjet (TypeScript type).

Primarily has a `protect()` method to make a decision about how a request
should be handled.

#### `ArcjetReactRouter#protect(details, properties?)`

Make a decision about how to handle a request.

This will analyze the request locally where possible and otherwise call
the Arcjet decision API.

###### Parameters

- `details`
  ([`ArcjetReactRouterRequest`][api-arcjet-react-router-request], **required**)
  — details about the React Router request that Arcjet needs to make a decision.
- `properties`
  (`object`, optional)
  — additional properties required for running rules against a request.

###### Returns

Promise that resolves to an Arcjet decision indicating Arcjet’s decision about
the request (`Promise<ArcjetDecision>`).

#### `ArcjetReactRouter#withRule(rule)`

Augment the client with another rule.

Useful for varying rules based on criteria in your handler such as
different rate limit for logged in users.

###### Parameters

- `rule`
  (`Array<Rule>`, **required**)
  — rule to add to Arcjet

###### Returns

Arcjet instance augmented with the given rule
([`ArcjetReactRouter`][api-arcjet-react-router]).

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

Create a new React Router integration of Arcjet.

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

React Router integration of Arcjet
([`ArcjetReactRouter`][api-arcjet-react-router]).

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
[api-arcjet-react-router-request]: #arcjetreactrouterrequest
[api-arcjet-react-router]: #arcjetreactrouter
[api-arcjet]: #arcjetoptions
[api-create-remote-client]: #createremoteclient
[api-remote-client-options]: #remoteclientoptions
[arcjet-get-started]: https://docs.arcjet.com/get-started
[arcjet]: https://arcjet.com
[example-next-source]: https://github.com/arcjet/example-nextjs
[example-next-url]: https://example.arcjet.com
[example-react-router-source]: https://github.com/arcjet/example-react-router
[react-router]: https://reactrouter.com/
[typescript]: https://www.typescriptlang.org/
