import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryCache } from "../index.js";

test("MemoryCache", async (t) => {
  await t.test("MemoryCache#set", async (t) => {
    await t.test("should fail on non-string namespaces", () => {
      const cache = new MemoryCache();

      assert.throws(() => {
        cache.set(
          // @ts-expect-error: test runtime behavior.
          1234,
          "key",
          "value",
          10,
        );
      });
    });

    await t.test("should support `namespace` as an empty string", () => {
      const cache = new MemoryCache();

      cache.set("", "key", "value", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    await t.test("should fail on non-string keys", () => {
      const cache = new MemoryCache();

      assert.throws(() => {
        cache.set(
          "namespace",
          // @ts-expect-error: test runtime behavior.
          1234,
          "value",
          10,
        );
      });
    });

    await t.test("should support `key` as an empty string", () => {
      const cache = new MemoryCache();

      cache.set("namespace", "", "value", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    await t.test("should support a namespace", () => {
      const cache = new MemoryCache();

      cache.set("namespace", "key", "value", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    await t.test("should support a re-used namespace", () => {
      const cache = new MemoryCache();

      cache.set("namespace", "key", "value", 10);
      cache.set("namespace", "other-key", "other-value", 10);
      assert.equal(cache.namespaces.size, 1);
    });

    await t.test("should support another new namespace", () => {
      const cache = new MemoryCache();

      cache.set("namespace", "key", "value", 10);
      cache.set("other-namespace", "key", "value", 10);
      assert.equal(cache.namespaces.size, 2);
    });

    await t.test("should support `0` as a TTL", () => {
      const cache = new MemoryCache();

      cache.set("namespace", "key", "value", 0);
      assert.equal(cache.namespaces.size, 1);
    });
  });

  await t.test("MemoryCache#get", async (t) => {
    await t.test("should fail on non-string `namespace`", async () => {
      const cache = new MemoryCache();

      await assert.rejects(
        cache.get(
          // @ts-expect-error: test runtime behavior.
          1234,
          "key",
        ),
      );
    });

    await t.test("should support `namespace` as an empty string", async () => {
      const cache = new MemoryCache();

      cache.set("", "key", "value", 10);
      assert.deepEqual(await cache.get("", "key"), ["value", 10]);
    });

    await t.test("should fail on non-string keys", async () => {
      const cache = new MemoryCache();

      await assert.rejects(
        cache.get(
          "namespace",
          // @ts-expect-error: test runtime behavior.
          1234,
        ),
      );
    });

    await t.test("should support `key` as an empty string", async () => {
      const cache = new MemoryCache();

      cache.set("namespace", "", "value", 10);
      assert.deepEqual(await cache.get("namespace", ""), ["value", 10]);
    });

    await t.test("should resolve empty for a missing `namespace`", async () => {
      const cache = new MemoryCache();

      assert.deepEqual(await cache.get("namespace", "key"), [undefined, 0]);
    });

    await t.test("should resolve empty for a missing `key`", async () => {
      const cache = new MemoryCache();

      cache.set("namespace", "key", "value", 10);
      assert.deepEqual(await cache.get("namespace", "other-key"), [
        undefined,
        0,
      ]);
    });

    await t.test(
      "should resolve a value for a value that’s existing and alive",
      async () => {
        const cache = new MemoryCache();

        cache.set("namespace", "key", "value", 10);
        assert.deepEqual(await cache.get("namespace", "key"), ["value", 10]);
      },
    );

    await t.test("should resolve empty for an expired value", async () => {
      const cache = new MemoryCache();

      assert.deepEqual(await cache.get("namespace", "key"), [undefined, 0]);
    });
  });
});
