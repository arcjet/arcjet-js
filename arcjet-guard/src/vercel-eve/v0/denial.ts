import type { DecisionDeny } from "../../types.ts";

import { retryAfterSeconds } from "../../agents/denial.ts";

/**
 * Structured tool result returned to the model when a call is denied.
 *
 * Intentionally structurally identical to `vercel-ai/v7`'s ArcjetDenialResult
 * so the model trained on denial objects sees the same shape regardless of
 * which integration is in use. Both declarations exist to avoid putting the
 * `ai` SDK in this namespace's import graph.
 */
export interface ArcjetDenialResult {
  arcjetDenied: true;
  /** Denial reason, e.g. `"RATE_LIMIT"` or `"PROMPT_INJECTION"`. */
  reason: string;
  /** Human/model-readable explanation of the denial. */
  message: string;
  /** Whether retrying later can succeed (true for rate limits). */
  retryable: boolean;
  /** Seconds until a rate-limited call may be retried. */
  retryAfterSeconds?: number;
}

/**
 * Backoff hint returned to the model when the guard is unavailable.
 *
 * A rate-limit denial derives its hint from the denying rule's
 * `resetAtUnixSeconds`. This path has nothing to derive from: the fail-open
 * decision is synthesized locally with no rate-limit result, and several of the
 * conditions that reach here receive no response at all. Five seconds paces a
 * model's retry loop — long enough that a retry is not effectively immediate,
 * short enough that the agent does not appear hung.
 *
 * Duplicated from `vercel-ai/v7` rather than shared: v7's copy is a module-local
 * `const` in a file that imports `ai`, and reaching it would put `ai` in this
 * namespace's import graph.
 */
export const UNAVAILABLE_RETRY_AFTER_SECONDS = 5;

/** Model- and user-readable explanation of a denial. */
export function deniedReason(decision: DecisionDeny): string {
  const isRateLimit = decision.reason === "RATE_LIMIT";
  let message: string;

  if (isRateLimit) {
    const retryAfter = retryAfterSeconds(decision);
    message =
      `Arcjet denied this call (${decision.reason}). It may be retried` +
      (retryAfter === undefined ? " later." : ` after ${retryAfter} seconds.`);
  } else {
    message = `Arcjet denied this call (${decision.reason}). Do not retry; explain the denial to the user or try a different approach.`;
  }

  return message;
}

/** Explanation used when the policy could not be evaluated. */
export function unavailableReason(): string {
  return "Arcjet security check could not be completed; please retry later.";
}
