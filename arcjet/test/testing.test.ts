import assert from "node:assert/strict";
import { test } from "node:test";

// `entry-node.js` is what the `"."` export resolves to on Node, so this is the
// same module graph an application gets from `import { capture } from "arcjet"`.
import { capture } from "../dist/entry-node.js";
import { registerTestClient } from "../dist/testing.js";

// Calls `[Symbol.dispose]()` rather than writing `using`, which Node's type
// stripping cannot downlevel and which is a syntax error on Node 22. See the
// note in src/guard/testing.test.ts.
test("arcjet/testing records free capture calls", () => {
  const client = registerTestClient();

  try {
    capture({ action: "refund.issued" });

    assert.equal(client.captures[0].action, "refund.issued");
  } finally {
    client[Symbol.dispose]();
  }
});
