/**
 * Vercel uses the `.wasm?module` suffix to make WebAssembly available in their
 * Vercel Functions product.
 *
 * https://vercel.com/docs/functions/wasm#using-a-webassembly-file
 */
declare module "*.wasm?module" {
  export default WebAssembly.Module;
}

/**
 * The Cloudflare docs say they support the `.wasm?module` suffix, but that
 * seems to no longer be the case with Wrangler 2 so we need to have separate
 * imports for just the `.wasm` files.
 *
 * https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/#bundling
 */
declare module "*.wasm" {
  export default WebAssembly.Module;
}

/**
 * Our Rollup build turns `.wasm?js` imports into JS imports that provide the
 * `wasm()` function which decodes a base64 Data URL into a WebAssembly Module
 */
declare module "*.wasm?js" {
  export function wasm(): Promise<WebAssembly.Module>;
}
