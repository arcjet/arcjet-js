<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `arcjet`

<p>
  <a href="https://www.npmjs.com/package/arcjet">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/arcjet?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] TypeScript and JavaScript sensitive information
detection and redaction library.

## Getting started

Visit [docs.arcjet.com](https://docs.arcjet.com) to get started.

## Installation

```shell
npm install -S @arcjet/redact
```

## Example
```typescript
const session = new RedactSession({ redact: ["email", "phone-number"] });
const text = "Hi, my name is John and my email adress is john@example.com";
const redacted = await session.redact(text);
console.log(redacted); 
// Hi, my name is John and my email address is <REDACTED INFO #0>

const unredacted = await session.unredact("Your email address is <REDACTED INFO #0>");
console.log(unredacted); // Your email address is john@example.com
```

## API

TODO

## License

Licensed under the [Apache License, Version 2.0][apache-license].

[arcjet]: https://arcjet.com
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
