import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isolateProxyEnvironment } from "../test/_shared/proxy-env.ts";
import { createTransport } from "./transport-fetch.ts";

describe("createTransport (fetch)", () => {
  isolateProxyEnvironment();

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
      createTransport("https://example.com");
    });
  });
});
