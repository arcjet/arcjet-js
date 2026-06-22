import { defineConfig } from "tsdown";

/**
 * Keep the generated Protobuf code under `proto/` external.
 *
 * It is shipped verbatim and imported relatively (it was never bundled by the
 * previous Rollup build), so leaving those imports external and copying the
 * directory into `dist/` keeps every generated export untouched (no tree
 * shaking).
 *
 * @internal
 */
const externalizeProto = {
  name: "externalize-proto",
  resolveId(source: string) {
    if (source.includes("/proto/") && source.endsWith(".js")) {
      return { id: source, external: true };
    }
    return null;
  },
};

export default defineConfig({
  entry: ["src/*.ts"],
  format: "esm",
  platform: "neutral",
  deps: { neverBundle: [/^node:/, /^astro:/, "bun", "$env/dynamic/private"] },
  unbundle: true,
  dts: true,
  clean: true,
  copy: [{ from: "src/proto", to: "dist" }],
  plugins: [externalizeProto],
});
