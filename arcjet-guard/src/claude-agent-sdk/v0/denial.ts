import type { ArcjetDenialResult } from "../../agents/denial.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { DecisionDeny } from "../../types.ts";

/**
 * Structured denial payload returned to the model (as `structuredContent` on
 * a `CallToolResult`, or as the PreToolUse / UserPromptSubmit reason).
 *
 * Claude's idiomatic delivery is a MCP `CallToolResult` with `isError: true`.
 * Prefer that over throwing: Claude reads the composed message instead of a
 * raw exception. Omitting `isError` would look like a successful tool call.
 * The payload itself is the shared contract in `agents/denial.ts`.
 */
export {
  type ArcjetDenialResult,
  denialResult,
  deniedReason,
  unavailableReason,
  unavailableResult,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "../../agents/denial.ts";

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
