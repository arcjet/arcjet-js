import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemoryCache } from "../index.js";

describe("MemoryCache", () => {
  test("MemoryCache#set", () => {
    test("should fail on non-string namespaces", () => {
      const cache = new MemoryCache();

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
      const cache = new MemoryCache();

      cache.set("", "test-key", "test-value", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    test("should fail on non-string keys", () => {
      const cache = new MemoryCache();

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
      const cache = new MemoryCache();

      cache.set("test-namespace", "", "test-value", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    test("should support a namespace", () => {
      const cache = new MemoryCache();

      cache.set("test-namespace", "test-key", "test-value", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    test("should support a re-used namespace", () => {
      const cache = new MemoryCache();

      cache.set("test-namespace", "test-key", "test-value", 10);
      cache.set("test-namespace", "test-key-2", "test-value-2", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    test("should support another new namespace", () => {
      const cache = new MemoryCache();

      cache.set("test-namespace", "test-key", "test-value", 10);
      cache.set("test-namespace-2", "test-key", "test-value", 10);
      assert.equal(cache.namespaces.size, 2);
    });

    test("should support `0` as a TTL", () => {
      const cache = new MemoryCache();

      cache.set("test-namespace-2", "test-key-2", "test-value-2", 0);
      assert.equal(cache.namespaces.size, 1);
    });
  });

  test("MemoryCache#get", async () => {
    test("should fail on non-string `namespace`", async () => {
      const cache = new MemoryCache();

      await assert.rejects(
        cache.get(
          // @ts-expect-error: test runtime behavior.
          1234,
          "test-key",
        ),
      );
    });

    test("should support `namespace` as an empty string", async () => {
      const cache = new MemoryCache();

      cache.set("", "test-key", "test-value", 10);
      assert.deepEqual(await cache.get("", "test-key"), ["test-value", 10]);
    });

    test("should fail on non-string keys", async () => {
      const cache = new MemoryCache();

      await assert.rejects(
        cache.get(
          "test-namespace",
          // @ts-expect-error: test runtime behavior.
          1234,
        ),
      );
    });

    test("should support `key` as an empty string", async () => {
      const cache = new MemoryCache();

      cache.set("test-namespace", "", "test-value", 10);
      assert.deepEqual(await cache.get("test-namespace", ""), [
        "test-value",
        10,
      ]);
    });

    test("should resolve empty for a missing `namespace`", async () => {
      const cache = new MemoryCache();

      assert.deepEqual(await cache.get("test-namespace-3", "test-key"), [
        undefined,
        0,
      ]);
    });

    test("should resolve empty for a missing `key`", async () => {
      const cache = new MemoryCache();

      assert.deepEqual(await cache.get("test-namespace", "test-key-3"), [
        undefined,
        0,
      ]);
    });

    test("should resolve a value for a value that’s existing, live", async () => {
      const cache = new MemoryCache();

      cache.set("test-namespace", "test-key", "test-value", 10);
      assert.deepEqual(await cache.get("test-namespace", "test-key"), [
        "test-value",
        10,
      ]);
    });

    test("should resolve empty for an expired value", async () => {
      const cache = new MemoryCache();

      assert.deepEqual(await cache.get("test-namespace-2", "test-key-2"), [
        undefined,
        0,
      ]);
    });
  });
});
