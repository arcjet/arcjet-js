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

## Installation

```shell
npm install -S @arcjet/ip
```

## Example

```ts
import ip from "@arcjet/ip";

// Some Request-like object, such as node's `http.IncomingMessage`, `Request` or
// Next.js' `NextRequest`
const request = new Request();

// Returns the first non-private IP address detected
const globalIp = ip(request);
console.log(globalIp);

// Also optionally takes a platform for additional protection
const platformGuardedGloablIp = ip(request, { platform: "fly-io" });

// You can also pass a list of trusted proxies to ignore
const proxyExcludedGlobalIp = ip(request, { proxies: ["103.31.4.0"] });
```

## Considerations

The IP should not be trusted as it can be spoofed in most cases, especially when
loaded via the `Headers` object. We apply additional platform guards if a
platform is supplied in the `options` argument.

If a private/internal address is encountered, it will be skipped. If only those
are detected, an empty string is returned.

## Implementation

The implementation of this library is based on the [Parser][rust-parser],
[global ipv4 comparisons][rust-global-ipv4], and
[global ipv6 comparisons][rust-global-ipv6] in the Rust stdlib and the [header
lookups][request-ip-headers] in the [request-ip] package. Both licensed MIT with
licenses included in our source code.

We've chosen the approach of porting Rust's IP Parser because capturing RegExps
can be the source of ReDoS attacks, which we need to avoid. We also wanted to
keep our implementation as close to Rust as possible because we will be relying
on the Rust stdlib implementation in the future, with a fallback to this
implementation. As such, we'll need to track changes in Rust's implementation,
even though it seems to change infrequently.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[rust-parser]: https://github.com/rust-lang/rust/blob/07921b50ba6dcb5b2984a1dba039a38d85bffba2/library/core/src/net/parser.rs#L34
[rust-global-ipv4]: https://github.com/rust-lang/rust/blob/87e1447aadaa2899ff6ccabe1fa669eb50fb60a1/library/core/src/net/ip_addr.rs#L749
[rust-global-ipv6]: https://github.com/rust-lang/rust/blob/87e1447aadaa2899ff6ccabe1fa669eb50fb60a1/library/core/src/net/ip_addr.rs#L1453
[request-ip-headers]: https://github.com/pbojinov/request-ip/blob/e1d0f4b89edf26c77cf62b5ef662ba1a0bd1c9fd/src/index.js#L55
[request-ip]: https://github.com/pbojinov/request-ip/tree/e1d0f4b89edf26c77cf62b5ef662ba1a0bd1c9fd
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
