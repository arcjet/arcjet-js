import { bool, float64, makeHasher, string, stringSliceOrdered, uint32 } from "./hasher2.js";
import * as crypto from "node:crypto";
//#region index.js
const hash = makeHasher(crypto.subtle);
//#endregion
export { bool, float64, hash, makeHasher, string, stringSliceOrdered, uint32 };
