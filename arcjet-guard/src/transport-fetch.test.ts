import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { createTransport } from "./transport-fetch.ts";

// Standard proxy variables, cleared around every test so the host environment
// (e.g. a developer or CI runner with `HTTPS_PROXY` set) can't flip these cases
// onto the proxy path or leak a stray startup log.
const proxyEnvironmentKeys = [
  "HTTP_PROXY",
  "http_proxy",
  "HTTPS_PROXY",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
];

describe("createTransport (fetch)", () => {
  const saved = new Map<string, string>();

  beforeEach(() => {
    for (const key of proxyEnvironmentKeys) {
      const value = process.env[key];
      if (typeof value === "string") {
        saved.set(key, value);
      }
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of proxyEnvironmentKeys) {
      delete process.env[key];
    }
    for (const [key, value] of saved) {
      process.env[key] = value;
    }
    saved.clear();
  });

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
