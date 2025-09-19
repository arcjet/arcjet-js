<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Rate Limit with Gatsby

This example shows how to use Arcjet with [Gatsby](https://www.gatsbyjs.com)
functions.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/gatsby-rate-limit
   npm ci
   ```

3. Rename `.env.development.example` to `.env.development` and add your Arcjet key.

4. Start the server.

   ```bash
   npm run develop
   ```

5. Visit `http://localhost:8000/`.
6. Press the button to get a message.
7. Press the button again to trigger the rate limit and get an error.
