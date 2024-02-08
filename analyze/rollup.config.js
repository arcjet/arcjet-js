import { createConfig } from "@arcjet/rollup-config";

export default createConfig(import.meta.url, {
  plugins: [
    {
      name: "externalize-wasm-js",
      resolveId(id) {
        // We need to externalize this because otherwise some JS that edge can't
        // understand gets included in the bundle
        if (id === "./wasm/arcjet_analyze_js_req.js") {
          return { id, external: true };
        }
        // TODO: Generation of the below files could be handled via rollup
        // plugin so we wouldn't need to externalize here
        if (id === "./wasm/arcjet.wasm.js") {
          return { id, external: true };
        }
        if (
          id ===
          "./wasm/rate-limit/arcjet_analyze_bindings_rate_limit.component.core.js"
        ) {
          return { id, external: true };
        }
        if (
          id ===
          "./wasm/rate-limit/arcjet_analyze_bindings_rate_limit.component.core2.js"
        ) {
          return { id, external: true };
        }
        if (
          id ===
          "./wasm/rate-limit/arcjet_analyze_bindings_rate_limit.component.core3.js"
        ) {
          return { id, external: true };
        }
        return null;
      },
    },
  ],
});
