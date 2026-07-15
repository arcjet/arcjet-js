import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/*.ts"],
  format: "esm",
  platform: "neutral",
  // Externalize Node builtins. Package dependencies (such as
  // `@huggingface/transformers`) are auto-externalized.
  deps: { neverBundle: [/^node:/] },
  unbundle: true,
  dts: true,
  clean: true,
});
