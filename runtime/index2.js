//#region index.js
/**
* Detect the current runtime environment at runtime.
*
* @returns
*   Runtime; empty string if not found.
*/
function runtime() {
	if (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers") return "workerd";
	if (typeof Deno !== "undefined") return "deno";
	if (typeof Bun !== "undefined") return "bun";
	if (typeof EdgeRuntime !== "undefined") return "edge-light";
	if (typeof process !== "undefined" && process?.release?.name === "node") return "node";
	return "";
}
//#endregion
export { runtime };
