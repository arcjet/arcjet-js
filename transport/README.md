<!-- trunk-ignore-all(markdownlint/MD001) -->

<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/transport`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/transport">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Ftransport?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Ftransport?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

Transport mechanisms for the [Arcjet][arcjet] protocol.

- [npm package (`@arcjet/transport`)](https://www.npmjs.com/package/@arcjet/transport)
- [GitHub source code (`transport/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/transport)

## What is this?

This package provides a way to talk to our protocol.

## When should I use this?

This is an internal Arcjet package not designed for public use.
See our [_Get started_ guide][arcjet-get-started] for how to use Arcjet in your
application.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/transport
```

## Node.js version support

This package requires `>=22.21.0 <23 || >=24.5.0`. Proxy support relies on the
built-in proxy support of the Node.js HTTP agent, which is only available on
Node.js `>=22.21.0` and, on the 24 line, `>=24.5.0`. Node.js 20 is end-of-life
and Node.js 23 is not supported. Anyone tracking an active LTS release is
unaffected.

Because every Arcjet SDK depends on this package, the same requirement applies
across the Arcjet SDKs.

## Use

```ts
import { createTransport } from "@arcjet/transport";

const transport = createTransport("https://decide.arcjet.com");
// This can now be passed to `createClient` from `@arcjet/protocol`.
```

## API

This package exports the identifier
[`createTransport`][api-create-transport].
There is no default export.

This package exports the [TypeScript][] types
[`ProxyEnvironment`][api-proxy-environment],
[`TransportLogger`][api-transport-logger], and
[`TransportOptions`][api-transport-options].

### `createTransport(baseUrl[, options])`

Creates a transport that talks to the Arcjet API. On Node.js it uses
`@connectrpc/connect-node` over HTTP/2; separate entry points for Bun, Deno,
Edge Light, and `workerd` use `@connectrpc/connect-web` instead. This is a thin
wrapper around [`createConnectTransport`][connect-create-transport].

### Proxy support

The standard proxy environment variables (`HTTP_PROXY` and `HTTPS_PROXY`, while
respecting `NO_PROXY`) are auto-detected, making it possible to connect to the
Arcjet API through a proxy such as [Squid][squid]. When a proxy is in use, a
line is logged at startup at `info` level (so set `ARCJET_LOG_LEVEL=info` to see
it). The proxy URL itself is not logged, since it can contain credentials. How
the request is actually proxied depends on the runtime, using each runtime's
built-in proxy support:

- **Node.js** — requests are routed through the proxy over HTTP/1.1 using the
  built-in proxy support of the Node.js HTTP agent; otherwise they are made
  directly over HTTP/2.
- **Bun** and **Deno** — the runtime's `fetch` performs the proxying natively.
- **Edge Light** and **`workerd`** — these edge runtimes don't support outbound
  proxy environment variables, so no proxy is used.

`NO_PROXY` accepts a comma- or space-separated list of host suffixes, each with
an optional leading `.` or `*.` and an optional `:port`, plus `*` to bypass the
proxy for every host. Entries are matched as host names; IP/CIDR ranges (such as
`10.0.0.0/8`) are not supported, the same as [curl][curl-noproxy]. On Bun and
Deno the runtime's `fetch` applies `NO_PROXY` itself, so its exact semantics are
the runtime's.

###### Parameters

- `baseUrl` (`string`, example: `https://example.com/my-api`)
  — the base URL for all HTTP requests
- `options` ([`TransportOptions`][api-transport-options], optional)
  — configuration

###### Returns

A Connect transport that you can pass to `createClient` from
`@arcjet/protocol`.

### `ProxyEnvironment`

Map of environment variables used to detect an outbound proxy (TypeScript
type). This is the same shape as `process.env`.

### `TransportLogger`

Logger used to print a line at startup when a proxy is detected (TypeScript
type). It must provide an `info` method.

### `TransportOptions`

Configuration for `createTransport` (TypeScript type).

###### Fields

- `log` ([`TransportLogger`][api-transport-logger], optional)
  — logger used to print a line at startup when a proxy is detected; defaults
  to a logger configured from the `ARCJET_LOG_LEVEL` environment variable
- `proxyEnv` ([`ProxyEnvironment`][api-proxy-environment] or `false`, optional)
  — environment variables used to detect an outbound proxy; defaults to
  `process.env` so standard proxy environment variables are auto-detected; pass
  `false` to ignore proxy environment variables

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-create-transport]: #createtransportbaseurl-options
[api-proxy-environment]: #proxyenvironment
[api-transport-logger]: #transportlogger
[api-transport-options]: #transportoptions
[arcjet]: https://arcjet.com
[arcjet-get-started]: https://docs.arcjet.com/get-started
[connect-create-transport]: https://connectrpc.com/docs/web/choosing-a-protocol/
[curl-noproxy]: https://curl.se/docs/manpage.html#--noproxy
[squid]: https://www.squid-cache.org/
[typescript]: https://www.typescriptlang.org/
