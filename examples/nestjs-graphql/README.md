<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Protection with NestJS + GraphQL

This example shows how to use Arcjet to protect [NestJS](https://nestjs.com/)
GraphQL applications using the `@arcjet/nest` adapter.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nestjs-graphql
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the server.

   ```bash
   npm run start:dev
   ```

5. Visit `http://localhost:3000/graphql` in a browser and submit a GraphQL
   query.

   ```graphql
   query {
      recipes {
         id
         title
         description
         ingredients
      }
   }
   ```

6. In the UI, change the headers to include `{ "user-agent": "curl" }` and
   submit another GraphQL query and the request should be blocked.
