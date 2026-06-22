import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isolateProxyEnvironment } from "../test/_shared/proxy-env.ts";
import { createTransport } from "./transport-bun.ts";

describe("createTransport (bun)", () => {
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

  // With a proxy, Bun uses the fetch transport (its native `fetch` proxies);
  // without one it uses HTTP/2. Both should build a transport-shaped object.
  test("builds a fetch transport when a proxy is detected", () => {
    process.env.HTTPS_PROXY = "http://127.0.0.1:1";

    const transport = createTransport("https://decide.arcjet.com");

    assert.equal(typeof transport, "object");
    assert.notEqual(transport, null);
  });
});
