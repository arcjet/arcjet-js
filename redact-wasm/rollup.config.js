import { URL, fileURLToPath } from "node:url";
import { createConfig, transpileComponent } from "@arcjet/rollup-config";

export default createConfig(import.meta.url, {
  plugins: [
    transpileComponent(
      new URL(
        "wasm/arcjet_analyze_bindings_redact.component.wasm",
        import.meta.url,
      ),
      {
        instantiation: "async",
        name: "arcjet_analyze_bindings_redact.component",
        nodejsCompat: false,
        outDir: fileURLToPath(new URL("wasm/", import.meta.url)),
      },
    ),
  ],
});
