<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Protecting a Next.js React Hook Form with Arcjet

This example shows how to protect a Next.js React Hook Form with [Arcjet signup
form protection](https://docs.arcjet.com/signup-protection/concepts). It uses
[shadcn/ui](https://ui.shadcn.com/) form components to build the [React Hook
Form](https://react-hook-form.com/) with both client and server side validation.

This includes:

- Form handling with [React Hook Form](https://react-hook-form.com/).
- Client-side validation with [Zod](https://zod.dev/).
- Server-side validation with Zod and [Arcjet email
  validation](https://docs.arcjet.com/email-validation/concepts).
- Server-side email verification with Arcjet to check if the email is from a
  disposable provider and that the domain has a valid MX record.
- [Rate limiting with
  Arcjet](https://docs.arcjet.com/rate-limiting/quick-start/nextjs) set to 5
  requests over a 10 minute sliding window - a reasonable limit for a signup
  form, but easily configurable.
- [Bot protection with
  Arcjet](https://docs.arcjet.com/bot-protection/quick-start/nextjs) to stop
  automated clients from submitting the form.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-14-react-hook-form
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

4. Start the dev server.

   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000`.
6. Submit the form with the example non-existent email to show the errors.
   Submit it more than 5 times to trigger the rate limit.
