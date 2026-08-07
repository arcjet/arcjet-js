import type { CaptureOptions, Decision, GuardOptions } from "../types.ts";

/**
 * The guard client surface the agent helpers need, typed structurally.
 *
 * `launchArcjet()` from `@arcjet/guard` returns a superset of this. Both
 * methods are required: the helpers ship from the same package version as the
 * client, so a client without `capture()` cannot occur. Typing it structurally
 * rather than importing the client type keeps a caller free to substitute their
 * own object.
 */
export interface ArcjetAgentClient {
  guard(opts: GuardOptions): Promise<Decision>;
  capture(opts: CaptureOptions): void;
}

/**
 * True when `ARCJET_LOG_LEVEL` asks for warnings (guard's convention:
 * `debug`, `info`, or `warn`).
 *
 * @internal Exported for use by the vendor namespaces, so every one of them
 * honours the same log level; not part of the public API.
 */
export function shouldWarn(): boolean {
  const level = globalThis.process?.env?.["ARCJET_LOG_LEVEL"];
  return level === "debug" || level === "info" || level === "warn";
}

/**
 * Fire-and-forget capture. Never throws.
 *
 * `@arcjet/guard`'s own `capture()` already guarantees this, but the client is
 * typed structurally, so a caller-supplied one need not — and a capture must
 * never take down the tool call or action it is recording.
 *
 * @internal Exported for use by the vendor namespaces; not part of the public
 * API.
 */
export function captureEvent(client: ArcjetAgentClient, opts: CaptureOptions): void {
  try {
    client.capture(opts);
  } catch {
    // capture must never take the caller down.
  }
}
