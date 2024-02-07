<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet rate limit OpenAI chat route with Next.js 14

This example shows how to implement a rate limit on a Next.js 14 API route which
uses the OpenAI chat API.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-14-openai
   npm ci
   ```

3. Add your Arcjet & OpenAI keys to `.env.local`

   ```env
   ARCJET_KEY=
   OPENAI_API_KEY=
   ```

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`.
6. Refresh the page to trigger the rate limit.
