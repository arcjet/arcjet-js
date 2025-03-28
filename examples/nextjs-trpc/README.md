<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# TRPC Rate limiting using Arcjet

This example shows how to implement Rate Limiting in TRPC using Arcjet.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-trpc
   npm ci
   ```

3. Copy `.env.example` and name it `.env`, then add your Arcjet key.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000/`

6. Submit a post 4 or more times to observe the error.
