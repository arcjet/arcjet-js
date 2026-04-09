import { globSync, readFileSync } from "node:fs";
import { isBuiltin } from "node:module";

import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";

import pkg from "./package.json" with { type: "json" };

const dependencies = Object.keys(pkg.dependencies ?? {});
const devDependencies = Object.keys(pkg.devDependencies ?? {});
const peerDependencies = Object.keys(pkg.peerDependencies ?? {});

function replace(values: Record<string, string>): import("rolldown").Plugin {
  return {
    name: "replace",
    transform(code) {
      let result = code;
      for (const [key, value] of Object.entries(values)) {
        result = result.replaceAll(key, value);
      }
      if (result !== code) {
        return { code: result };
      }
    },
  };
}

const version = JSON.parse(readFileSync("./package.json", "utf8")).version as string;

const input = [
  ...globSync("*.ts", { exclude: ["*.d.ts", "*.config.ts"] }),
  ...globSync("test/**/*.ts"),
];

export default defineConfig({
  input,
  plugins: [
    replace({
      __ARCJET_SDK_VERSION__: version,
    }),
    {
      name: "externalize-protobuf",
      resolveId(source) {
        if (
          source === "./proto/decide/v1alpha1/decide_pb.js" ||
          source === "../proto/decide/v1alpha1/decide_pb.js"
        ) {
          return { id: source, external: true };
        }
        return null;
      },
    },
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
      peerDependencies.some((dep) => id.startsWith(dep))
    );
  },
});
