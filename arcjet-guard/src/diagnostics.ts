import { Logger } from "@arcjet/logger";

/**
 * A local SDK diagnostic that cannot be reported over the wire.
 *
 * Messages contain static text and, for metadata encoding warnings, escaped
 * and length-bounded key names. They never include metadata values, capture
 * actions, credentials, headers, or request bodies.
 */
export type ArcjetDiagnostic = {
  /** Stable machine-readable code. */
  code: "AJ1001" | "AJ1017" | "AJ3000" | "AJ3001" | "AJ3002" | "AJ3003" | "AJ3004" | "AJ3005";
  /** Static human-readable description. */
  message: string;
  /** Number of events affected, when relevant. */
  count?: number;
};

/** Logger methods used for local SDK diagnostics. */
export type DiagnosticLogger = Pick<Logger, "warn">;

export type DiagnosticHandler = (diagnostic: ArcjetDiagnostic) => void;

/**
 * Where a client keeps its diagnostics channel so the registry can reach it.
 *
 * A client's logger is captured inside `createGuardClient` and appears nowhere
 * on the public `ArcjetGuard` surface. Registration needs it anyway: when a
 * second client tries to register, the warning belongs to the application that
 * registered *first*, on the logger it configured — not on whatever sink the
 * late registrant brought with it.
 *
 * A symbol rather than a property so it stays invisible to `Object.keys` and
 * cannot collide with anything on a caller-supplied object.
 *
 * @internal
 */
export const symbolArcjetDiagnostics: unique symbol = Symbol.for("arcjet.guard.diagnostics");

/** A handler that holds counts back and can be asked to release them. */
export type CoalescingDiagnosticHandler = DiagnosticHandler & {
  /** Report every count still held back, ignoring the quiet period. */
  drain(): void;
};

/** Internal tuning, exposed for deterministic tests. */
export type DiagnosticOptions = {
  /**
   * Where to report. A supplied logger receives every diagnostic; without one,
   * the default `@arcjet/logger` sink coalesces.
   */
  logger?: DiagnosticLogger;
  /** Clock used for the quiet period. */
  now?: () => number;
  /** Quiet period per code, in milliseconds. `0` reports everything. */
  coalesceMs?: number;
};

const DEFAULT_COALESCE_MS = 60_000;

/**
 * Build the diagnostics channel for one client.
 *
 * Diagnostics go through `@arcjet/logger`, so they are formatted and level-gated
 * like every other Arcjet log line rather than written straight to the console.
 *
 * A caller-supplied logger receives every diagnostic, because the caller already
 * controls filtering — anything keeping a metric of dropped events needs all of
 * them. The default logger coalesces instead: `capture()` is called on a request
 * path, so a persistent problem — a full queue under load, an unreachable API —
 * would otherwise emit a line per event and turn a best-effort telemetry drop
 * into a logging incident.
 *
 * Coalescing reports a code at most once per quiet period and **accumulates the
 * counts in between**, releasing them with the next line for that code or from
 * {@link CoalescingDiagnosticHandler.drain}, which `flush()` calls. Suppressing
 * without accumulating is the trap here: reporting only the first event of a
 * thousand-drop burst understates it by three orders of magnitude, which is what
 * this used to do.
 *
 * A burst that ends with neither a later drop nor a `flush()` still
 * under-reports. That is the residual cost of bounding log volume, and it is why
 * the figure is a count of events seen rather than a guaranteed total.
 */
export function createDiagnosticHandler(
  options: DiagnosticOptions = {},
): CoalescingDiagnosticHandler {
  const { logger } = options;
  const now = options.now ?? Date.now;
  // A supplied logger is never coalesced: the caller filters.
  const coalesceMs = logger === undefined ? (options.coalesceMs ?? DEFAULT_COALESCE_MS) : 0;
  const suppressed = new Map<ArcjetDiagnostic["code"], { count: number; message: string }>();
  const lastLogged = new Map<ArcjetDiagnostic["code"], number>();
  // Built on first use so a client that never reports a diagnostic — the
  // expected case — does not construct a logger it will not use.
  let sink = logger;

  function emit(code: ArcjetDiagnostic["code"], message: string, count?: number): void {
    sink ??= new Logger({ level: "warn" });
    sink.warn({ code, ...(count === undefined ? {} : { count }) }, message);
  }

  function diagnose(diagnostic: ArcjetDiagnostic): void {
    try {
      const held = suppressed.get(diagnostic.code);
      suppressed.delete(diagnostic.code);

      // Absent `count` means "one event, and the count is not interesting", so
      // it stays absent on the way out unless something was accumulated — at
      // which point the total is the whole point of the line.
      const total =
        held === undefined && diagnostic.count === undefined
          ? undefined
          : (held?.count ?? 0) + (diagnostic.count ?? 1);

      const at = now();
      const previous = lastLogged.get(diagnostic.code);
      if (coalesceMs > 0 && previous !== undefined && at - previous < coalesceMs) {
        suppressed.set(diagnostic.code, {
          count: total ?? 1,
          message: diagnostic.message,
        });
        return;
      }

      lastLogged.set(diagnostic.code, at);
      emit(diagnostic.code, diagnostic.message, total);
    } catch {
      // A diagnostics sink is observational and must never break application
      // control flow or the background delivery worker.
    }
  }

  diagnose.drain = function drain(): void {
    try {
      for (const [code, held] of suppressed) {
        suppressed.delete(code);
        if (held.count > 0) {
          lastLogged.set(code, now());
          emit(code, held.message, held.count);
        }
      }
    } catch {
      // As above: draining is observational too.
    }
  };

  return diagnose;
}
