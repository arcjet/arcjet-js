<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Protection with Svelte

This example shows how to use Arcjet to protect [SvelteKit](https://kit.svelte.dev/) apps.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/svelte
   npm ci
   ```

3. Rename `.env.example` to `.env` and add your Arcjet key.

4. Start the server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:5173/` in a browser and follow the links to test the various examples.

7. Test shield by making this request:

    ```bash
    curl -v -H "x-arcjet-suspicious: true" http://localhost:5173
    ```

## How it works

This example uses the generic [`arcjet`](https://www.npmjs.com/package/arcjet) package.

The `arcjet` instance is created in `/src/hooks.server.ts`, which is configured to use [Shield](https://docs.arcjet.com/shield) for all protected requests. The hooks file also sets up an object containing the request information required by arcjet's `protect()` method.

The home page's server-side scripts in `/src/routes/+page.server.ts` retrieve the `arcjet` instance, and call its `protect()` method, thereby protecting this page through [Shield](https://docs.arcjet.com/shield).

The rate-limited page also has a server-side script file at `/src/routes/rate-limited/+page.server.ts`, which retrieves the `arcjet` instance, and then applies extra rate-limiting rules before calling the `protect()` method.

Finally, the rate-limited API end-point performs the same augmentation of the rules as the rate-limted web page, as can be seen in `/src/routes/api/rate-limited/+server.ts`.