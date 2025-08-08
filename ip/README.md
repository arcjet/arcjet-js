<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/ip`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/ip">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fip?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fip?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] utilities for finding the originating IP of a request.

- [npm package (`@arcjet/ip`)](https://www.npmjs.com/package/@arcjet/ip)
- [GitHub source code (`ip/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/ip)

## What is this?

This is an internal utility to help us deal with IP addresses.
It includes code from the Rust standard library code to parse
[IPv4 and IPv6][rust-parser] and also contains some code from
[`pbojinov/request-ip`][request-ip].
We turned the Rust IP parser into TypeScript so that we have the exact same
functionality in both languages.
Similar functionality in alternative JavaScript libraries often uses regular
expressions but those can cause ReDoS attacks.
We sidestep that problem because the Rust IP parser algorithm does not use
regular expressions.
We chose to copy code from `request-ip` so that we only keep the functionality
that we use and keep our dependency tree as light as possible.
Our code is different: if we know we are running on Cloudflare for example then
we do not trust headers typically set by fly.io.

## When should I use this?

You should not use this but use one of the alternatives instead.
This package matches our current needs which are likely different from yours.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/ip
```

## Example

```ts
import findIp from "@arcjet/ip";

const ip = findIp({ headers: { "x-real-ip": "1.1.1.1" } });
console.log(ip); // => "1.1.1.1"
```

## Considerations

The IP should not be trusted as it can be spoofed in most cases, especially when
loaded via the `Headers` object. We apply additional platform guards if a
platform is supplied in the `options` argument.

If a private/internal address is encountered, it will be skipped. If only those
are detected, an empty string is returned.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

Derivative work based on [`Parser` in `std::net`][rust-parser],
[`is_global` on `Ipv4Addr`][rust-ipv4-is-global], and
[`is_global` on `Ipv6Addr`][rust-ipv6-is-global]
from `rust-lang/rust`,
dual licensed under [MIT][rust-license-mit] and
[Apache-2.0][rust-license-apache] © contributors.
Our work ports to TypeScript so that we have the same functionality in both
languages.

Derivative work based on [`getClientIp` from `request-ip`][request-ip-client-ip]
licensed under [MIT][request-ip-license] © Petar Bojinov.
Our work cherry picks only what we need.

[arcjet]: https://arcjet.com
[request-ip-client-ip]: https://github.com/pbojinov/request-ip/blob/e1d0f4b/src/index.js#L55
[request-ip-license]: https://github.com/pbojinov/request-ip/blob/e1d0f4b/LICENSE.md
[request-ip]: https://github.com/pbojinov/request-ip
[rust-ipv4-is-global]: https://github.com/rust-lang/rust/blob/87e1447/library/core/src/net/ip_addr.rs#L749
[rust-ipv6-is-global]: https://github.com/rust-lang/rust/blob/87e1447/library/core/src/net/ip_addr.rs#L1453
[rust-license-apache]: https://github.com/rust-lang/rust/blob/07921b5/LICENSE-APACHE
[rust-license-mit]: https://github.com/rust-lang/rust/blob/07921b5/LICENSE-MIT
[rust-parser]: https://github.com/rust-lang/rust/blob/07921b5/library/core/src/net/parser.rs#L34
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
