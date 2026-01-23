<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Testing Arcjet with Express and Newman

This example shows how to test your [Express][express-docs] API routes are
protected by Arcjet using [Newman][newman-docs].

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/express-newman
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

5. In another terminal, run the included Postman Collections as tests:

   - `npx newman run tests/low-rate-limit.json`
   - `npx newman run tests/high-rate-limit.json -n 51`
   - `npx newman run tests/bots.json`

6. You can also stop your server and run them as part of your test suite via
   `npm test`.

[express-docs]: https://expressjs.com/
[newman-docs]: https://learning.postman.com/docs/collections/using-newman-cli/command-line-integration-with-newman/
