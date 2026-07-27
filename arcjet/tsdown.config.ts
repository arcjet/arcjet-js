import { defineConfig } from "tsdown";

const externalizeProto = {
  name: "externalize-guard-proto",
  resolveId(source: string): { id: string; external: true } | null {
    if (source.includes("/guard/proto/") && source.endsWith(".js")) {
      return { id: source, external: true };
    }
    return null;
  },
};

export default defineConfig({
  entry: ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts", "!src/guard/test/**"],
  format: "esm",
  platform: "neutral",
  // Externalize Node builtins, framework virtual modules, and runtime-provided
  // modules (Bun, SvelteKit). Package dependencies are auto-externalized.
  deps: { neverBundle: [/^node:/, /^astro:/, "bun", "$env/dynamic/private"] },
  unbundle: true,
  dts: true,
  clean: true,
  copy: [{ from: "src/guard/proto", to: "dist/guard" }],
  plugins: [externalizeProto],
});
