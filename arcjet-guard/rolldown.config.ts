import { globSync } from "node:fs";
import { isBuiltin } from "node:module";

import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

import pkg from "./package.json" with { type: "json" };

const dependencies = Object.keys(pkg.dependencies ?? {});
const devDependencies = Object.keys(pkg.devDependencies ?? {});

const input = globSync("src/**/*.ts", { exclude: ["**/*.d.ts", "**/*.test.ts"] });

export default defineConfig({
  input,
  plugins: [dts()],
  output: {
    cleanDir: true,
    dir: "dist",
    format: "esm",
    preserveModules: true,
    preserveModulesRoot: "src",
  },
  platform: "neutral",
  tsconfig: "./tsconfig.json",
  external(id: string): boolean {
    return (
      isBuiltin(id) ||
      dependencies.some((dep) => id.startsWith(dep)) ||
      devDependencies.some((dep) => id.startsWith(dep))
    );
  },
});
