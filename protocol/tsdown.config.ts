import { defineConfig } from "tsdown";

// The generated Protobuf code under `proto/` is shipped verbatim and imported
// relatively (it was never bundled by the previous Rollup build). Keep those
// imports external and copy the directory into `dist/` so every generated
// export survives untouched (no tree shaking).
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
