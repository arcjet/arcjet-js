//#region \0./wasm/arcjet_analyze_js_req.component.core2.js
/**
* This file contains an Arcjet Wasm binary inlined as a base64
* [Data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)
* with the application/wasm MIME type.
*
* This was chosen to save on storage space over inlining the file directly as
* a Uint8Array, which would take up ~3x the space of the Wasm file. See
* https://blobfolio.com/2019/better-binary-batter-mixing-base64-and-uint8array/
* for more details.
*
* It is then decoded into an ArrayBuffer to be used directly via WebAssembly's
* `compile()` function in our entry point file.
*
* This is all done to avoid trying to read or bundle the Wasm asset in various
* ways based on the platform or bundler a user is targeting. One example being
* that Next.js requires special `asyncWebAssembly` webpack config to load our
* Wasm file if we don't do this.
*
* In the future, we hope to do away with this workaround when all bundlers
* properly support consistent asset bundling techniques.
*/
const wasmBase64 = "data:application/wasm;base64,AGFzbQEAAAABFQNgA39/fwBgBH9/f38Bf2ACf38BfwMJCAABAAACAgICBAUBcAEICAcsCQEwAAABMQABATIAAgEzAAMBNAAEATUABQE2AAYBNwAHCCRpbXBvcnRzAQAKawgNACAAIAEgAkEAEQAACw8AIAAgASACIANBAREBAAsNACAAIAEgAkECEQAACw0AIAAgASACQQMRAAALCwAgACABQQQRAgALCwAgACABQQURAgALCwAgACABQQYRAgALCwAgACABQQcRAgALAC8JcHJvZHVjZXJzAQxwcm9jZXNzZWQtYnkBDXdpdC1jb21wb25lbnQHMC4yNDQuMA==";
/**
* Returns a WebAssembly.Module for an Arcjet Wasm binary, decoded from a base64
* Data URL.
*/
async function wasm() {
	const buf = await (await fetch(wasmBase64, { cache: "no-store" })).arrayBuffer();
	return WebAssembly.compile(buf);
}
//#endregion
export { wasm };
