<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Rate Limit with Bun.sh

This example shows how to use Arcjet with a
[Bun.sh](https://bun.sh/guides/http/server) server.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/bun
   bun install
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the server.

   ```bash
   bun run --hot index.ts
   ```

5. Visit `http://localhost:3000/`. Note: If you load this in a browser, you will
   see 2 requests - one for the page and one for a favicon.
6. Refresh the page to trigger the rate limit.
