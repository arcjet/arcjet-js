import { describe, test } from "node:test";
import { expect } from "expect";
import { MemoryCache } from "../index.js";

describe("MemoryCache", () => {
  const cache = new MemoryCache();

  test("MemoryCache#set", () => {
    // No non-string namespaces
    expect(() => {
      cache.set(
        // @ts-expect-error
        1234,
        "test-key",
        "test-value",
        10,
      );
    }).toThrow();
    // No non-string keys
    expect(() => {
      cache.set(
        "test-namespace",
        // @ts-expect-error
        1234,
        "test-value",
        10,
      );
    }).toThrow();

    // Empty string namespace
    cache.set("", "test-key", "test-value", 10);
    expect(cache.namespaces.size).toEqual(1);
    // Empty string key
    cache.set("test-namespace", "", "test-value", 10);
    expect(cache.namespaces.size).toEqual(2);

    // New namespace
    cache.set("test-namespace", "test-key", "test-value", 10);
    expect(cache.namespaces.size).toEqual(2);
    // Re-used namespace
    cache.set("test-namespace", "test-key-2", "test-value-2", 10);
    expect(cache.namespaces.size).toEqual(2);
    // Another new namespace
    cache.set("test-namespace-2", "test-key", "test-value", 10);
    expect(cache.namespaces.size).toEqual(3);
    // Zero TTL (for get tests)
    cache.set("test-namespace-2", "test-key-2", "test-value-2", 0);
    expect(cache.namespaces.size).toEqual(3);
  });

  test("MemoryCache#get", async () => {
    // No non-string namespaces
    await expect(
      cache.get(
        // @ts-expect-error
        1234,
        "test-key",
      ),
    ).rejects.toBeInstanceOf(Error);
    // No non-string keys
    await expect(
      cache.get(
        "test-namespace",
        // @ts-expect-error
        1234,
      ),
    ).rejects.toBeInstanceOf(Error);

    // Empty string namespace
    expect(await cache.get("", "test-key")).toEqual(["test-value", 10]);
    // Empty string key
    expect(await cache.get("test-namespace", "")).toEqual(["test-value", 10]);

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
