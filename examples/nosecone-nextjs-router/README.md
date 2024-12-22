<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Nosecone + Next.js with custom middleware router

This example shows how to use
[Nosecone](https://docs.arcjet.com/nosecone/quick-start) with Next.js and a
custom middleware router to configure multiple middlewares for different routes.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nosecone-nextjs-router
   npm ci
   ```

3. Start the dev server.

   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000/`

5. Check the response headers to see the default Nosecone security headers.
