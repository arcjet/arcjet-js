<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Protection with NestJS for Node.js

This example shows how to use Arcjet to protect [NestJS](https://nestjs.com/) apps using the Node.js SDK.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nodejs-nestjs
   npm ci
   ```

3. Rename `.env.example` to `.env` and add your Arcjet key.

4. Start the server.

   ```bash
   npm start
   ```

5. Visit `http://localhost:3000/` in a browser.

6. Visit `http://localhost:3000/protected` in a browser and refresh the page to trigger the rate limit.

7. Test shield by making this request 5 or more times:

    ```bash
    curl -v -H "x-arcjet-suspicious: true" http://localhost:3000
    ```

## How it works

[ArcjetGuard](src/arcjet/arcjet.guard.ts) is a NestJS Guard, which is a type of middleware that is used to determine whether a request should be handled by the route handler or not. Guards have a single responsibility. They determine whether a request will be handled by the route handler, depending on certain conditions like permissions or roles.

ArcjetGuard is defined as a provider in one or more modules, such as [AppModule](src/app.module.ts) and [ProtectedModule](src/protected/protected.module.ts). At this point, it's also possible to augment the rules from the default values by prefixing the ArcjetGuard provider definition with an extra, inline provider definition, as shown here. Check the [Node.js SDK Configuration documentation](https://docs.arcjet.com/reference/nodejs#configuration) for information on the rules available.

```json
providers: [
   ProtectedService,
   {
      provide: 'ARCJET_RULES',
      useValue: [
         fixedWindow({
            mode: "LIVE",
            window: "1m",
            max: 1,
         }),
      ],
   },
   ArcjetGuard,
]
```

Finally, ArcjetGuard is defined in controllers with the following line:

```js
...

@Controller()
@UseGuards(ArcjetGuard)
export class AppController {
   ...
```