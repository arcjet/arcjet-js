/**
 * `arcjet` — Node.js entrypoint.
 *
 * Resolved by the `"."` export under the `node` condition so that
 * `launchArcjet` uses the HTTP/2 transport, matching what `arcjet/guard` and
 * `@arcjet/guard` already resolve to on Node. Without this, importing
 * `launchArcjet` from `arcjet` or `@arcjet/node` would silently get the
 * fetch transport and lose connection reuse.
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
} from "./guard/node.ts";
