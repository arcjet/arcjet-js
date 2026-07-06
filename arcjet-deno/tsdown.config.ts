import { readFileSync } from "node:fs";

import { defineConfig } from "tsdown";

const { version } = JSON.parse(readFileSync(new URL("package.json", import.meta.url), "utf8"));

/**
 * Replace the `__ARCJET_SDK_VERSION__` placeholder with the version from
 * `package.json`, as the replace step of the old `@arcjet/rollup-config` did.
 * The SDK reports this version to the Arcjet API with every request.
 */
const replaceSdkVersion = {
  name: "replace-sdk-version",
  transform(code: string) {
    if (!code.includes("__ARCJET_SDK_VERSION__")) {
      return null;
    }
    return { code: code.replaceAll("__ARCJET_SDK_VERSION__", version), map: null };
  },
};

export default defineConfig({
  entry: ["src/*.ts"],
  format: "esm",
  platform: "neutral",
  // Externalize Node builtins, framework virtual modules, and runtime-provided
  // modules (Bun, SvelteKit). Package dependencies are auto-externalized.
  deps: { neverBundle: [/^node:/, /^astro:/, "bun", "$env/dynamic/private"] },
  unbundle: true,
  dts: true,
  clean: true,
  plugins: [replaceSdkVersion],
});
