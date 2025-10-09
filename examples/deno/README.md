<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Sensitive Info Detection with Deno

This example shows how to use Arcjet to perform Sensitive Information detection
with a [Deno](https://deno.com/) server.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory.

   ```bash
   cd examples/deno
   ```

3. Rename `.env.example` to `.env` and add your Arcjet key.

4. Start the server.

   ```bash
   deno task start
   ```

5. POST a request to `http://localhost:3000/` without any sensitive data.

   ```bash
   curl http://localhost:3000/ -H "Content-Type: text/plain" -X POST --data "hello world!"
   ```

6. POST a request to `http://localhost:3000/` with some blocked entities in the
   body and the request should fail.

   ```bash
   curl http://localhost:3000/ -H "Content-Type: text/plain" -X POST --data "my email address is test@example.com"
   ```
