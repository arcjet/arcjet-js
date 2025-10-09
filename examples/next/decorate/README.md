<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet response decoration with Next.js

This example shows how to use Arcjet response decoration with different Next.js
[route
handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers).

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/next/decorate
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000/api/arcjet` for pages response decoration.
6. Refresh the page to trigger the rate limit.
7. Visit `http://localhost:3000/api-app/arcjet` for app response decoration.
8. Refresh the page to trigger the different rate limit.
