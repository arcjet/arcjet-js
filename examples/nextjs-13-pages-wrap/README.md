<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Using `withArcjet` with Next.js 13 and the Pages Router

This example shows how to use `withArcjet` in a Next.js [API
Route](https://nextjs.org/docs/pages/building-your-application/routing/api-routes).

## How to use

1. Enter this directory and install the dependencies.

   ```bash
   cd examples/nextjs-13-pages-wrap
   npm ci
   ```

2. Start the dev server.

   ```bash
   npm run dev
   ```

3. Visit `http://localhost:3000/api/arcjet`.
4. Refresh the page to trigger the rate limit.
