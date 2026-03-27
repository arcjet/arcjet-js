/**
 * Ambient declarations for cross-runtime globals used by `@arcjet/guard`.
 *
 * These exist in every target runtime (Node 22+, Deno 2+, Bun 1+,
 * Cloudflare Workers) but are Web/DOM APIs not included in any
 * `esXXXX` lib. We declare only the subset we use rather than
 * pulling in `@types/node` which would pollute the portable core
 * with Node-only APIs.
 */
declare const performance: {
  now(): number;
};
declare const crypto: {
  randomUUID(): string;
};
declare interface AbortSignal {
  readonly aborted: boolean;
  readonly reason: unknown;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}
declare var process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;
