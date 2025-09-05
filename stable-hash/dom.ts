import { makeHasher } from "./hasher.js";

export * from "./hasher.js";

// @ts-ignore: this value exists in Edge Light, as it implements the DOM type for it.
// See <https://vercel.com/docs/functions/runtimes/edge#crypto-apis>.
// This can be verified by adding `/// <reference lib="dom" />` above.
// But we don’t want to load the entire DOM types or edge-light-specific types.
export const hash = makeHasher(crypto.subtle);
