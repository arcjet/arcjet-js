import assert from "node:assert/strict";
import test from "node:test";

test("@arcjet/stable-hash", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "bool",
      "float64",
      "hash",
      "makeHasher",
      "string",
      "stringSliceOrdered",
      "uint32",
    ]);
  });
});
