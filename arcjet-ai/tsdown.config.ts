import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/*.ts"],
  format: "esm",
  platform: "neutral",
  // Externalize Node builtins. Package dependencies and peer dependencies
  // (`ai`, `@arcjet/guard`) are auto-externalized.
  deps: { neverBundle: [/^node:/] },
  unbundle: true,
  dts: true,
  clean: true,
});
