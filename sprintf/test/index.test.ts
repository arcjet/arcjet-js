import assert from "node:assert/strict";
import test from "node:test";

test("@arcjet/sprintf", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("@arcjet/sprintf")).sort(), [
      // TODO(@wooorm-arcjet): named exports.
      "default",
    ]);
  });
});
