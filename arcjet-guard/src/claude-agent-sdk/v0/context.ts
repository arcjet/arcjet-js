import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `claudeAgentContext` can read. Accepts a Claude Agent SDK
 * hook input (`session_id`, optional `agent_id`) or an options-shaped object
 * (`sessionId`).
 */
export interface ClaudeContextSource {
  session_id?: unknown;
  sessionId?: unknown;
  agent_id?: unknown;
  agent_type?: unknown;
}

/**
 * Context derived from a Claude Agent SDK session. `correlationId` is omitted
 * when neither hook `session_id` nor `options.sessionId` is a valid id — this
 * helper never mints one.
 */
export interface ClaudeAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asContextSource(source: unknown): ClaudeContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

function firstValidId(candidates: ReadonlyArray<{ value: unknown; label: string }>): {
  id: string | undefined;
  rejected: string | undefined;
} {
  let rejected: string | undefined;
  for (const candidate of candidates) {
    if (typeof candidate.value !== "string") {
      continue;
    }
    const problem = correlationIdProblem(candidate.value);
    if (problem === undefined) {
      return { id: candidate.value, rejected: undefined };
    }
    rejected = `${candidate.label} (${problem})`;
  }
  return { id: undefined, rejected };
}

function firstString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Derive correlation and metadata from a Claude Agent SDK hook input or
 * `query({ options.sessionId })`. Never mints a new id.
 *
 * Preference order for `correlationId`:
 * 1. Hook input `session_id`
 * 2. Source `sessionId` (options-shaped objects)
 * 3. `init.sessionId` (`options.sessionId` passed explicitly)
 *
 * Subagent `agent_id` is metadata only. An invalid candidate is skipped (and
 * warned when `ARCJET_LOG_LEVEL` asks for warnings). If nothing valid remains,
 * `correlationId` is omitted so the decision is uncorrelated rather than
 * joined to a generated id nobody has.
 *
 * @example
 * ```ts
 * import { claudeAgentContext } from "@arcjet/guard/claude-agent-sdk/v0";
 *
 * export function fromHook(input: { session_id: string; agent_id?: string }) {
 *   return claudeAgentContext(input);
 * }
 * ```
 */
export function claudeAgentContext(
  source?: ClaudeContextSource,
  init?: { sessionId?: string; metadata?: ArcjetMetadata },
): ClaudeAgentContext {
  const ctx = asContextSource(source);

  const { id: correlationId, rejected } = firstValidId([
    { value: ctx?.session_id, label: "session_id" },
    { value: ctx?.sessionId, label: "sessionId" },
    { value: init?.sessionId, label: "options.sessionId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: Claude ${rejected} rejected; no valid session id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const session = firstString([ctx?.session_id, ctx?.sessionId, init?.sessionId]);
  if (session !== undefined) {
    derivedMetadata["claude.session"] = session;
  }

  if (typeof ctx?.agent_id === "string" && ctx.agent_id.length > 0) {
    derivedMetadata["claude.agent"] = ctx.agent_id;
  }

  if (typeof ctx?.agent_type === "string" && ctx.agent_type.length > 0) {
    derivedMetadata["claude.agent-type"] = ctx.agent_type;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: ClaudeAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
