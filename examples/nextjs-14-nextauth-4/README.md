<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Rate Limit / NextAuth 4 Authentication Example

This example shows how to use an Arcjet rate limit with a user ID from [NextAuth
4 authentication and Next.js](https://next-auth.js.org/getting-started/example).

It sets up the `/api/arcjet` route.

* Unauthenticated users receive a low rate limit based on the user IP address.
* Users authenticated with NextAuth have a higher rate limit based on the user
  email.
* A bot detection rule is also added to check all requests.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-14-nextauth-4
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and fill in the required
   environment variables. You will need to [create a GitHub OAuth
   app](https://github.com/settings/applications) for testing.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`.
6. Try the different routes linked on the page.
