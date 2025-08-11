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

- [npm package (`@arcjet/sprintf`)](https://www.npmjs.com/package/@arcjet/sprintf)
- [GitHub source code (`sprintf/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/sprintf)

## What is this?

This is an internal utility to help us format log messages.
It’s a fork of [`pinojs/quick-format-unescaped`][quick-format-unescaped].
We chose to fork so that we can maintain as much compatibility as possible
while being more restrictive.

## When should I use this?

You should not use this but use
[`pinojs/quick-format-unescaped`][quick-format-unescaped] or one of the
alternatives instead.
This package matches our current needs which are likely different from yours.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/sprintf
```

## Use

```ts
import format from "@arcjet/sprintf";

console.log(format("Hello %s", "world")); // => "Hello world"
console.log(format("1 %i %d", 2, 3.0)); // => "1 2 3"
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

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

Derivative work based on [`quick-format-unescaped`][quick-format-unescaped]
licensed under [MIT][quick-format-unescaped-license] © David Mark Clements.
Our work is more restrictive while maintaining as much compatibility as
possible.

[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
[arcjet]: https://arcjet.com
[node-util]: https://nodejs.org/docs/latest-v18.x/api/util.html#utilformatformat-args
[quick-format-unescaped-license]: https://github.com/pinojs/quick-format-unescaped/blob/20ebf64/LICENSE
[quick-format-unescaped]: https://github.com/pinojs/quick-format-unescaped/blob/20ebf64/index.js
