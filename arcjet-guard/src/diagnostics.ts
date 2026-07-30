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
  code: "AJ1001" | "AJ1017" | "AJ3000" | "AJ3001" | "AJ3002" | "AJ3003";
  /** Static human-readable description. */
  message: string;
  /** Number of events affected, when relevant. */
  count?: number;
};

/** Logger methods used for local SDK diagnostics. */
export type DiagnosticLogger = Pick<Logger, "warn">;

export type DiagnosticHandler = (diagnostic: ArcjetDiagnostic) => void;

/**
 * Build the diagnostics channel for one client.
 *
 * Diagnostics go through `@arcjet/logger`, so they are formatted and level-gated
 * like every other Arcjet log line rather than written straight to the console.
 *
 * A caller-supplied logger receives every diagnostic, because the caller already
 * controls filtering. The default logger instead reports each code once:
 * `capture()` is called on a request path, so a persistent problem — a full
 * queue under load, an unreachable API — would otherwise emit a line per event
 * and turn a best-effort telemetry drop into a logging incident.
 */
export function createDiagnosticHandler(logger?: DiagnosticLogger): DiagnosticHandler {
  const deduplicate = logger === undefined;
  const logged = new Set<ArcjetDiagnostic["code"]>();
  // Built on first use so a client that never reports a diagnostic — the
  // expected case — does not construct a logger it will not use.
  let sink = logger;

  return function diagnose(diagnostic: ArcjetDiagnostic): void {
    try {
      if (deduplicate) {
        if (logged.has(diagnostic.code)) {
          return;
        }
        logged.add(diagnostic.code);
      }
      sink ??= new Logger({ level: "warn" });
      sink.warn(
        {
          code: diagnostic.code,
          ...(diagnostic.count === undefined ? {} : { count: diagnostic.count }),
        },
        diagnostic.message,
      );
    } catch {
      // A diagnostics sink is observational and must never break application
      // control flow or the background delivery worker.
    }
  };
}
