import * as crypto from "node:crypto";

import { makeHasher } from "./hasher.js";

export * from "./hasher.js";
export const hash: ReturnType<typeof makeHasher> = makeHasher(crypto.subtle);
