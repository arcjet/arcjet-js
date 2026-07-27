import type { Logger } from "@arcjet/logger";

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
 * A caller-provided logger receives every diagnostic. The console fallback
 * logs once per code so repeated best-effort drops cannot flood application
 * logs.
 */
export function createDiagnosticHandler(logger?: DiagnosticLogger): DiagnosticHandler {
  const logged = new Set<ArcjetDiagnostic["code"]>();

  return function diagnose(diagnostic: ArcjetDiagnostic): void {
    try {
      if (logger) {
        logger.warn(
          {
            code: diagnostic.code,
            ...(diagnostic.count === undefined ? {} : { count: diagnostic.count }),
          },
          diagnostic.message,
        );
        return;
      }
      if (logged.has(diagnostic.code)) {
        return;
      }
      logged.add(diagnostic.code);
      console.warn(formatDiagnostic(diagnostic));
    } catch {
      // A diagnostics sink is observational and must never break application
      // control flow or the background delivery worker.
    }
  };
}

function formatDiagnostic(diagnostic: ArcjetDiagnostic): string {
  const count = diagnostic.count === undefined ? "" : ` (${diagnostic.count} event(s))`;
  return `✦Aj WARN [${diagnostic.code}] ${diagnostic.message}${count}`;
}
