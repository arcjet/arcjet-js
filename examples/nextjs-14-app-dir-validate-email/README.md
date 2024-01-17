<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet email verification with Next.js 14 using the App Router

This example shows how to use Arcjet with a Next.js [route
handler](https://nextjs.org/docs/app/building-your-application/routing/route-handlers).

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-14-app-dir-validate-email
   npm ci
   ```

3. Add your Arcjet key to `.env.local`

   ```env
   AJ_KEY=
   ```

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000/api/arcjet`.
6. Refresh the page to see the email verification fail due to no MX records
   existing on the domain.
