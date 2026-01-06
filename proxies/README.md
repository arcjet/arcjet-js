<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/proxies`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/proxies">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fproxies?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fproxies?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] utility with lists of IP ranges.

- [GitHub source code (`arcjet-proxies/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-proxies)
- [npm package (`@arcjet/proxies`)](https://www.npmjs.com/package/@arcjet/proxies)

## What is this?

This package helps users configure [`proxies`][arcjet-proxies]
with lists of generated IPs from Cloudflare and Google.

## When should I use this?

You can use this package if you put Cloudflare or Google in front of an app.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/proxies
```

## Use

```js
import arcjetBun from "@arcjet/bun";
import { cloudflare } from "@arcjet/proxies";
import { env } from "bun";

const arcjet = arcjetBun({
  key: env.ARCJET_KEY!,
  proxies: [...cloudflare],
  rules: [],
});
```

## API

This package exports the identifiers
[`cloudflare`][api-cloudflare] and
[`google`][api-google].
There is no default export.

This package exports no [TypeScript][] types.

### `cloudflare`

IP addresses from Cloudflare in CIDR notation (`Array<string>`);
from <https://www.cloudflare.com/ips-v4/> and <https://www.cloudflare.com/ips-v6/>.

### `google`

IP addresses from Google in CIDR notation (`Array<string>`);
from <https://www.gstatic.com/ipranges/goog.json>.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[api-cloudflare]: #cloudflare
[api-google]: #google
[arcjet-proxies]: https://docs.arcjet.com/concepts/client-ip#proxies
[arcjet]: https://arcjet.com
[typescript]: https://www.typescriptlang.org/
