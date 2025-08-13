import assert from "node:assert/strict";
import test from "node:test";

test("@nosecone/sveltekit", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "createHook",
      "csp",
      "default",
      // TODO(@wooorm-arcjet): use a clearer name: defaults for what, function to generate them?
      "defaults",
      "nosecone",
      "withVercelToolbar",
    ]);
  });
});
