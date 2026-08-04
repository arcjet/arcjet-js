import * as crypto from "node:crypto";

import { makeHasher } from "./hasher.js";

export { bool, float64, makeHasher, string, stringSliceOrdered, uint32 } from "./hasher.js";

export type { FieldHasher, StringWriter } from "./hasher.js";
export const hash: ReturnType<typeof makeHasher> = makeHasher(crypto.subtle);
