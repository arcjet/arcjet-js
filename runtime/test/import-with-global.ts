import { createContext, runInContext, SourceTextModule } from "node:vm";
import { readFile } from "node:fs/promises";

export async function importWithGlobal(
  target: string,
  global: Record<string, unknown>,
) {
  const context = createContext(global);
  const mod = new SourceTextModule(`export * from "${target}"`, { context });
  await mod.link(async (specifier) => {
    if (specifier === target) {
      const src = await readFile(new URL(specifier, import.meta.url), "utf-8");
      return new SourceTextModule(src, { context });
    }

    throw new Error(`Unable to link unknown specifier: ${specifier}`);
  });

  const isolatedModule = runInContext(`import("${target}")`, context, {
    importModuleDynamically(specifier) {
      if (specifier === target) {
        return mod;
      }

      throw new Error(`Unable to import unknown specifier: ${specifier}`);
    },
  });
  return isolatedModule;
}
