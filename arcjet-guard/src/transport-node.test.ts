import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isolateProxyEnvironment } from "../test/_shared/proxy-env.ts";
import { createTransport } from "./transport-node.ts";

describe("createTransport (node)", () => {
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
      // Use the Arcjet API host (allowed by CI egress policies) rather than a
      // placeholder: the node transport optimistically pre-connects, so the URL
      // becomes a real outbound connection.
      createTransport("https://decide.arcjet.com");
    });
  });

  test("builds an HTTPS-proxy transport for an https target", () => {
    process.env.HTTPS_PROXY = "http://127.0.0.1:1";

    const transport = createTransport("https://decide.arcjet.com");

    assert.equal(typeof transport, "object");
    assert.notEqual(transport, null);
  });

  test("builds an HTTP-proxy transport for an http target", () => {
    // Exercises the `http.Agent` branch (the https one is covered above).
    process.env.HTTP_PROXY = "http://127.0.0.1:1";

    const transport = createTransport("http://decide.arcjet.com");

    assert.equal(typeof transport, "object");
    assert.notEqual(transport, null);
  });
});
