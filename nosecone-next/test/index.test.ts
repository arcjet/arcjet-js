import assert from "node:assert/strict";
import test from "node:test";

test("@nosecone/next", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("@nosecone/next")).sort(), [
      "createMiddleware",
      // TODO(@wooorm-arcjet): use named exports.
      "default",
      // TODO(@wooorm-arcjet): use a clearer name: defaults for what, function to generate them?
      "defaults",
      "withVercelToolbar",
    ]);
  });
});
