<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Rate Limit with Hono for Bun.sh

This example shows how to use Arcjet with a Bun.sh
[Hono](https://hono.dev/getting-started/bun) server.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/bun-hono-rl
   bun install
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the server.

   ```bash
   bun run index.ts
   ```

5. Visit `http://localhost:3000/`.
6. Refresh the page to trigger the rate limit.
