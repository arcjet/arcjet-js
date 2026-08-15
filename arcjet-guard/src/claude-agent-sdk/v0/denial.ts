import { retryAfterSeconds } from "../../agents/denial.ts";
import type { DecisionDeny } from "../../types.ts";

/**
 * Structured denial payload returned to the model (as `structuredContent` on
 * a `CallToolResult`, or as the PreToolUse / UserPromptSubmit reason).
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
 * MCP `CallToolResult` shape the Claude Agent SDK's `tool()` handler must
 * return. Declared structurally so this module never value-imports the SDK
 * (or `@modelcontextprotocol/sdk`, which does not re-export `CallToolResult`
 * from `@anthropic-ai/claude-agent-sdk`).
 */
export interface ClaudeCallToolResult {
  content: Array<{
    type: "text" | "image" | "audio" | "resource" | "resource_link";
    text?: string;
    [key: string]: unknown;
  }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
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

function asStructuredContent(value: ArcjetDenialResult): Record<string, unknown> {
  const content: Record<string, unknown> = {
    arcjetDenied: value.arcjetDenied,
    reason: value.reason,
    message: value.message,
    retryable: value.retryable,
  };
  if (value.retryAfterSeconds !== undefined) {
    content["retryAfterSeconds"] = value.retryAfterSeconds;
  }
  return content;
}

/**
 * DENY as a `CallToolResult` with `isError: true`. Prefer this over throwing:
 * Claude reads the composed message instead of a raw exception.
 */
export function denialCallToolResult(decision: DecisionDeny): ClaudeCallToolResult {
  const result = denialResult(decision);
  return {
    content: [{ type: "text", text: result.message }],
    structuredContent: asStructuredContent(result),
    isError: true,
  };
}

export function unavailableCallToolResult(): ClaudeCallToolResult {
  const result = unavailableResult();
  return {
    content: [{ type: "text", text: result.message }],
    structuredContent: asStructuredContent(result),
    isError: true,
  };
}

function isCallToolResult(value: unknown): value is ClaudeCallToolResult {
  if (value === null || typeof value !== "object") {
    return false;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- structural CallToolResult check
  return Array.isArray((value as { content?: unknown }).content);
}

/**
 * Coerce an `onDeny` return value into a `CallToolResult`. A value that
 * already has a `content` array is used as-is; any other object becomes
 * `structuredContent` on an `isError: true` result.
 */
export function asCallToolResult(
  value: unknown,
  fallback: ClaudeCallToolResult,
): ClaudeCallToolResult {
  if (isCallToolResult(value)) {
    return value;
  }
  if (value !== null && typeof value === "object") {
    const structuredContent: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      structuredContent[key] = entry;
    }
    return {
      content: fallback.content,
      structuredContent,
      isError: true,
    };
  }
  return fallback;
}
