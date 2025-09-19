<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet rate limit OpenAI chat route with Next.js

This example shows how to implement a rate limit on a Next.js API route which
uses the OpenAI chat API. It uses the [openai-chat-tokens
library](https://github.com/hmarr/openai-chat-tokens) to track the number of
tokens used by a `gpt-3.5-turbo` AI chatbot.

There are 2 example routes:

1. `/api/chat` is the default route that tracks the user by IP address. It
applies a limit of 2,000 tokens per hour with a maximum of 5,000 tokens in the
bucket. This allows for a reasonable conversation length without consuming too
many tokens.

2. `/api/chat_userid` is a route that tracks the user by a unique identifier.
   You could use this to track a quota per authenticated user.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-openai
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet & OpenAI
   keys.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`.
6. Refresh the page to trigger the rate limit.
