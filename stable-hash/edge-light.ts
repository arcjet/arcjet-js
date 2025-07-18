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
export const hash = makeHasher(crypto.subtle);
