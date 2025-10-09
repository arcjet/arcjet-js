<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet protections with Remix

This example shows how to leverage Arcjet protections in a
[Remix](https://remix.run/) application.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory.

   ```bash
   cd examples/remix
   npm ci
   ```

3. Rename `.env.example` to `.env` and add your Arcjet key.

4. Start the server.

   ```bash
   npm start
   ```

5. Visit `http://localhost:3000/`.

6. Submit the form with some sensitive information and get denied.

7. Go back to `http://localhost:3000/` and refresh the page a view times to be
   rate limited.
