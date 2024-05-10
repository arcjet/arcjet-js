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

...TBC