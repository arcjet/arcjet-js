import { makeHasher } from "./hasher.js";

export * from "./hasher.js";
export const hash = makeHasher(crypto.subtle);
