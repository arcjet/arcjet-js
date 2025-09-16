import { makeHasher } from "./hasher.js";

export * from "./hasher.js";

// @ts-ignore: this value exists in Workerd, as it implements the DOM type for it.
// See <https://developers.cloudflare.com/workers/runtime-apis/web-crypto/>.
// This can be verified by adding `/// <reference lib="dom" />` above.
// But we don’t want to load the entire DOM types or workerd-specific types.
export const hash = makeHasher(crypto.subtle);
