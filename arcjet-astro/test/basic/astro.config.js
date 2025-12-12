// @ts-check
import arcjet, { sensitiveInfo } from "@arcjet/astro";
import node from "@astrojs/node";
import { defineConfig } from "astro/config";

export default defineConfig({
  adapter: node({ mode: "standalone" }),
  integrations: [
    arcjet({
      // @ts-expect-error: TODO: fix types.
      rules: [sensitiveInfo({ deny: ["EMAIL"], mode: "LIVE" })],
    }),
  ],
  output: "server",
});
