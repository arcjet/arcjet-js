import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  isolateProxyEnvironment,
  withSimulatedRuntime,
} from "../test/_shared/proxy-env.ts";
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
      createTransport("https://example.com");
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

  // Bun and Deno reach this Node entry point (Bun resolves `.` here for HTTP/2;
  // Deno via an explicit `@arcjet/guard/node` import), but their Node HTTP agent
  // ignores `proxyEnv`, so a detected proxy must fall back to the fetch
  // transport. Simulate each runtime and confirm a transport is still built.
  for (const runtime of ["Bun", "Deno"]) {
    test(`uses the fetch transport on ${runtime} when a proxy is detected`, () => {
      process.env.HTTPS_PROXY = "http://127.0.0.1:1";

      withSimulatedRuntime(runtime, () => {
        const transport = createTransport("https://decide.arcjet.com");

        assert.equal(typeof transport, "object");
        assert.notEqual(transport, null);
      });
    });
  }
});
