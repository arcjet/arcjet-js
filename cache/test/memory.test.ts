import { describe, test } from "node:test";
import { expect } from "expect";
import { MemoryCache } from "../index.js";

describe("MemoryCache", () => {
  const cache = new MemoryCache();

  test("MemoryCache#set", () => {
    // No empty namespaces
    cache.set("", "test-key", "test-value", 10);
    expect(cache.namespaces.size).toEqual(0);
    // No non-string namespaces
    cache.set(
      // @ts-expect-error
      1234,
      "test-key",
      "test-value",
      10,
    );
    expect(cache.namespaces.size).toEqual(0);
    // No empty keys
    cache.set("test-namespace", "", "test-value", 10);
    expect(cache.namespaces.size).toEqual(0);
    // No non-string keys
    cache.set(
      "test-namespace",
      // @ts-expect-error
      1234,
      "test-value",
      10,
    );
    expect(cache.namespaces.size).toEqual(0);
    // New namespace
    cache.set("test-namespace", "test-key", "test-value", 10);
    expect(cache.namespaces.size).toEqual(1);
    // Re-used namespace
    cache.set("test-namespace", "test-key-2", "test-value-2", 10);
    expect(cache.namespaces.size).toEqual(1);
    // Another new namespace
    cache.set("test-namespace-2", "test-key", "test-value", 10);
    expect(cache.namespaces.size).toEqual(2);
    // Zero TTL (for get tests)
    cache.set("test-namespace-2", "test-key-2", "test-value-2", 0);
    expect(cache.namespaces.size).toEqual(2);
  });

  test("MemoryCache#get", async () => {
    // No empty namespaces
    expect(await cache.get("", "test-key")).toEqual([undefined, 0]);
    // No non-string namespaces
    expect(
      await cache.get(
        // @ts-expect-error
        1234,
        "test-key",
      ),
    ).toEqual([undefined, 0]);
    // No empty keys
    expect(await cache.get("test-namespace", "")).toEqual([undefined, 0]);
    // No non-string keys
    expect(
      await cache.get(
        "test-namespace",
        // @ts-expect-error
        1234,
      ),
    ).toEqual([undefined, 0]);
    // Nothing for missing namespaces
    expect(await cache.get("test-namespace-3", "test-key")).toEqual([
      undefined,
      0,
    ]);
    // Nothing for missing key
    expect(await cache.get("test-namespace", "test-key-3")).toEqual([
      undefined,
      0,
    ]);
    // Value if exists and alive
    expect(await cache.get("test-namespace", "test-key")).toEqual([
      "test-value",
      10,
    ]);
    // Nothis if value is expired
    expect(await cache.get("test-namespace-2", "test-key-2")).toEqual([
      undefined,
      0,
    ]);
  });
});
