import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `openaiAgentsContext` can read.
 *
 * `RunContext` itself has no session / conversation / thread id. Its public
 * fields are `context` (the app object from `run(..., { context })`),
 * `usage`, and `toolInput` (asTool only). This helper never reads a
 * fabricated `runContext.conversationId`, and never reads `traceId`
 * (the SDK mints one when omitted).
 *
 * Accepts:
 * - a `RunContext`-shaped object (`{ context: app }`)
 * - the app context object itself
 * - run options / `RunConfig` copies (`conversationId`, `groupId`,
 *   already-resolved `sessionId`)
 *
 * Do not pass a `Session` and expect `getSessionId()` to be called:
 * `MemorySession` mints a UUID when constructed without `sessionId`.
 * Resolve the id you already chose (`await session.getSessionId()`) and
 * put that string on `context` or on this source.
 */
export interface OpenAIAgentsContextSource {
  context?: unknown;
  conversationId?: unknown;
  groupId?: unknown;
  sessionId?: unknown;
  correlationId?: unknown;
}

/**
 * Context derived from an OpenAI Agents run. `correlationId` is omitted
 * when nothing valid was present — this helper never mints one.
 */
export interface OpenAIAgentsAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asContextSource(source: unknown): OpenAIAgentsContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

function asAppContext(value: unknown): OpenAIAgentsContextSource | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value;
}

/**
 * The integrator-owned app object. On a `RunContext` / run-options envelope
 * that is `source.context`. On a bare app object it is the source itself.
 */
function readAppContext(
  source: OpenAIAgentsContextSource | undefined,
): OpenAIAgentsContextSource | undefined {
  if (source === undefined) {
    return undefined;
  }
  const nested = asAppContext(source.context);
  if (nested !== undefined) {
    return nested;
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
 * Derive correlation and metadata from an OpenAI Agents `RunContext`, app
 * context, or run-options copy. Never mints a new id. Never calls
 * `createAgentContext`. Never calls `session.getSessionId()`.
 *
 * Preference order for `correlationId`:
 * 1. Fields the integrator put on `runContext.context` (or a bare app
 *    object): `correlationId`, then `sessionId`, then `conversationId`,
 *    then `groupId`
 * 2. Documented copies on the envelope: run option `conversationId`,
 *    `RunConfig.groupId`, already-resolved `sessionId`
 * 3. `init.sessionId` / `init.correlationId` (a caller-owned fallback)
 *
 * `traceId` is never read. An invalid candidate is skipped (and warned
 * when `ARCJET_LOG_LEVEL` asks for warnings). If nothing valid remains,
 * `correlationId` is omitted so the decision is uncorrelated rather than
 * joined to a generated id nobody has.
 *
 * @example
 * ```ts
 * import { openaiAgentsContext } from "@arcjet/guard/openai-agents/v0";
 *
 * const appContext = { sessionId: conversationId };
 * export function beforeRun() {
 *   return openaiAgentsContext({ context: appContext, conversationId });
 * }
 * ```
 */
export function openaiAgentsContext(
  source?: OpenAIAgentsContextSource,
  init?: { sessionId?: string; correlationId?: string; metadata?: ArcjetMetadata },
): OpenAIAgentsAgentContext {
  const envelope = asContextSource(source);
  const app = readAppContext(envelope);

  const fromApp = {
    correlationId: app?.correlationId,
    sessionId: app?.sessionId,
    conversationId: app?.conversationId,
    groupId: app?.groupId,
  };
  const fromEnvelope = {
    conversationId: envelope?.conversationId,
    groupId: envelope?.groupId,
    sessionId: envelope?.sessionId,
    correlationId: envelope?.correlationId,
  };

  const { id: correlationId, rejected } = firstValidId([
    { value: fromApp.correlationId, label: "context.correlationId" },
    { value: fromApp.sessionId, label: "context.sessionId" },
    { value: fromApp.conversationId, label: "context.conversationId" },
    { value: fromApp.groupId, label: "context.groupId" },
    { value: fromEnvelope.conversationId, label: "conversationId" },
    { value: fromEnvelope.groupId, label: "groupId" },
    { value: fromEnvelope.sessionId, label: "sessionId" },
    { value: fromEnvelope.correlationId, label: "correlationId" },
    { value: init?.correlationId, label: "init.correlationId" },
    { value: init?.sessionId, label: "init.sessionId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: OpenAI Agents ${rejected} rejected; no valid session/conversation/group id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const session = firstString([fromApp.sessionId, fromEnvelope.sessionId, init?.sessionId]);
  if (session !== undefined) {
    derivedMetadata["openai-agents.session"] = session;
  }

  const conversation = firstString([fromApp.conversationId, fromEnvelope.conversationId]);
  if (conversation !== undefined) {
    derivedMetadata["openai-agents.conversation"] = conversation;
  }

  const group = firstString([fromApp.groupId, fromEnvelope.groupId]);
  if (group !== undefined) {
    derivedMetadata["openai-agents.group"] = group;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: OpenAIAgentsAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
