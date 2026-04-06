// @ts-check
import { defineConfig } from "astro/config";

import node from "@astrojs/node";
import arcjet, { shield } from "@arcjet/astro";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  env: {
    validateSecrets: true
  },
  integrations: [
    arcjet({
      rules: [
        // Only Arcjet Shield is enabled everywhere.
        // All other rules are enabled conditionally in code.
        shield({ mode: "LIVE" }),
      ],
    }),
  ],
});
