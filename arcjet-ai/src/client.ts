import type { Decision, GuardOptions } from "@arcjet/guard";

/**
 * Options for `experimental_capture()` on guard clients that provide it.
 * Mirrors the in-flight `@arcjet/guard` CaptureOptions shape.
 *
 * Used by `captureAction()` to record an observational fact (something the
 * application did) without invoking the guard. Never throws; fire-and-forget.
 */
export interface CaptureOptions {
  /** The fact itself, `"resource.verb"` past tense (e.g. `"review.submitted"`). */
  action: string;
  /** Opaque identifier joining this event to related decisions/events. */
  correlationId?: string;
  /** Join key referencing the guard decision this event relates to. */
  decisionId?: string;
  /** When the action occurred; defaults to the time of the call. */
  occurredAt?: Date;
  /** Arbitrary key-value metadata, same caps as guard metadata. */
  metadata?: Record<string, string>;
}

/**
 * The guard client surface `@arcjet/ai` needs, typed structurally.
 *
 * This is the interface that `launchArcjet()` from `@arcjet/guard` returns.
 * `@arcjet/ai` calls `guard()` to run guard checks and optionally calls
 * `experimental_capture()` to record events (when available). The client is
 * passed to `protectTool()`, `protectAction()`, and `captureAction()`.
 *
 * `experimental_capture` is optional: when the client lacks it, capture calls
 * become no-ops (with a gated warning).
 */
export interface ArcjetAiClient {
  guard(opts: GuardOptions): Promise<Decision>;
  experimental_capture?(opts: CaptureOptions): void;
}

/**
 * True when `ARCJET_LOG_LEVEL` asks for warnings (guard's convention:
 * `debug`, `info`, or `warn`).
 */
export function shouldWarn(): boolean {
  const level = globalThis.process?.env?.["ARCJET_LOG_LEVEL"];
  return level === "debug" || level === "info" || level === "warn";
}

/**
 * Fire-and-forget capture. Never throws. No-ops (with a gated warning) when
 * the client predates `experimental_capture()`.
 */
export function captureEvent(client: ArcjetAiClient, opts: CaptureOptions): void {
  if (typeof client.experimental_capture === "function") {
    try {
      client.experimental_capture(opts);
    } catch {
      // capture must never take the caller down.
    }
    return;
  }
  if (shouldWarn()) {
    console.warn(
      "@arcjet/ai: this @arcjet/guard client does not support experimental_capture(); event not recorded:",
      opts.action,
    );
  }
}
