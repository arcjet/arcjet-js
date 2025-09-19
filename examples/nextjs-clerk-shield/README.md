<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Shield / Clerk Authentication Example

This example shows how to Arcjet Shield in middleware alongside the [Clerk authentication middleware for Next.js](https://clerk.com/docs/quickstarts/nextjs).

It sets up 1 API route:

* `/api/private` uses Clerk authentication.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-clerk-shield
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet and Clerk
   keys.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`.
