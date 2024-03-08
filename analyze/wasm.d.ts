/**
 * Cloudflare uses the `.wasm?module` suffix to make WebAssembly
 * available in their Workers product. This is documented at
 * https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/#bundling
 * Next.js supports the same syntax, but it is undocumented.
 */
declare module "*.wasm?module" {
  export default WebAssembly.Module;
}

/**
 * Our Rollup build turns plain `.wasm` imports into JS imports that provide the
 * `wasm()` function which decodes a base64 Data URL into a WebAssembly Module
 */
declare module "*.wasm" {
  export function wasm(): Promise<WebAssembly.Module>;
}
