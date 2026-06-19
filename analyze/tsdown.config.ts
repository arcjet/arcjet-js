import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "neutral",
  // Preserve the module graph (equivalent to the previous Rollup
  // `preserveModules`/`output.preserveModules` behavior).
  unbundle: true,
  dts: true,
  clean: true,
});
