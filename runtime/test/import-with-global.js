import { createContext, runInContext, SourceTextModule } from "node:vm";
import { readFile } from "node:fs/promises";

export async function importWithGlobal(target, global) {

  async function linker(specifier) {
    if (specifier === target) {
      const src = await readFile(new URL(specifier, import.meta.url), "utf-8");
      return new SourceTextModule(src, { context });
    }

    throw new Error(`Unable to link unknown specifier: ${specifier}`);
  }


  const context = createContext(global);
  const mod = new SourceTextModule(`export * from "${target}"`, { context });
  await mod.link(linker);

  const isolatedModule = runInContext(`import("${target}")`, context, {
    importModuleDynamically(specifier, script, assertions) {
      if (specifier === target) {
        return mod
      }

      throw new Error(`Unable to import unknown specifier: ${specifier}`);
    }
  })
  return isolatedModule
}
