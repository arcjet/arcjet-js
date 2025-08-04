<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# `@arcjet/nest`

<p>
  <a href="https://www.npmjs.com/package/@arcjet/nest">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/npm/v/%40arcjet%2Fnest?style=flat-square&label=%E2%9C%A6Aj&labelColor=000000&color=5C5866">
      <img alt="npm badge" src="https://img.shields.io/npm/v/%40arcjet%2Fnest?style=flat-square&label=%E2%9C%A6Aj&labelColor=ECE6F0&color=ECE6F0">
    </picture>
  </a>
</p>

[Arcjet][arcjet] helps developers protect their apps in just a few lines of
code. Implement rate limiting, bot protection, email verification, and defense
against common attacks.

This is the [Arcjet][arcjet] SDK for [NestJS][nest-js].

**Looking for our Next.js framework SDK?** Check out the
[`@arcjet/next`][alt-sdk] package.

- [npm package (`@arcjet/nest`)](https://www.npmjs.com/package/@arcjet/nest)
- [GitHub source code (`arcjet-nest/` in `arcjet/arcjet-js`)](https://github.com/arcjet/arcjet-js/tree/main/arcjet-nest)

## Getting started

Visit the [quick start guide][quick-start] to get started.

## Example app

Try an Arcjet protected app live at [https://example.arcjet.com][example-url]
([source code][example-source]).

## What is this?

This is our adapter to integrate Arcjet into NestJS.
Arcjet helps you secure your Nest server.
This package exists so that we can provide the best possible experience to
Nest users.

## When should I use this?

You can use this if you are using NestJS.
See our [_Get started_ guide][arcjet-get-started] for other supported
frameworks.

## Install

This package is ESM only.
Install with npm in Node.js:

```sh
npm install @arcjet/nest
```

## Use

```ts
import { ArcjetModule, shield } from "@arcjet/nest";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

// Get your Arcjet key at <https://app.arcjet.com>.
// Set it as an environment variable instead of hard coding it.
const arcjetKey = process.env.ARCJET_KEY;

if (!arcjetKey) {
  throw new Error("Cannot find `ARCJET_KEY` environment variable");
}

@Module({
  imports: [
    ArcjetModule.forRoot({
      isGlobal: true,
      key: arcjetKey,
      rules: [
        // Shield protects your app from common attacks.
        // Use `DRY_RUN` instead of `LIVE` to only log.
        shield({ mode: "LIVE" }),
      ],
    }),
  ],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(8000);
}

bootstrap();
```

For more on how to configure Arcjet with NestJS and how to protect Nest,
see the [Arcjet NestJS SDK reference][arcjet-reference-nest] on our website.

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet-get-started]: https://docs.arcjet.com/get-started
[arcjet-reference-nest]: https://docs.arcjet.com/reference/nestjs
[arcjet]: https://arcjet.com
[nest-js]: https://nestjs.com/
[alt-sdk]: https://www.npmjs.com/package/@arcjet/next
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/nestjs
[example-source]: https://github.com/arcjet/arcjet-js-example
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
