import { defineConfig } from "tsdown";

import { base64Wasm, externalizeWasm } from "./wasm-plugins.js";

export default defineConfig({
  entry: ["src/*.ts"],
  format: "esm",
  platform: "neutral",
  deps: { neverBundle: [/^node:/, /^astro:/, "bun", "$env/dynamic/private"] },
  unbundle: true,
  dts: true,
  clean: true,
  // edge-light (`?module`) and workerd (bare `.wasm`) keep their core wasm
  // imports external, so the binaries must ship alongside the output.
  copy: [
    { from: "src/wasm/arcjet_analyze_bindings_redact.component.core.wasm", to: "dist/wasm" },
    { from: "src/wasm/arcjet_analyze_bindings_redact.component.core2.wasm", to: "dist/wasm" },
    { from: "src/wasm/arcjet_analyze_bindings_redact.component.core3.wasm", to: "dist/wasm" },
  ],
  plugins: [base64Wasm(), externalizeWasm()],
});
