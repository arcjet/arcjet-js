import { globSync } from "node:fs";
import { isBuiltin } from "node:module";

import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

import pkg from "./package.json" with { type: "json" };

const dependencies = Object.keys(pkg.dependencies ?? {});
const devDependencies = Object.keys(pkg.devDependencies ?? {});
const peerDependencies = Object.keys(pkg.peerDependencies ?? {});

const input = [
  ...globSync("*.ts", { exclude: ["*.d.ts", "*.config.ts"] }),
  ...globSync("test/**/*.ts"),
];

export default defineConfig({
  input,
  plugins: [
    dts(),
  ],
  output: {
    dir: ".",
    format: "esm",
    preserveModules: true,
  },
  platform: "neutral",
  tsconfig: "./tsconfig.json",
  external(id: string): boolean {
    return (
      isBuiltin(id) ||
      dependencies.some((dep) => id.startsWith(dep)) ||
      devDependencies.some((dep) => id.startsWith(dep)) ||
      peerDependencies.some((dep) => id.startsWith(dep)) ||
      id === "bun" ||
      id === "$env/dynamic/private"
    );
  },
});
