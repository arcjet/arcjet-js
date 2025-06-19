import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemoryCache } from "../index.js";

describe("MemoryCache", () => {
  const cache = new MemoryCache();

  test("MemoryCache#set", () => {
    test("should fail on non-string namespaces", () => {
      assert.throws(() => {
        cache.set(
          // @ts-expect-error: test runtime behavior.
          1234,
          "test-key",
          "test-value",
          10,
        );
      });
    });

    test("should support `namespace` as an empty string", () => {
      cache.set("", "test-key", "test-value", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    test("should fail on non-string keys", () => {
      assert.throws(() => {
        cache.set(
          "test-namespace",
          // @ts-expect-error: test runtime behavior.
          1234,
          "test-value",
          10,
        );
      });
    });

    test("should support `key` as an empty string", () => {
      // Empty string key
      cache.set("test-namespace", "", "test-value", 10);
      assert.equal(cache.namespaces.size, 2);
    });

    // To do: this is actually not a new namespace.
    test("should support a namespace", () => {
      cache.set("test-namespace", "test-key", "test-value", 10);
      assert.equal(cache.namespaces.size, 2);
    });

    test("should support a re-used namespace", () => {
      cache.set("test-namespace", "test-key-2", "test-value-2", 10);
      assert.equal(cache.namespaces.size, 2);
    });

    test("should support another new namespace", () => {
      cache.set("test-namespace-2", "test-key", "test-value", 10);
      assert.equal(cache.namespaces.size, 3);
    });

    test("should support `0` as a TTL", () => {
      cache.set("test-namespace-2", "test-key-2", "test-value-2", 0);
      assert.equal(cache.namespaces.size, 3);
    });
  });

  test("MemoryCache#get", async () => {
    test("should fail on non-string `namespace`", async () => {
      await assert.rejects(
        cache.get(
          // @ts-expect-error: test runtime behavior.
          1234,
          "test-key",
        ),
      );
    });

    test("should support `namespace` as an empty string", async () => {
      assert.deepEqual(await cache.get("", "test-key"), ["test-value", 10]);
    });

    test("should fail on non-string keys", async () => {
      await assert.rejects(
        cache.get(
          "test-namespace",
          // @ts-expect-error: test runtime behavior.
          1234,
        ),
      );
    });

    test("should support `key` as an empty string", async () => {
      assert.deepEqual(await cache.get("test-namespace", ""), [
        "test-value",
        10,
      ]);
    });

    test("should resolve empty for a missing `namespace`", async () => {
      assert.deepEqual(await cache.get("test-namespace-3", "test-key"), [
        undefined,
        0,
      ]);
    });

    test("should resolve empty for a missing `key`", async () => {
      assert.deepEqual(await cache.get("test-namespace", "test-key-3"), [
        undefined,
        0,
      ]);
    });

    test("should resolve a value for a value that’s existing, live", async () => {
      assert.deepEqual(await cache.get("test-namespace", "test-key"), [
        "test-value",
        10,
      ]);
    });

    test("should resolve empty for an expired value", async () => {
      assert.deepEqual(await cache.get("test-namespace-2", "test-key-2"), [
        undefined,
        0,
      ]);
    });
  });
});
