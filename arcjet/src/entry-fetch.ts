/**
 * `arcjet` — entrypoint for runtimes with a standard fetch API.
 *
 * Resolved by the `"."` export for Deno, Cloudflare Workers, Vercel Edge, and
 * anything else without a more specific condition. Node.js and Bun resolve to
 * `entry-node.ts` and `entry-bun.ts`, which bind transports those runtimes can
 * use. Everything except `launchArcjet` is identical across the three.
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
} from "./guard/fetch.ts";
