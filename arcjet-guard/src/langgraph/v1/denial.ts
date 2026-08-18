import { retryAfterSeconds } from "../../agents/denial.ts";
import type { DecisionDeny } from "../../types.ts";

/**
 * Structured tool result returned to the model when a call is denied.
 *
 * Intentionally structurally identical to `vercel-ai/v7`'s and `mastra/v1`'s
 * ArcjetDenialResult so the model trained on denial objects sees the same
 * shape regardless of which integration is in use. Each declaration exists
 * separately to avoid putting another vendor's SDK in this namespace's import
 * graph.
 *
 * **Why this is not a `ToolMessage`.** `ToolNode` returns a tool's output
 * unchanged when `isBaseMessage(output)` holds, and otherwise wraps it in a
 * real `ToolMessage` carrying the tool call id. Passing that check needs a
 * `_getType` method, and an object that fakes it is then handed to
 * `messagesStateReducer`, which forwards anything `isBaseMessage` accepts and
 * assigns `m.lc_kwargs.id` — throwing on a duck-typed message and taking the
 * graph down. Constructing a genuine `ToolMessage` would need a value import
 * of `@langchain/core`, which this namespace must not have. So a denial is a
 * plain object: `ToolNode` wraps it, the model reads these fields as the tool
 * result content, and no graph internals are faked.
 *
 * A consequence worth knowing: because the tool does not throw, the
 * `ToolMessage` `ToolNode` builds carries `status: "success"`. The denial is
 * in the payload (`arcjetDenied: true`), not the envelope.
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

/**
 * Backoff hint returned to the model when the guard is unavailable.
 *
 * A rate-limit denial derives its hint from the denying rule's
 * `resetAtUnixSeconds`. This path has nothing to derive from. Five seconds
 * paces a model's retry loop.
 */
export const UNAVAILABLE_RETRY_AFTER_SECONDS: number = 5;

export function denialResult(decision: DecisionDeny): ArcjetDenialResult {
  const isRateLimit = decision.reason === "RATE_LIMIT";
  let retryAfterSecs: number | undefined;

  if (isRateLimit) {
    retryAfterSecs = retryAfterSeconds(decision);
  }

  const result: ArcjetDenialResult = {
    arcjetDenied: true,
    reason: decision.reason,
    message: deniedReason(decision),
    retryable: isRateLimit,
  };

  if (isRateLimit && retryAfterSecs !== undefined) {
    result.retryAfterSeconds = retryAfterSecs;
  }

  return result;
}

export function unavailableResult(): ArcjetDenialResult {
  return {
    arcjetDenied: true,
    reason: "ERROR",
    message: unavailableReason(),
    retryable: true,
    retryAfterSeconds: UNAVAILABLE_RETRY_AFTER_SECONDS,
  };
}
