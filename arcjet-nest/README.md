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

## Installation

```shell
npm install -S @arcjet/nest
```

## Shield example

[Arcjet Shield][shield-concepts-docs] protects your application against common
attacks, including the OWASP Top 10. You can run Shield on every request with
negligible performance impact.

```ts
import { Module } from "@nestjs/common";
import { NestFactory, APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ArcjetModule, ArcjetGuard, shield } from "@arcjet/nest";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env.local",
    }),
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!,
      rules: [shield({ mode: "LIVE" })],
    }),
  ],
  controllers: [],
  providers: [
    // You can enable ArcjetGuard globally on every route using the `APP_GUARD`
    // token; however, this is generally NOT recommended. If you need to inject
    // the ArcjetNest client, you want to make sure you aren't also running
    // ArcjetGuard on the handlers calling `protect()` to avoid making multiple
    // requests to Arcjet and you can't opt-out of this global Guard.
    {
      provide: APP_GUARD,
      useClass: ArcjetGuard,
    },
  ],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

## License

[Apache License, Version 2.0][apache-license] © [Arcjet Labs, Inc.][arcjet]

[arcjet]: https://arcjet.com
[nest-js]: https://nestjs.com/
[alt-sdk]: https://www.npmjs.com/package/@arcjet/next
[example-url]: https://example.arcjet.com
[quick-start]: https://docs.arcjet.com/get-started/nestjs
[example-source]: https://github.com/arcjet/arcjet-js-example
[shield-concepts-docs]: https://docs.arcjet.com/shield/concepts
[apache-license]: http://www.apache.org/licenses/LICENSE-2.0
