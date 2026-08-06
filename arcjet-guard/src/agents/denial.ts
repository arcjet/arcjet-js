import type { DecisionDeny } from "../types.ts";

/**
 * Seconds until a rate-limited call may be retried, or `undefined` when the
 * decision carries no reset time to derive one from.
 *
 * Only meaningful for a `RATE_LIMIT` denial. A co-occurring rule that allowed
 * can still leave a `resetAtUnixSeconds` in `decision.results`, so the caller
 * decides whether to consult this at all — the reason check stays with the
 * caller rather than being duplicated here.
 */
export function retryAfterSeconds(decision: DecisionDeny): number | undefined {
  for (const result of decision.results) {
    if ("resetAtUnixSeconds" in result && typeof result.resetAtUnixSeconds === "number") {
      return Math.max(0, Math.ceil(result.resetAtUnixSeconds - Date.now() / 1000));
    }
  }
  return undefined;
}
