<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Rate Limit / Clerk Authentication Example

This example shows how to use an Arcjet rate limit with a user ID from [Clerk
authentication and Next.js](https://clerk.com/docs/quickstarts/nextjs).

It sets up 2 API routes:

* `/api/public` does not require authentication and has a low rate limit based
  on the user IP address.
* `/api/private` uses Clerk authentication and has a higher rate limit based on
  the Clerk user ID.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-14-clerk-rl
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet and Clerk
   keys.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`.
6. Try the different routes linked on the page.
