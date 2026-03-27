/**
 * Ambient declarations for cross-runtime globals used by `@arcjet/guard`.
 *
 * These exist in every target runtime (Node 22+, Deno 2+, Bun 1+,
 * Cloudflare Workers) but are Web/DOM APIs not included in any
 * `esXXXX` lib. We declare only the subset we use rather than
 * pulling in `@types/node` which would pollute the portable core
 * with Node-only APIs.
 */

// ── performance (WinterTC / Web Performance API) ───────────────────────

declare const performance: {
  now(): number;
};

// ── crypto (Web Crypto API) ────────────────────────────────────────────

declare const crypto: {
  randomUUID(): string;
};

// ── AbortSignal (DOM Abort API — available everywhere) ─────────────────

declare interface AbortSignal {
  readonly aborted: boolean;
  readonly reason: unknown;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

// ── process (Node/Bun only — guarded by typeof at runtime) ─────────────

declare var process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;
