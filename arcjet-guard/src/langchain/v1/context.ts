import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `langchainContext` can read.
 *
 * Accepts a LangChain `createAgent` invoke config (`configurable.thread_id`),
 * a `wrapToolCall` `request.runtime` (which carries `configurable` as of
 * langchain 1.2.34), a `tool()` invoke config / `ToolRuntime`, or the
 * `configurable` object itself. Caller-owned `sessionId` / `conversationId`
 * are fallbacks when no thread id is present.
 *
 * Never mints a new id. Never reads `traceId`. A resumed run passes the
 * same config, so it keeps its `thread_id`; the interrupt and its resume
 * value are never read as correlation sources. Declared here so this
 * module never value-imports `langchain` or `@langchain/core`.
 */
export interface LangChainContextSource {
  configurable?: Record<string, unknown>;
  config?: {
    configurable?: Record<string, unknown>;
  };
  runtime?: {
    configurable?: Record<string, unknown>;
    context?: unknown;
  };
  context?: unknown;
  sessionId?: unknown;
  conversationId?: unknown;
  correlationId?: unknown;
  thread_id?: unknown;
}

/**
 * Context derived from a LangChain `createAgent` run. `correlationId` is
 * omitted when nothing valid was present — this helper never mints one.
 */
export interface LangChainAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asContextSource(source: unknown): LangChainContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

function asAppContext(value: unknown): LangChainContextSource | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value;
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
 * Every place a thread id may live, in preference order.
 *
 * A list rather than the first match: a caller threading a
 * partially-built config can carry an empty `configurable` alongside the
 * real id on `config.configurable`, and returning the empty one would
 * leave the decision uncorrelated. A candidate that carries no
 * `thread_id` at all is not an answer, so the search continues. One that
 * carries an invalid id still is, so it is reported rather than skipped.
 */
function readConfigurables(
  source: LangChainContextSource | undefined,
): Array<Record<string, unknown>> {
  if (source === undefined) {
    return [];
  }
  const candidates: Array<Record<string, unknown>> = [];
  for (const value of [
    source.configurable,
    source.runtime?.configurable,
    source.config?.configurable,
  ]) {
    if (value !== null && typeof value === "object") {
      candidates.push(value);
    }
  }
  if (source.thread_id !== undefined) {
    candidates.push({ thread_id: source.thread_id });
  }
  return candidates;
}

function readThreadId(candidates: ReadonlyArray<Record<string, unknown>>): unknown {
  for (const candidate of candidates) {
    if (candidate["thread_id"] !== undefined) {
      return candidate["thread_id"];
    }
  }
  return undefined;
}

function readAppContext(
  source: LangChainContextSource | undefined,
): LangChainContextSource | undefined {
  if (source === undefined) {
    return undefined;
  }
  const fromRuntime = asAppContext(source.runtime?.context);
  if (fromRuntime !== undefined) {
    return fromRuntime;
  }
  const nested = asAppContext(source.context);
  if (nested !== undefined) {
    return nested;
  }
  return source;
}

/**
 * Derive correlation and metadata from a LangChain `createAgent` invoke
 * config or a `wrapToolCall` `request.runtime`. Never mints a new id.
 * Never calls `createAgentContext`. Never reads `traceId`. A resumed run
 * keeps its `thread_id`, so the interrupt and its resume value are never
 * read as correlation sources.
 *
 * Preference order for `correlationId`:
 * 1. `configurable.thread_id` — what `wrapToolCall` sees on
 *    `runtime.configurable` as of langchain 1.2.34
 * 2. Caller-owned `sessionId`, then `conversationId`
 * 3. `init.sessionId` / `init.correlationId`
 *
 * An invalid candidate is skipped (and warned when `ARCJET_LOG_LEVEL`
 * asks for warnings). If nothing valid remains, `correlationId` is
 * omitted so the decision is uncorrelated rather than joined to a
 * generated id nobody has.
 *
 * @example
 * ```ts
 * import { langchainContext } from "@arcjet/guard/langchain/v1";
 *
 * export function fromInvoke(config: { configurable?: { thread_id?: string } }) {
 *   return langchainContext(config);
 * }
 * ```
 */
export function langchainContext(
  source?: LangChainContextSource,
  init?: { sessionId?: string; correlationId?: string; metadata?: ArcjetMetadata },
): LangChainAgentContext {
  const envelope = asContextSource(source);
  const app = readAppContext(envelope);

  const threadId = readThreadId(readConfigurables(envelope));
  const fromApp = {
    correlationId: app?.correlationId,
    sessionId: app?.sessionId,
    conversationId: app?.conversationId,
  };
  const fromEnvelope = {
    correlationId: envelope?.correlationId,
    sessionId: envelope?.sessionId,
    conversationId: envelope?.conversationId,
  };

  const { id: correlationId, rejected } = firstValidId([
    { value: threadId, label: "thread_id" },
    { value: fromApp.correlationId, label: "context.correlationId" },
    { value: fromApp.sessionId, label: "context.sessionId" },
    { value: fromApp.conversationId, label: "context.conversationId" },
    { value: fromEnvelope.correlationId, label: "correlationId" },
    { value: fromEnvelope.sessionId, label: "sessionId" },
    { value: fromEnvelope.conversationId, label: "conversationId" },
    { value: init?.correlationId, label: "init.correlationId" },
    { value: init?.sessionId, label: "init.sessionId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: LangChain ${rejected} rejected; no valid thread/session/conversation id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const thread = firstString([threadId]);
  if (thread !== undefined) {
    derivedMetadata["langchain.thread"] = thread;
  }

  const session = firstString([fromApp.sessionId, fromEnvelope.sessionId, init?.sessionId]);
  if (session !== undefined) {
    derivedMetadata["langchain.session"] = session;
  }

  const conversation = firstString([fromApp.conversationId, fromEnvelope.conversationId]);
  if (conversation !== undefined) {
    derivedMetadata["langchain.conversation"] = conversation;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: LangChainAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
