import { globSync } from "node:fs";
import { isBuiltin } from "node:module";

import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

import pkg from "./package.json" with { type: "json" };

const dependencies = Object.keys(pkg.dependencies ?? {});
const devDependencies = Object.keys(pkg.devDependencies ?? {});

const input = Object.fromEntries(
  globSync("src/**/*.ts", { exclude: ["**/*.d.ts", "**/*.test.ts"] }).map((f) => [
    f.replace(/\.ts$/, ""),
    f,
  ]),
);

export default defineConfig({
  input,
  plugins: [dts()],
  output: {
    dir: "dist",
    format: "esm",
    preserveModules: true,
  },
  platform: "neutral",
  tsconfig: "./tsconfig.json",
  transform: {
    define: {
      __ARCJET_SDK_VERSION__: JSON.stringify(pkg.version),
    },
  },
  external(id: string): boolean {
    return (
      isBuiltin(id) ||
      dependencies.some((dep) => id.startsWith(dep)) ||
      devDependencies.some((dep) => id.startsWith(dep))
    );
  },
});
