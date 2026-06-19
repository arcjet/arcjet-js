import { defineConfig } from "tsdown";

// The generated Protobuf code under `proto/` is shipped verbatim and imported
// relatively. Keep those imports external and copy the directory into `dist/`
// so every generated export (and its `.d.ts`) survives untouched.
const externalizeProto = {
  name: "externalize-proto",
  resolveId(source: string): { id: string; external: true } | null {
    if (source.includes("/proto/") && source.endsWith(".js")) {
      return { id: source, external: true };
    }
    return null;
  },
};

export default defineConfig({
  // Tests are co-located in `src/`; exclude them and declaration files.
  entry: ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.d.ts"],
  format: "esm",
  platform: "neutral",
  deps: { neverBundle: [/^node:/, /^astro:/, "bun", "$env/dynamic/private"] },
  unbundle: true,
  dts: true,
  clean: true,
  copy: [{ from: "src/proto", to: "dist" }],
  plugins: [externalizeProto],
});
