<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Nosecone / Auth.js 5 Chained Middleware Example

This example shows how to create a base Auth.js setup with Nosecone chained in
the middleware to provide security headers.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-authjs-nosecone
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and fill in the required
   environment variables. You will need to [create a GitHub OAuth
   app](https://github.com/settings/applications) for testing. The callback URL
   setting for your OAuth app is usually `http://localhost:3000`.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`.
6. Inspect the network requests to see the default security headers.
