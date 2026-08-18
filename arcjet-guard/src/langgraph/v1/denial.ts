import { retryAfterSeconds } from "../../agents/denial.ts";
import type { DecisionDeny } from "../../types.ts";

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
 * Tool-result shape `ToolNode` / the model can read on DENY.
 *
 * LangGraph's `ToolNode` treats a returned object with `getType() === "tool"`
 * as a `ToolMessage` and otherwise wraps the value in one with
 * `status: "success"`. This object carries `status: "error"` plus the
 * structured denial so either path is readable. We do not construct a
 * `@langchain/core` `ToolMessage` — that would be a value import, and CI
 * must pass with the peer absent.
 */
export interface LangGraphToolResult extends ArcjetDenialResult {
  status: "error";
  content: string;
  type: "tool";
  name: string;
  tool_call_id: string;
  getType: () => "tool";
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

export function denialToolResult(
  decision: DecisionDeny,
  extras?: { name?: string; toolCallId?: string },
): LangGraphToolResult {
  return asToolResult(denialResult(decision), extras);
}

export function unavailableToolResult(extras?: {
  name?: string;
  toolCallId?: string;
}): LangGraphToolResult {
  return asToolResult(unavailableResult(), extras);
}

/**
 * Lift a denial payload (or a caller `onDeny` object) into the tool-result
 * shape. A value that already looks like a tool result is returned as-is.
 */
export function asToolResult(
  value: unknown,
  extras?: { name?: string; toolCallId?: string },
): LangGraphToolResult {
  if (isToolResult(value)) {
    return value;
  }

  const denial = isDenialResult(value)
    ? value
    : {
        arcjetDenied: true as const,
        reason: "ERROR",
        message: typeof value === "string" ? value : unavailableReason(),
        retryable: false,
      };

  const name = extras?.name ?? "";
  const toolCallId = extras?.toolCallId ?? "";

  return {
    ...denial,
    status: "error",
    content: denial.message,
    type: "tool",
    name,
    tool_call_id: toolCallId,
    getType: () => "tool",
  };
}

function isDenialResult(value: unknown): value is ArcjetDenialResult {
  return (
    value !== null &&
    typeof value === "object" &&
    "arcjetDenied" in value &&
    (value as { arcjetDenied?: unknown }).arcjetDenied === true &&
    "reason" in value &&
    typeof (value as { reason?: unknown }).reason === "string" &&
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  );
}

function isToolResult(value: unknown): value is LangGraphToolResult {
  return (
    isDenialResult(value) &&
    "status" in value &&
    (value as { status?: unknown }).status === "error" &&
    "getType" in value &&
    typeof (value as { getType?: unknown }).getType === "function"
  );
}
