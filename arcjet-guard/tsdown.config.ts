import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/*.ts", "!src/**/*.test.ts"],
  format: "esm",
  platform: "neutral",
  deps: { neverBundle: [/^node:/, /^astro:/, "bun", "$env/dynamic/private"] },
  unbundle: true,
  dts: true,
  clean: true,
});
