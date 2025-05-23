export interface Cache<T = unknown> {
  /**
   * Attempts to retrieve a value from the cache. If a value exists, it will be
   * returned with the remaining time-to-live (in seconds).
   *
   * @param namespace A isolated segement of the cache where keys are tracked.
   * @param key The identifier used to retrieve the value.
   * @returns A promise for a 2-element tuple containing the value and TTL in
   * seconds. If no value is retrieved, the value will be `undefined` and the
   * TTL will be `0`.
   */
  get(namespace: string, key: string): Promise<[T | undefined, number]>;
  /**
   * If the cache implementation supports storing values, `set` makes a best
   * attempt at storing the value provided until the time-to-live specified.
   *
   * @param namespace A isolated segement of the cache where keys are tracked.
   * @param key The identifier used to store the value.
   * @param value The value to be stored under the key.
   * @param ttl The amount of seconds the value stays valid in the cache.
   */
  set(namespace: string, key: string, value: T, ttl: number): void;
}

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

class Bucket<T> {
  expires: Map<string, number>;
  data: Map<string, T>;

  constructor() {
    this.expires = new Map();
    this.data = new Map();
  }

  get(key: string): [T | undefined, number] {
    const now = nowInSeconds();
    const expiresAt = this.expires.get(key) ?? now;
    const ttl = expiresAt - now;

    if (ttl > 0) {
      return [this.data.get(key), ttl];
    } else {
      // Cleanup if expired
      this.expires.delete(key);
      this.data.delete(key);

      return [undefined, 0];
    }
  }

  set(key: string, value: T, ttl: number) {
    const expiresAt = nowInSeconds() + ttl;
    this.expires.set(key, expiresAt);
    this.data.set(key, value);
  }
}

export class MemoryCache<T> implements Cache<T> {
  namespaces: Map<string, Bucket<T>>;

  constructor() {
    this.namespaces = new Map();
  }

  async get(namespace: string, key: string): Promise<[T | undefined, number]> {
    // Empty namespaces are not supported
    if (typeof namespace !== "string" || namespace === "") {
      return [undefined, 0];
    }

    // Empty keys are not supported
    if (typeof key !== "string" || key === "") {
      return [undefined, 0];
    }

    const namespaceCache = this.namespaces.get(namespace);

    if (typeof namespaceCache === "undefined") {
      return [undefined, 0];
    }

    return namespaceCache.get(key);
  }

  set(namespace: string, key: string, value: T, ttl: number) {
    // Empty namespaces are not supported
    if (typeof namespace !== "string" || namespace === "") {
      return;
    }

    // Empty keys are not supported
    if (typeof key !== "string" || key === "") {
      return;
    }

    const namespaceCache = this.namespaces.get(namespace) ?? new Bucket();
    namespaceCache.set(key, value, ttl);
    this.namespaces.set(namespace, namespaceCache);
  }
}
