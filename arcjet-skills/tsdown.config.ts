import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/*.ts"],
  format: "esm",
  platform: "neutral",
  // Externalize Node builtins, framework virtual modules, and runtime-provided
  // modules (Bun, SvelteKit). Package dependencies are auto-externalized.
  deps: { neverBundle: [/^node:/, /^astro:/, "bun", "$env/dynamic/private"] },
  unbundle: true,
  dts: true,
  clean: true,
});
