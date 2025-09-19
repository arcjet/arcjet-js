<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Protection with Svelte

This example shows how to use Arcjet to protect [SvelteKit](https://kit.svelte.dev/) apps.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/sveltekit
   npm ci
   ```

3. Rename `.env.example` to `.env` and add your Arcjet key.

4. Start the server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:5173/` in a browser and follow the links to test the various examples.

6. Test shield by making this request:

   ```bash
   curl -v -H "x-arcjet-suspicious: true" http://localhost:5173
   ```

## How it works

The `arcjet` instance is created in the server-only module `/src/lib/server/arcjet.ts` and is configured to enable [Shield](https://docs.arcjet.com/shield).

`/src/hooks.server.ts` imports the `arcjet` instance and runs the `protect()` method on all requests. The only exception is any requests who's pathanme is listed in `filteredRoutes`, in which case protection is left to that route's server code.

The rate-limited page has a server-side script file at `/src/routes/rate-limited/+page.server.ts`, which imports the `arcjet` instance, and then applies extra rate-limiting rules before calling the `protect()` method.

Finally, the rate-limited API end-point performs the same augmentation of the rules as the rate-limted web page, as can be seen in `/src/routes/api/rate-limited/+server.ts`.
