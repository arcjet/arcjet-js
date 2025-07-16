import { subtle } from "node:crypto";

import { makeHasher } from "./hasher.js";

export {
  type FieldHasher,
  type StringWriter,
  bool,
  makeHasher,
  stringSliceOrdered,
  string,
  uint32,
} from "./hasher.js";
export const hash = makeHasher(subtle);
