import assert from "node:assert/strict";
import test from "node:test";

test("@arcjet/transport", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("@arcjet/transport")).sort(), [
      "createTransport",
    ]);
  });
});
