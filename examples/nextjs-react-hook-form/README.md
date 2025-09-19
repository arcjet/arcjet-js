<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Protecting a Next.js React Hook Form with Arcjet

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Farcjet%2Farcjet-js%2Ftree%2Fmain%2Fexamples%2Fnextjs-react-hook-form&project-name=aj-react-hook-form&repository-name=aj-react-hook-form&developer-id=oac_1GEcKBuKBilVnjToj1QUwdb8&demo-title=Arcjet%20Form%20Protection&demo-description=Next.js%20rate%20limiting%2C%20bot%20protection%2C%20email%20verification%20%26%20form%20protection.&demo-url=https%3A%2F%2Fgithub.com%2Farcjet%2Farcjet-js%2Ftree%2Fmain%2Fexamples%2Fnextjs-react-hook-form&demo-image=https%3A%2F%2Fapp.arcjet.com%2Fimg%2Fexample-apps%2Fvercel%2Fdemo-image.jpg&integration-ids=oac_1GEcKBuKBilVnjToj1QUwdb8&external-id=aj-react-hook-form)

This example shows how to protect a Next.js React Hook Form with [Arcjet signup
form protection](https://docs.arcjet.com/signup-protection). It uses
[shadcn/ui](https://ui.shadcn.com/) form components to build the [React Hook
Form](https://react-hook-form.com/) with both client and server side validation.

This includes:

- Form handling with [React Hook Form](https://react-hook-form.com/).
- Client-side validation with [Zod](https://zod.dev/).
- Server-side validation with Zod and [Arcjet email
  validation](https://docs.arcjet.com/email-validation).
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
([docs](https://docs.arcjet.com/signup-protection)), but they can also
be used separately on different routes.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci && npm run build
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nextjs-react-hook-form
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
