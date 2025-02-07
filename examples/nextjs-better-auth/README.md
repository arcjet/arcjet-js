<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet bot detection with Next.js + Better Auth

This example shows how to use Arcjet with [Better
Auth](https://www.better-auth.com). Arcjet is implemented as a wrapper around
the `POST` handler in `app/api/auth/[...all]/route.ts`.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-better-auth
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key and a
   secret for Better Auth. You will need to [create a GitHub OAuth
   app](https://github.com/settings/applications) for testing (see the [Better
   Auth docs](https://www.better-auth.com/docs/authentication/github)).

4. Run the database migration. A SQLite database is used for this example.

   ```bash
   npx @better-auth/cli migrate
   ```

5. Start the dev server.

   ```bash
   npm run dev
   ```

6. Visit `http://localhost:3000`.
