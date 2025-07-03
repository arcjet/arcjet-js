<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/redact`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/redact">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fredact?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fredact?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] TypeScript and JavaScript sensitive information
redaction library.

- [npm package (`@arcjet/redact`)](https://www.npmjs.com/package/@arcjet/redact)
- [GitHub source code (`redact/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/redact)

## Installation

```shell
npm install -S @arcjet/redact
```

## Reference

The full reference documentation can be found in the [Arcjet docs][redact-ref].

## Example

```typescript
const text = "Hi, my name is John and my email adress is john@example.com";
const [redacted, unredact] = await redact(text, {
  redact: ["email", "phone-number"],
});
console.log(redacted);
// Hi, my name is John and my email address is <Redacted email #0>

const unredacted = unredact("Your email address is <Redacted email #0>");
console.log(unredacted); // Your email address is john@example.com
```

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[redact-ref]: https://docs.arcjet.com/redact/reference
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
