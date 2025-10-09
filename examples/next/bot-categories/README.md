<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Bot Detection leveraging categories with Next.js

This example shows how to use Arcjet to allow detected bots based on categories,
individual selection, and filtering bots out of defined categories.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/next/bot-categories
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Use curl to access the API and display headers:
   ```sh
   curl -v localhost:3000/api/arcjet
   ```
   These headers in our terminal output inform us that `CURL` was detected and
   allowed because of `CATEGORY:TOOL`.
   ```txt
   x-arcjet-bot-allowed: CATEGORY:TOOL, CURL
   x-arcjet-bot-denied:
   ```
6. Now, change the User-Agent we are sending:
   ```sh
   curl -v -A "vercel-screenshot" localhost:3000/api/arcjet
   ```
   These headers inform us that `VERCEL_MONITOR_PREVIEW` was detected and
   allowed, but it did not belong to our selected categories.
   ```txt
   x-arcjet-bot-allowed: VERCEL_MONITOR_PREVIEW
   x-arcjet-bot-denied:
   ```
7. Finally, pretend to be Google's AdsBot:
   ```sh
   curl -v -A "AdsBot-Google" localhost:3000/api/arcjet
   ```
   These headers inform us that `GOOGLE_ADSBOT` was detected and blocked. It
   does not list the `CATEGORY:GOOGLE` because we programatically filtered the
   list, which translates our category into all individual items.
   ```txt
   x-arcjet-bot-allowed:
   x-arcjet-bot-denied: GOOGLE_ADSBOT
   ```
