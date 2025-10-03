<a href="https://arcjet.com" target="_arcjet-home">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://arcjet.com/logo/arcjet-dark-lockup-voyage-horizontal.svg">
    <img src="https://arcjet.com/logo/arcjet-light-lockup-voyage-horizontal.svg" alt="Arcjet Logo" height="128" width="auto">
  </picture>
</a>

# Arcjet Dynamic Configuration via LaunchDarkly Feature Flags

This example shows how to dynamically configure Arcjet via
[LaunchDarkly](https://launchdarkly.com) feature flags. It is implemented with a Node.js
[Express](https://expressjs.com/) server, but the theory can apply to any environment.

## How to use

1. From the root of the project, install the SDK dependencies.

   ```bash
   npm ci
   ```

2. Enter this directory and install the example's dependencies.

   ```bash
   cd examples/express/launchdarkly
   npm ci
   ```

3. Rename `.env.local.example` to `.env.local` and add your [Arcjet key](https://app.arcjet.com)
and LaunchDarkly SDK key ([click on the project name in this list to be taken to the SDK
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
   - Sliding Window Mode:
      - Name: `slidingWindowMode`
      - Key: `slidingWindowMode`
      - Configuration: **Custom**
      - Is this flag temporary? No
      - Flag Type: String
      - Variations
         1. Name: `LIVE`, value: `LIVE`
         2. Name: `DRY_RUN`, value: `DRY_RUN`
      - Default Variations
         * Serve when targeting is ON: `LIVE`
         * Serve when targeting is OFF: `DRY_RUN`
   - Sliding Window Max:
      - Name: `slidingWindowMax`
      - Key: `slidingWindowMax`
      - Configuration: **Custom**
      - Is this flag temporary? No
      - Flag Type: Number
      - Variations
         1. Name: `Regular`, value: `100`
         2. Name: `Clamped Down`, value: `2`
      - Default Variations
         * Serve when targeting is ON: `Regular`
         * Serve when targeting is OFF: `Clamped Down`
   - Sliding Window Interval:
      - Name: `slidingWindowInterval`
      - Key: `slidingWindowInterval`
      - Configuration: **Custom**
      - Is this flag temporary? No
      - Flag Type: Number
      - Variations
         1. Name: `Regular`, value: `60`
         2. Name: `Clamped Down`, value: `10`
      - Default Variations
         * Serve when targeting is ON: `Regular`
         * Serve when targeting is OFF: `Clamped Down`

5. For each of the flags you just created, open them, toggle the “Off/On”
switch at the top of the page to the "On" position, click “Review and save”,
and “Save changes”.

6. Start the server.

   ```bash
   npm start
   ```

   This assumes you're using Node.js 20 or later because the `start` script
   loads a local environment file with `--env-file`. If you're using an older
   version of Node.js, you can use a package like
   [dotenv](https://www.npmjs.com/package/dotenv) to load the environment file.

7. Visit `http://localhost:3000/`.

8. Refresh the page about 5-10 times. The rate-limit should not be hit.

9. Go to the "Contexts" section in the LaunchDarkly dashboard and click on "guest".

10. Change the `slidingWindowMax` and `slidingWindowInterval` to `Clamped Down`,
click "Review and save", then "Save changes" in the modeal that appears.

11. Refresh your web application and note the new configuration is announced in
the terminal. Refresh another few times to see the rate-limit take effect.
