<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Protection with NestJS

This example shows how to use Arcjet to protect [NestJS](https://nestjs.com/)
applications using the `@arcjet/nest` adapter.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nest/basic
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the server.

   ```bash
   npm run start:dev
   ```

5. Visit `http://localhost:3000/` in a browser.

6. Visit `http://localhost:3000/rate-limit` in a browser and refresh the page to
   trigger the rate limit.

7. Execute a POST request to `http://localhost:3000/sensitive-info` without any
   sensitive data.

   ```bash
   curl http://localhost:3000/sensitive-info -H "Content-Type: text/plain" -X POST --data "hello world!"
   ```

8. Execute a POST request to `http://localhost:3000/sensitive-info` with a
   phone number in the body and the request should fail.

   ```bash
   curl http://localhost:3000/sensitive-info -H "Content-Type: text/plain" -X POST --data "my phone number is (555)-555-5555"
   ```

9. Execute a POST request to `http://localhost:3000/email` with an invalid email
   and the request should fail.

   ```bash
   curl http://localhost:3000/email -H "Content-Type: text/plain" -X POST --data "test@arcjettest.com"
   ```

10. Execute a GET request to `http://localhost:3000/bot` with the `curl` command
    and the request should fail.

    ```bash
    curl http://localhost:3000/bot
    ```
