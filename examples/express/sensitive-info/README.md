<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Sensitive Info Detection with Express for Node.js

This example shows how to use Arcjet to perform Sensitive Information detection with a Node.js
[Express](https://expressjs.com/) server.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/express/sensitive-info
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the server.

   ```bash
   npm start
   ```

   This assumes you're using Node.js 20 or later because the `start` script
   loads a local environment file with `--env-file`. If you're using an older
   version of Node.js, you can use a package like
   [dotenv](https://www.npmjs.com/package/dotenv) to load the environment file.

4. Execute to POST request to `http://localhost:3000/` without any sensitive data.
   `curl http://localhost:3000/ -H "Content-Type: text/plain" -X POST --data "hello world!"`
5. Execute to POST request to `http://localhost:3000/` with some blocked entities in the body
   and the request should fail.
   `curl http://localhost:3000/ -H "Content-Type: text/plain" -X POST --data "my email address is test@example.com"`
