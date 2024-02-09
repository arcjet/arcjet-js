import { createConfig } from "@arcjet/rollup-config";

export default createConfig(import.meta.url, {
  plugins: [
    {
      name: "externalize-wasm",
      resolveId(source) {
        // We need to externalize this because otherwise some JS that edge can't
        // understand gets included in the bundle
        if (source === "./wasm/arcjet_analyze_js_req.js") {
          return {
            id: "./wasm/arcjet_analyze_js_req.js",
            external: true,
          };
        }
        // TODO: Generation of this file can be handled via rollup plugin so we
        // wouldn't need to externalize here
        if (source === "./wasm/arcjet.wasm.js") {
          return {
            id: "./wasm/arcjet.wasm.js",
            external: true,
          };
        }
        return null;
      },
    },
  ],
});
