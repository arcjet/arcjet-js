/**
 * Interface for a cache.
 */
export interface Cache<T = unknown> {
  /**
   * Retrieve a value from the cache;
   * it will be returned with the remaining time-to-live (in seconds) if it exists.
   *
   * @param namespace
   *   Isolated segment of the cache where keys are tracked.
   * @param key
   *   Key.
   * @returns
   *   Promise for a tuple with the value and TTL in seconds;
   *   value will be `undefined` and TTL will be `0` if not found.
   */
  get(namespace: string, key: string): Promise<[T | undefined, number]>;
  /**
   * Store a value in the cache.
   *
   * @param namespace
   *   Isolated segment of the cache where keys are tracked.
   * @param key
   *   Key.
   * @param value
   *   Value.
   * @param ttl
   *   Number of seconds the entry stays valid.
   * @returns
   *   Nothing.
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

/**
 * In-memory cache.
 */
export class MemoryCache<T> implements Cache<T> {
  /**
   * Data.
   */
  namespaces: Map<string, Bucket<T>>;

  /**
   * Create a new in-memory cache.
   */
  constructor() {
    this.namespaces = new Map();
  }

  async get(namespace: string, key: string): Promise<[T | undefined, number]> {
    if (typeof namespace !== "string") {
      throw new Error("`namespace` must be a string");
    }

    if (typeof key !== "string") {
      throw new Error("`key` must be a string");
    }

    const namespaceCache = this.namespaces.get(namespace);

    if (typeof namespaceCache === "undefined") {
      return [undefined, 0];
    }

    return namespaceCache.get(key);
  }

  set(namespace: string, key: string, value: T, ttl: number) {
    if (typeof namespace !== "string") {
      throw new Error("`namespace` must be a string");
    }

    if (typeof key !== "string") {
      throw new Error("`key` must be a string");
    }

    const namespaceCache = this.namespaces.get(namespace) ?? new Bucket();
    namespaceCache.set(key, value, ttl);
    this.namespaces.set(namespace, namespaceCache);
  }
}
