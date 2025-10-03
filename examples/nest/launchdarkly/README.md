<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Protection with NestJS configured with LaunchDarkly

This example shows how to use Arcjet to protect [NestJS](https://nestjs.com/)
applications using the `@arcjet/nest` adapter with rule configuration loaded via
[LaunchDarkly](https://launchdarkly.com) feature flags.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/nest/launchdarkly
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your [Arcjet
   key](https://app.arcjet.com) and LaunchDarkly SDK key ([click on the project
   name in this list to be taken to the SDK
   keys](https://app.launchdarkly.com/settings/projects)).

4. Create four flags in LaunchDarkly with the following settings:
   - Shield Mode:
      - Name: `shieldMode`
      - Key: `shieldMode`
      - Configuration: **Custom**
      - Is this flag temporary? No
      - Flag Type: String
      - Variations
         1. Name: `LIVE`, value: `LIVE`
         2. Name: `DRY_RUN`, value: `DRY_RUN`
      - Default Variations
         * Serve when targeting is ON: `LIVE`
         * Serve when targeting is OFF: `DRY_RUN`
   - Rate Limit Mode:
      - Name: `rateLimitMode`
      - Key: `rateLimitMode`
      - Configuration: **Custom**
      - Is this flag temporary? No
      - Flag Type: String
      - Variations
         1. Name: `LIVE`, value: `LIVE`
         2. Name: `DRY_RUN`, value: `DRY_RUN`
      - Default Variations
         * Serve when targeting is ON: `LIVE`
         * Serve when targeting is OFF: `DRY_RUN`
   - Rate Limit Max:
      - Name: `rateLimitMax`
      - Key: `rateLimitMax`
      - Configuration: **Custom**
      - Is this flag temporary? No
      - Flag Type: Number
      - Variations
         1. Name: `Regular`, value: `100`
         2. Name: `Clamped Down`, value: `2`
      - Default Variations
         * Serve when targeting is ON: `Regular`
         * Serve when targeting is OFF: `Clamped Down`
   - Rate Limit Window:
      - Name: `rateLimitWindow`
      - Key: `rateLimitWindow`
      - Configuration: **Custom**
      - Is this flag temporary? No
      - Flag Type: String
      - Variations
         1. Name: `Regular`, value: `60s`
         2. Name: `Clamped Down`, value: `10s`
      - Default Variations
         * Serve when targeting is ON: `Regular`
         * Serve when targeting is OFF: `Clamped Down`

5. For each of the flags you just created, open them, toggle the "Off/On"
   switch at the top of the page to the "On" position, click "Review and save",
   and "Save changes".

6. Start the server.

   ```bash
   npm run start:dev
   ```

7. Visit `http://localhost:3000/`.

8. Refresh the page about 5-10 times. The rate limit should not be hit.

9. Go to the "Contexts" section in the LaunchDarkly dashboard and click on
   "guest".

10. Change the `rateLimitMax` and `rateLimitWindow` to `Clamped Down`, click
    "Review and save", then "Save changes" in the modeal that appears.

11. Restart your NestJS application.

12. Refresh another few times to see the rate limit take effect.
