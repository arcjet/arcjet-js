// Basic interface of WebAssembly that we use.
// See:
// <https://github.com/microsoft/TypeScript/blob/7956c0016/src/lib/dom.generated.d.ts#L37654>.
// This only includes `Module` which we use here.
// This can be removed when WebAssembly is in `@types/node` as we use that here.
declare namespace WebAssemblyLike {
  type ImportExportKind = "function" | "global" | "memory" | "table";

  interface ModuleExportDescriptor {
    kind: ImportExportKind;
    name: string;
  }

  interface ModuleImportDescriptor {
    kind: ImportExportKind;
    module: string;
    name: string;
  }

  interface Module {}

  const Module: {
    prototype: Module;
    new (bytes: ArrayBufferView<ArrayBuffer> | ArrayBuffer): Module;
    customSections(moduleObject: Module, sectionName: string): ArrayBuffer[];
    exports(moduleObject: Module): ModuleExportDescriptor[];
    imports(moduleObject: Module): ModuleImportDescriptor[];
  };
}

/**
 * Vercel uses the `.wasm?module` suffix to make WebAssembly available in their
 * Vercel Functions product.
 *
 * https://vercel.com/docs/functions/wasm#using-a-webassembly-file
 */
declare module "*.wasm?module" {
  export default WebAssemblyLike.Module;
}

/**
 * The Cloudflare docs say they support the `.wasm?module` suffix, but that
 * seems to no longer be the case with Wrangler 2 so we need to have separate
 * imports for just the `.wasm` files.
 *
 * https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/#bundling
 */
declare module "*.wasm" {
  export default WebAssemblyLike.Module;
}

/**
 * Our Rollup build turns `.wasm?js` imports into JS imports that provide the
 * `wasm()` function which decodes a base64 Data URL into a WebAssembly Module
 */
declare module "*.wasm?js" {
  export function wasm(): Promise<WebAssemblyLike.Module>;
}
