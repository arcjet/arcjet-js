import { SourceTextModule, createContext, runInContext } from "node:vm";
import { readFile } from "node:fs/promises";

export async function importWithGlobal(
  target: string,
  global: Record<string, unknown>,
) {
  const context = createContext(global);
  const mod = new SourceTextModule(`export * from "${target}"`, { context });
  await mod.link(async (specifier) => {
    if (specifier === target) {
      // @ts-ignore: `await` for older vendors, `@ts-ignore` because it may not be typed.
      const href = await import.meta.resolve(specifier);
      const src = await readFile(new URL(href), "utf-8");
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
