import type { DecisionDeny } from "../../types.ts";

import { retryAfterSeconds } from "../../agents/denial.ts";

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
