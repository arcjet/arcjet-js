<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-dark-planet-arrival.svg">
    <img src="https://arcjet.com/arcjet-logo-light-planet-arrival.svg" alt="Arcjet Logo" height="144" width="auto">
  </picture>
</a>

# `@arcjet/ip`

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/%E2%9C%A6Aj-1.0.0--alpha.1-5C5866?style=flat-square&labelColor=000000">
    <img src="https://img.shields.io/badge/%E2%9C%A6Aj-1.0.0--alpha.1-ECE6F0?style=flat-square&labelColor=ECE6F0">
  </picture>
</p>

[Arcjet][arcjet] utilities for finding the originating IP of a request.

## Installation

```shell
npm install -S @arcjet/ip
```

## Example

```ts
import ip from "@arcjet/ip";

// Some Request-like object, such as node's `http.IncomingMessage` or next.js'
// `NextRequest`
const request = new NextRequest();
// A `Headers` object, which is passed separately for cases where it needs to be
// constructed or sanitized
const headers = new Headers();

// Returns the first non-private IP address detected
const globalIp = ip(request, headers);
console.log(globalIp);
```

## Considerations

The IP should not be trusted as it can be spoofed in most cases, especially when
loaded via the `Headers` object.

In non-production environments (`NODE_ENV !== "production"`), we allow
private/internal addresses so that the SDKs work correctly locally.

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
