import assert from "node:assert/strict";
import test from "node:test";

test("@arcjet/stable-hash", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      // TODO(@wooorm-arcjet): discuss different names,
      // `hashBool`, `hashString`, `hashUint32`.
      // For `stringSliceOrdered`, the ordering seems to be implied for stable hashing,
      // `slice` seems to mean array`, perhaps `arrayString` or `stringArray`?
      "bool",
      "hash",
      "makeHasher",
      "string",
      "stringSliceOrdered",
      "uint32",
    ]);
  });
});
