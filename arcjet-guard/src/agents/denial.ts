import type { DecisionDeny } from "../types.ts";

/**
 * The one model-visible denial payload used by every JS adapter.
 *
 * One *payload* is idiomatic. One *delivery* is not:
 *
 * - Vercel AI SDK, Mastra, and OpenAI Agents return this object as the tool
 *   result. Throwing becomes a generic tool error (AI SDK), a Mastra failure,
 *   or OpenAI Agents' `errorFunction` / `ToolCallError` — none of those
 *   preserve these fields for the model.
 * - Claude Agent SDK wraps the same object in a MCP `CallToolResult` with
 *   `isError: true`. That is how Claude reads a composed tool error; a throw
 *   is a raw exception, and omitting `isError` looks like success.
 * - LangGraph returns this object so `ToolNode` can wrap it in a real
 *   `ToolMessage`. Because the tool does not throw, that message's `status`
 *   is `success` — the denial lives in the payload. Fabricating a
 *   `ToolMessage` to force `status: "error"` reaches `messagesStateReducer`
 *   and takes the graph down; this namespace also must not value-import
 *   `@langchain/core` to construct a genuine one.
 * - Vercel Eve's `guardTool` throws `ArcjetDeniedError` (which carries this
 *   same payload on `error.denial`). Eve projects a throw as
 *   `action.result` / `status: "failed"`. Returning this object is opt-in
 *   (`onDeny: "result"`) because a tool with `outputSchema` must not
 *   silently resolve to a different shape. Prefer `guardApproval` when the
 *   model should read a denial status without a throw.
 *
 * Models and agents cannot share one handler. `guardTool` (and the other
 * model-facing helpers) must produce a framework-idiomatic envelope the
 * model can inspect. `guardAction` throws `ArcjetDeniedError` so application
 * code can `catch` and branch. Passing the same `onDeny` to both would
 * either leak a throw into the model loop or swallow a policy denial as a
 * successful action.
 *
 * Adapter `denial.ts` files re-export these builders and add only the
 * envelope their SDK requires. They exist as separate modules so a vendor
 * namespace never imports another vendor's SDK.
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
 * Seconds until a rate-limited call may be retried, or `undefined` when the
 * decision carries no reset time to derive one from.
 *
 * Only meaningful for a `RATE_LIMIT` denial. A co-occurring rule that allowed
 * can still leave a `resetAtUnixSeconds` in `decision.results`, so the caller
 * decides whether to consult this at all — the reason check stays with the
 * caller rather than being duplicated here.
 *
 * @internal Exported for use by the vendor namespaces, so every one of them
 * reports the same retry-after; not part of the public API.
 */
export function retryAfterSeconds(decision: DecisionDeny): number | undefined {
  for (const result of decision.results) {
    if ("resetAtUnixSeconds" in result && typeof result.resetAtUnixSeconds === "number") {
      return Math.max(0, Math.ceil(result.resetAtUnixSeconds - Date.now() / 1000));
    }
  }
  return undefined;
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

  // Only rate-limit denials are retryable, so only they carry a retry-after.
  // A co-occurring rule that allowed can still leave a resetAtUnixSeconds in
  // decision.results; ignore it when the denying reason is not a rate limit.
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
