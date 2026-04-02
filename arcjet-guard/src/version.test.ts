import assert from "node:assert/strict";
import { describe, test, afterEach } from "node:test";

import { VERSION, userAgent } from "./version.ts";

describe("VERSION", () => {
  test("is a semver-like string", () => {
    assert.match(VERSION, /^\d+\.\d+\.\d+/);
  });
});

describe("userAgent", () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    // Clean up any fallback globals we injected
    for (const key of ["EdgeRuntime", "Netlify", "fastly"]) {
      if (key in globalThis) {
        // oxlint-ignore-next-line typescript/no-dynamic-delete
        delete (globalThis as Record<string, unknown>)[key];
      }
    }
  });

  test("includes SDK name and version", () => {
    const ua = userAgent();
    assert.ok(ua.startsWith(`arcjet-guard-js/${VERSION}`));
  });

  test("in Node 22+, includes both WinterCG key and navigator", () => {
    // Running in Node 22 — both process.version and navigator.userAgent exist
    const ua = userAgent();
    // WinterCG key: node/<full version>
    assert.match(ua, /node\/\d+\.\d+\.\d+/);
    // navigator: Node.js/<major>
    assert.match(ua, /Node\.js\/\d+/);
    // Separated by semicolon
    assert.match(ua, /; /);
  });

  test("deduplicates when runtime and navigator are identical", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent: "edge-light" },
      configurable: true,
    });
    // Inject EdgeRuntime so detectRuntime returns "edge-light"
    (globalThis as Record<string, unknown>).EdgeRuntime = "edge-light";
    // Should not repeat: (edge-light; edge-light)
    assert.equal(userAgent(), `arcjet-guard-js/${VERSION} (edge-light)`);
  });

  test("includes navigator even when runtime is unknown", () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { userAgent: "SomeNewRuntime/1.0" },
      configurable: true,
    });
    const ua = userAgent();
    // Still includes node/ from process.version + the navigator
    assert.match(ua, /SomeNewRuntime\/1\.0/);
  });

  describe("WinterCG runtime keys", () => {
    test("edge-light for Vercel Edge", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: undefined,
        configurable: true,
      });
      (globalThis as Record<string, unknown>).EdgeRuntime = "edge-light";
      assert.equal(userAgent(), `arcjet-guard-js/${VERSION} (edge-light)`);
    });

    test("netlify for Netlify Edge Functions", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: undefined,
        configurable: true,
      });
      (globalThis as Record<string, unknown>).Netlify = {};
      assert.equal(userAgent(), `arcjet-guard-js/${VERSION} (netlify)`);
    });

    test("fastly for Fastly Compute", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: undefined,
        configurable: true,
      });
      (globalThis as Record<string, unknown>).fastly = {};
      assert.equal(userAgent(), `arcjet-guard-js/${VERSION} (fastly)`);
    });

    test("node/<version> from process.version", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: undefined,
        configurable: true,
      });
      const ua = userAgent();
      assert.match(ua, /\(node\/\d+\.\d+\.\d+\)/);
    });
  });

  describe("navigator fallback only", () => {
    test("returns base string when no navigator and no runtime globals", () => {
      // Can't easily remove process from globalThis in Node, so just verify
      // the format is correct with navigator undefined
      Object.defineProperty(globalThis, "navigator", {
        value: undefined,
        configurable: true,
      });
      const ua = userAgent();
      // Should still detect node from process
      assert.match(ua, /^arcjet-guard-js\//);
    });

    test("returns base string with empty navigator.userAgent", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: "" },
        configurable: true,
      });
      const ua = userAgent();
      // Still detects node from process, navigator is empty so omitted
      assert.match(ua, /\(node\/\d+/);
      assert.ok(!ua.includes("; "));
    });

    test("returns base string with null navigator.userAgent", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { userAgent: null },
        configurable: true,
      });
      const ua = userAgent();
      assert.match(ua, /\(node\/\d+/);
      assert.ok(!ua.includes("; "));
    });
  });
});
