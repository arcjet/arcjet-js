<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Protection with Fastify

This example shows how to use Arcjet with a [Fastify][] servers.

## Use

Install the JavaScript SDK dependencies from the root of the repo:

```sh
npm ci && npm run build
```

Install this example’s dependencies from its folder:

```sh
cd examples/fastify/
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
Refresh the page to trigger the rate limit: you should see “Too many requests”.
You’ll be blocked for 10 seconds.

You can also send a `POST` request to hit sensitive info protection:

```sh
$ curl http://localhost:3000 --data "My email is test@example.com" --header "Content-Type: text/plain" --request POST
{"message":"Message contains sensitive info"}
$ curl http://localhost:3000 --data "Here’s a string that contains-some-dashes" --header "Content-Type: text/plain" --request POST
{"message":"Thanks for the submission"}
```

[fastify]: https://fastify.dev/
