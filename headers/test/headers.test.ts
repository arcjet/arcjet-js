import assert from "node:assert/strict";
import { describe, test } from "node:test";
import ArcjetHeaders from "../index.js";

test("@arcjet/headers", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      // TODO(@wooorm-arcjet): use named exports.
      "default",
    ]);
  });
});

describe("ArcjetHeaders", () => {
  test("can be constructed with no initializer", () => {
    const headers = new ArcjetHeaders();
    assert.deepEqual(Array.from(headers.entries()), []);
  });

  test("can be constructed with Headers", () => {
    const headers = new ArcjetHeaders(new Headers([["abc", "xyz"]]));
    assert.deepEqual(Array.from(headers.entries()), [["abc", "xyz"]]);
  });

  test("can be constructed with ArcjetHeaders", () => {
    const headers = new ArcjetHeaders(new ArcjetHeaders([["abc", "xyz"]]));
    assert.deepEqual(Array.from(headers.entries()), [["abc", "xyz"]]);
  });

  test("can be constructed with a plain object", () => {
    const headers = new ArcjetHeaders({ abc: "xyz" });
    assert.deepEqual(Array.from(headers.entries()), [["abc", "xyz"]]);
  });

  test("can be constructed with a plain object", () => {
    const headers = new ArcjetHeaders({ abc: "xyz" });
    assert.deepEqual(Array.from(headers.entries()), [["abc", "xyz"]]);
  });

  test("can be constructed with a plain object containing multiple entries", () => {
    const headers = new ArcjetHeaders({ abc: ["xyz", "123"] });
    assert.deepEqual(Array.from(headers.entries()), [["abc", "xyz, 123"]]);
  });

  test("does not error if null is used as init", () => {
    // @ts-expect-error
    const headers = new ArcjetHeaders(null);
    assert.deepEqual(Array.from(headers.entries()), []);
  });

  test("does not initialize header values if string used as init", () => {
    // @ts-expect-error
    const headers = new ArcjetHeaders("abc123");
    assert.deepEqual(Array.from(headers.entries()), []);
  });

  test("filters undefined values from plain objects", () => {
    const headers = new ArcjetHeaders({ abc: undefined });
    assert.deepEqual(Array.from(headers.entries()), []);
  });

  describe("#append(key, value)", () => {
    test("sets a header if not already set", () => {
      const headers = new ArcjetHeaders();
      headers.append("abc", "xyz");
      assert.deepEqual(Array.from(headers.entries()), [["abc", "xyz"]]);
    });

    test("adds another value to header if already set", () => {
      const headers = new ArcjetHeaders({ abc: "xyz" });
      headers.append("abc", "123");
      assert.deepEqual(Array.from(headers.entries()), [["abc", "xyz, 123"]]);
    });

    test("does NOT add cookie header", () => {
      const headers = new ArcjetHeaders();
      headers.append("cookie", "abc");
      headers.append("COOKIE", "123");
      headers.append("cOoKiE", "xyz");
      assert.deepEqual(Array.from(headers.entries()), []);
    });

    test("does NOT add non-string keys", () => {
      const headers = new ArcjetHeaders();
      // @ts-expect-error
      headers.append(123, "abc");
      // @ts-expect-error
      headers.append({}, "abc");
      // @ts-expect-error
      headers.append([], "abc");
      // @ts-expect-error
      headers.append(function () {}, "abc");
      assert.deepEqual(Array.from(headers.entries()), []);
    });

    test("does NOT add non-string values", () => {
      const headers = new ArcjetHeaders();
      // @ts-expect-error
      headers.append("abc", undefined);
      // @ts-expect-error
      headers.append("abc", 123);
      // @ts-expect-error
      headers.append("abc", {});
      // @ts-expect-error
      headers.append("abc", []);
      // @ts-expect-error
      headers.append("abc", function () {});
      assert.deepEqual(Array.from(headers.entries()), []);
    });
  });

  describe("#set(key, value)", () => {
    test("sets a header if not already set", () => {
      const headers = new ArcjetHeaders();
      headers.set("abc", "xyz");
      assert.deepEqual(Array.from(headers.entries()), [["abc", "xyz"]]);
    });

    test("overrides a header if already set", () => {
      const headers = new ArcjetHeaders({ abc: "xyz" });
      headers.set("abc", "123");
      assert.deepEqual(Array.from(headers.entries()), [["abc", "123"]]);
    });

    test("does NOT add cookie header", () => {
      const headers = new ArcjetHeaders();
      headers.set("cookie", "abc");
      headers.set("COOKIE", "123");
      headers.set("cOoKiE", "xyz");
      assert.deepEqual(Array.from(headers.entries()), []);
    });

    test("does NOT add non-string keys", () => {
      const headers = new ArcjetHeaders();
      // @ts-expect-error
      headers.set(123, "abc");
      // @ts-expect-error
      headers.set({}, "abc");
      // @ts-expect-error
      headers.set([], "abc");
      // @ts-expect-error
      headers.set(function () {}, "abc");
      assert.deepEqual(Array.from(headers.entries()), []);
    });

    test("does NOT add non-string values", () => {
      const headers = new ArcjetHeaders();
      // @ts-expect-error
      headers.set("abc", undefined);
      // @ts-expect-error
      headers.set("abc", 123);
      // @ts-expect-error
      headers.set("abc", {});
      // @ts-expect-error
      headers.set("abc", []);
      // @ts-expect-error
      headers.set("abc", function () {});
      assert.deepEqual(Array.from(headers.entries()), []);
    });
  });
});
