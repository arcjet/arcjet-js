import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { MemoryCache } from "../index.js";

describe("MemoryCache", () => {
  const cache = new MemoryCache();

  test("MemoryCache#set", () => {
    // No non-string namespaces
    assert.throws(() => {
      cache.set(
        // @ts-expect-error
        1234,
        "test-key",
        "test-value",
        10,
      );
    });
    // No non-string keys
    assert.throws(() => {
      cache.set(
        "test-namespace",
        // @ts-expect-error
        1234,
        "test-value",
        10,
      );
    });

    // Empty string namespace
    cache.set("", "test-key", "test-value", 10);
    assert.equal(cache.namespaces.size, 1);
    // Empty string key
    cache.set("test-namespace", "", "test-value", 10);
    assert.equal(cache.namespaces.size, 2);

    // New namespace
    cache.set("test-namespace", "test-key", "test-value", 10);
    assert.equal(cache.namespaces.size, 2);
    // Re-used namespace
    cache.set("test-namespace", "test-key-2", "test-value-2", 10);
    assert.equal(cache.namespaces.size, 2);
    // Another new namespace
    cache.set("test-namespace-2", "test-key", "test-value", 10);
    assert.equal(cache.namespaces.size, 3);
    // Zero TTL (for get tests)
    cache.set("test-namespace-2", "test-key-2", "test-value-2", 0);
    assert.equal(cache.namespaces.size, 3);
  });

  test("MemoryCache#get", async () => {
    // No non-string namespaces
    await assert.rejects(
      cache.get(
        // @ts-expect-error
        1234,
        "test-key",
      ),
    );
    // No non-string keys
    await assert.rejects(
      cache.get(
        "test-namespace",
        // @ts-expect-error
        1234,
      ),
    );

    // Empty string namespace
    assert.deepEqual(await cache.get("", "test-key"), ["test-value", 10]);
    // Empty string key
    assert.deepEqual(await cache.get("test-namespace", ""), ["test-value", 10]);

    // Nothing for missing namespaces
    assert.deepEqual(await cache.get("test-namespace-3", "test-key"), [
      undefined,
      0,
    ]);
    // Nothing for missing key
    assert.deepEqual(await cache.get("test-namespace", "test-key-3"), [
      undefined,
      0,
    ]);
    // Value if exists and alive
    assert.deepEqual(await cache.get("test-namespace", "test-key"), [
      "test-value",
      10,
    ]);
    // Nothing if value is expired
    assert.deepEqual(await cache.get("test-namespace-2", "test-key-2"), [
      undefined,
      0,
    ]);
  });
});
