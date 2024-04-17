<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/arcjet-logo-minimal-dark-mark-all.svg">
    <img src="https://arcjet.com/arcjet-logo-minimal-light-mark-all.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Protecting a Next.js React Hook Form with Arcjet

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/arcjet/arcjet-js/tree/main/examples/nextjs-14-react-hook-form&project-name=aj-react-hook-form&repository-name=aj-react-hook-form&redirect-url=https://app.arcjet.com/teams&developer-id=oac_1GEcKBuKBilVnjToj1QUwdb8&integration-ids=oac_1GEcKBuKBilVnjToj1QUwdb8&demo-title=Protect React Hook Form&demo-description=Protect a Next.js React Hook Form with Arcjet signup form protection.&demo-url=https://github.com/arcjet/arcjet-js/tree/main/examples/nextjs-14-react-hook-form&demo-image=https://app.arcjet.com/img/example-apps/vercel/demo-image.jpg&external-id=aj-react-hook-form)

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

These are all combined using the Arcjet `protectSignup` rule
([docs](https://docs.arcjet.com/signup-protection/concepts)), but they can also
be used separately on different routes.

## How to use

1. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-14-react-hook-form
   npm ci
   ```

2. Rename `.env.local.example` to `.env.local` and add your Arcjet key.

3. Start the dev server.

   ```bash
   npm run dev
   ```

4. Visit `http://localhost:3000`.
5. Submit the form with the example non-existent email to show the errors.
   Submit it more than 5 times to trigger the rate limit.