/**
 * `arcjet` — Bun entrypoint.
 *
 * Resolved by the `"."` export under the `bun` condition. Bun's fetch does not
 * support HTTP/2 ({@link https://github.com/oven-sh/bun/issues/7194}), so
 * `launchArcjet` uses `node:http2` directly, matching `arcjet/guard`.
 *
 * @packageDocumentation
 */

export * from "./index.ts";
export { default } from "./index.ts";
export {
  capture,
  flush,
  guard,
  launchArcjet,
  registerArcjet,
  unregisterArcjet,
  type ArcjetClient,
  type ArcjetDiagnostic,
  // oxlint-disable-next-line typescript/no-deprecated -- compatibility export
  type ArcjetDiagnosticLogger,
  type ArcjetGuard,
  type CaptureOptions,
  type GuardOptions,
  type LaunchOptions,
} from "./guard/bun.ts";
