// @ts-check
import { defineConfig } from "astro/config";

import node from "@astrojs/node";
import arcjet, { detectBot, shield } from "@arcjet/astro";

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
      rules: [shield({ mode: "LIVE" }), detectBot({ mode: "LIVE", allow: [] })],
    }),
  ],
});
