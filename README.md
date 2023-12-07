<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet - TypeScript & JavaScript packages

<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/%E2%9C%A6Aj-1.0.0--alpha.0-5C5866?style=flat-square&labelColor=000000">
    <img src="https://img.shields.io/badge/%E2%9C%A6Aj-1.0.0--alpha.0-ECE6F0?style=flat-square&labelColor=ECE6F0">
  </picture>
</p>

[Arcjet][arcjet] helps developers protect their apps. Installed as an SDK, it
provides a set of core primitives such as rate limiting and bot protection.
These can be used independently or combined to create a set of layered defenses,
such as signup form protection.

This is the monorepo containing various [Arcjet][arcjet] open source packages
for TypeScript and JavaScript.

## Usage

Please refer to [docs.arcjet.com][arcjet-docs] for the most accurate
documentation in consuming our published packages.

## Packages

We provide the source code for various packages in this repository, so you can
find a specific one through the categories and descriptions below.

### SDKs

- [`arcjet`](./arcjet/README.md): TypeScript and JavaScript SDK core.
- [`@arcjet/next`](./arcjet-next/README.md): SDK for the Next.js framework.

### Analysis

- [`@arcjet/analyze`](./analyze/README.md): Local analysis engine.
- [`@arcjet/ip`](./ip/README.md): Utilities for finding the originating IP of a
  request.

### Utilities

- [`@arcjet/protocol`](./protocol/README.md): TypeScript & JavaScript interface
  into the Arcjet protocol.
- [`@arcjet/logger`](./logger/README.md): Logging interface which mirrors the
  console interface but allows log levels.

### Internal development

- [`@arcjet/eslint-config`](./eslint-config/README.md): Custom eslint config for
  our projects.
- [`@arcjet/rollup-config`](./rollup-config/README.md): Custom rollup config for
  our projects.
- [`@arcjet/tsconfig`](./tsconfig/README.md): Custom tsconfig for our projects.

## Support

This repository follows the [Arcjet Support Policy][arcjet-support].

## Security

This repository follows the [Arcjet Security Policy][arcjet-security].

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[arcjet-docs]: https://docs.arcjet.com/
[arcjet-support]: https://docs.arcjet.com/support
[arcjet-security]: https://docs.arcjet.com/security
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
