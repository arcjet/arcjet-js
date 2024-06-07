<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/sprintf`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/sprintf">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fsprintf?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fsprintf?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] platform-independent replacement for [util.format][node-util].

This package is platform-independent in order to support multiple runtimes in varying environments, such as Edge Runtime, Node.js, Bun, Deno, and Cloudflare Workers.

## Installation

```shell
npm install -S @arcjet/sprintf
```

## Example

```ts
import format from "@arcjet/sprintf";

format("Hello %s", "world") === "Hello world";
format("1 %i %d", 2, 3.0) === "1 2 3";
```

## Substitutions

Substitutions will be made for the following character sequences if the matching
argument conforms to the type. For example, `"%d"` will only be replaced by a
number, not a string or object.

Object substitution supports any value that is not `undefined`.

- `%d` | `%f` - Replaced if provided with a number.
- `%i` - Replaced if provided with a number after `Math.floor` is called on it.
- `%O` | `%o` | `%j` - Replaced if provided with any value after
  `JSON.stringify` is called on it. Objects with circular references will be
  replaced with `[Circular]`. Functions will be replaced with the function name
  or `<anonymous>` if unnamed.
- `%s` - Replaced if provided with a string.
- `%%` - Replaced by the literal `%` character.

## Implementation

This implementation of this library is based on [quick-format-unescaped], which
is licensed MIT with licenses included in our source code.

The goal of this library is to be more restrictive than `quick-format-unescaped`
while maintaining as much compatibility as possible, since [pino] uses it to
format strings.

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[node-util]: https://nodejs.org/docs/latest-v18.x/api/util.html#utilformatformat-args
[quick-format-unescaped]: https://github.com/pinojs/quick-format-unescaped/blob/20ebf64c2f2e182f97923a423d468757b9a24a63/index.js
[pino]: https://github.com/pinojs/pino
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
