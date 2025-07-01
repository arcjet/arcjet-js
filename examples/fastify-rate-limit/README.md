<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Rate Limit with Fastify

This example shows how to use Arcjet with a [Fastify][] server.

## Use

Install the JavaScript SDK dependencies from the root of the repo:

```sh
npm ci
```

Install this example’s dependencies from its folder:

```sh
cd examples/fastify-rate-limit/
npm ci
```

Rename `.env.local.example` to `.env.local` and add your Arcjet key.
Then start the server:

```sh
npm start
```

> 👉 **Note**:
> If you get a ``Cannot find `ARCJET_KEY` environment variable`` error,
> make sure to rename `.env.local.example` to `.env.local` and add your Arcjet
> key.

> 👉 **Note**:
> If you get a `node: bad option: --env-file` error please update to
> Node.js 20 or later.

Now visit `http://localhost:3000/`: you should see “Hello world”.

Finally, refresh the page to trigger the rate limit: you should see “Too many requests”.

[fastify]: https://fastify.dev/
