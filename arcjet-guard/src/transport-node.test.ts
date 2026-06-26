import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createTransport } from "./transport-node.ts";

describe("createTransport (node)", () => {
  test("is a function", () => {
    assert.equal(typeof createTransport, "function");
  });

  test("returns a transport-shaped object", () => {
    const transport = createTransport("https://decide.arcjet.com");

    assert.equal(typeof transport, "object");
    assert.notEqual(transport, null);
  });

  test("does not throw for valid URL", () => {
    assert.doesNotThrow(() => {
      // Use the Arcjet API host (allowed by CI egress policies) rather than a
      // placeholder: the node transport optimistically pre-connects, so the URL
      // becomes a real outbound connection.
      createTransport("https://decide.arcjet.com");
    });
  });
});
