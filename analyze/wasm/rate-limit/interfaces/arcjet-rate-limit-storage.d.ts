export namespace ArcjetRateLimitStorage {
  export function get(key: string): string | undefined;
  export function set(key: string, value: string, expiresAt: number): void;
}
