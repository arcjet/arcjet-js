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
      createTransport("https://example.com");
    });
  });

  test("builds a transport when a proxy is detected", () => {
    const originalProxy = process.env.HTTPS_PROXY;
    const originalInfo = console.info;
    console.info = (): void => {};
    process.env.HTTPS_PROXY = "http://127.0.0.1:1";

    try {
      const transport = createTransport("https://decide.arcjet.com");

      assert.equal(typeof transport, "object");
      assert.notEqual(transport, null);
    } finally {
      if (originalProxy === undefined) {
        delete process.env.HTTPS_PROXY;
      } else {
        process.env.HTTPS_PROXY = originalProxy;
      }
      console.info = originalInfo;
    }
  });

  test("uses the fetch transport on Bun when a proxy is detected", () => {
    const hadBun = "Bun" in globalThis;
    const originalBun: unknown = Reflect.get(globalThis, "Bun");
    const originalProxy = process.env.HTTPS_PROXY;
    const originalInfo = console.info;
    console.info = (): void => {};
    // Simulate the Bun runtime, whose Node HTTP agent ignores `proxyEnv`.
    Reflect.set(globalThis, "Bun", {});
    process.env.HTTPS_PROXY = "http://127.0.0.1:1";

    try {
      const transport = createTransport("https://decide.arcjet.com");

      assert.equal(typeof transport, "object");
      assert.notEqual(transport, null);
    } finally {
      if (hadBun) {
        Reflect.set(globalThis, "Bun", originalBun);
      } else {
        Reflect.deleteProperty(globalThis, "Bun");
      }
      if (originalProxy === undefined) {
        delete process.env.HTTPS_PROXY;
      } else {
        process.env.HTTPS_PROXY = originalProxy;
      }
      console.info = originalInfo;
    }
  });

  test("uses the fetch transport on Deno when a proxy is detected", () => {
    const hadDeno = "Deno" in globalThis;
    const originalDeno: unknown = Reflect.get(globalThis, "Deno");
    const originalProxy = process.env.HTTPS_PROXY;
    const originalInfo = console.info;
    console.info = (): void => {};
    // Simulate the Deno runtime, whose Node HTTP agent ignores `proxyEnv`.
    // (The `deno` export condition normally routes Deno to the fetch entry, but
    // an explicit `@arcjet/guard/node` import reaches this code path.)
    Reflect.set(globalThis, "Deno", {});
    process.env.HTTPS_PROXY = "http://127.0.0.1:1";

    try {
      const transport = createTransport("https://decide.arcjet.com");

      assert.equal(typeof transport, "object");
      assert.notEqual(transport, null);
    } finally {
      if (hadDeno) {
        Reflect.set(globalThis, "Deno", originalDeno);
      } else {
        Reflect.deleteProperty(globalThis, "Deno");
      }
      if (originalProxy === undefined) {
        delete process.env.HTTPS_PROXY;
      } else {
        process.env.HTTPS_PROXY = originalProxy;
      }
      console.info = originalInfo;
    }
  });
});
