import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `tanstackAiContext` can read.
 *
 * Correlation is a **caller-owned** id from helper options,
 * `chat({ context })`, or `chat({ threadId })`. This helper never mints
 * a new id. It never reads `traceId`, `requestId`, `streamId`, or
 * `runId`.
 *
 * In TanStack AI 1.x `chat({ threadId })` is required and
 * `ChatMiddlewareContext.threadId` is the caller's value, so it is a
 * caller-owned id. It is the last fallback: a field on
 * `chat({ context })` or a helper option wins over it.
 *
 * Accepts:
 * - `chat({ context })` / the user object on `ChatMiddlewareContext.context`
 * - a `ChatMiddlewareContext`-shaped envelope (only `context` and
 *   `threadId` are read)
 * - the app context object itself
 * - `{ threadId, context }`, the values an app passes to `chat()`
 * - helper `init.sessionId` / `init.correlationId`
 */
export interface TanStackAiContextSource {
  context?: unknown;
  correlationId?: unknown;
  sessionId?: unknown;
  conversationId?: unknown;
  /** The caller's `chat({ threadId })`. The last correlation fallback. */
  threadId?: unknown;
  /** Present on TanStack's middleware envelope. Never used for correlation. */
  requestId?: unknown;
  /** Present on TanStack's middleware envelope. Never used for correlation. */
  streamId?: unknown;
}

/**
 * Context derived from a TanStack AI `chat()` run. `correlationId` is
 * omitted when nothing valid was present — this helper never mints one.
 */
export interface TanStackAiAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asContextSource(source: unknown): TanStackAiContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

function asAppContext(value: unknown): TanStackAiContextSource | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value;
}

/**
 * TanStack's `ChatMiddlewareContext` always carries SDK-minted
 * `requestId` and `streamId`, so an envelope that looks like one is
 * not mined for app ids. Only its `context` and `threadId` are read.
 */
function isMiddlewareEnvelope(source: TanStackAiContextSource): boolean {
  return typeof source.requestId === "string" && typeof source.streamId === "string";
}

/**
 * The integrator-owned app object. On a `chat({ context })` /
 * `ChatMiddlewareContext` envelope that is `source.context`. On a bare
 * app object it is the source itself.
 */
function readAppContext(
  source: TanStackAiContextSource | undefined,
): TanStackAiContextSource | undefined {
  if (source === undefined) {
    return undefined;
  }
  const nested = asAppContext(source.context);
  if (nested !== undefined) {
    return nested;
  }
  if (isMiddlewareEnvelope(source)) {
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

function validMetadataString(values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }
    if (correlationIdProblem(value) !== undefined) {
      continue;
    }
    return value;
  }
  return undefined;
}

/**
 * Derive correlation and metadata from a TanStack AI `chat()` run: the
 * `chat({ context })` object, the `{ threadId, context }` an app passes
 * to `chat()`, or a `ChatMiddlewareContext`. Never mints a new id.
 * Never calls `createAgentContext`. Never reads `traceId` /
 * `requestId` / `streamId` / `runId`.
 *
 * Preference order for `correlationId`:
 * 1. Fields the integrator put on `chat({ context })`:
 *    `correlationId`, then `sessionId`, then `conversationId`
 * 2. Documented copies on a bare app object (not a middleware envelope)
 * 3. `init.correlationId` / `init.sessionId` (a caller-owned fallback)
 * 4. `threadId` — the caller's `chat({ threadId })`
 *
 * Pass the same `{ threadId, context }` to an inbound `guard()` before
 * `chat()` that `chat()` gets, and both calls share one id.
 *
 * A bare object that also has string `requestId` and `streamId` is
 * treated as a `ChatMiddlewareContext` envelope, so a top-level
 * `sessionId` on that object is ignored.
 *
 * An invalid candidate is skipped (and warned when `ARCJET_LOG_LEVEL`
 * asks for warnings). If nothing valid remains, `correlationId` is
 * omitted so the decision is uncorrelated rather than joined to a
 * generated id nobody has.
 *
 * @example
 * ```ts
 * import { tanstackAiContext } from "@arcjet/guard/tanstack-ai/v1";
 *
 * const appContext = { sessionId: conversationId };
 * export function beforeChat() {
 *   return tanstackAiContext({ threadId, context: appContext });
 * }
 * ```
 */
export function tanstackAiContext(
  source?: TanStackAiContextSource,
  init?: { sessionId?: string; correlationId?: string; metadata?: ArcjetMetadata },
): TanStackAiAgentContext {
  const envelope = asContextSource(source);
  const app = readAppContext(envelope);
  const envelopeIsMiddleware = envelope !== undefined && isMiddlewareEnvelope(envelope);

  const fromApp = {
    correlationId: app?.correlationId,
    sessionId: app?.sessionId,
    conversationId: app?.conversationId,
  };
  const fromEnvelope = envelopeIsMiddleware
    ? { correlationId: undefined, sessionId: undefined, conversationId: undefined }
    : {
        correlationId: envelope?.correlationId,
        sessionId: envelope?.sessionId,
        conversationId: envelope?.conversationId,
      };
  const threadId = envelope?.threadId;

  const { id: correlationId, rejected } = firstValidId([
    { value: fromApp.correlationId, label: "context.correlationId" },
    { value: fromApp.sessionId, label: "context.sessionId" },
    { value: fromApp.conversationId, label: "context.conversationId" },
    { value: fromEnvelope.correlationId, label: "correlationId" },
    { value: fromEnvelope.sessionId, label: "sessionId" },
    { value: fromEnvelope.conversationId, label: "conversationId" },
    { value: init?.correlationId, label: "init.correlationId" },
    { value: init?.sessionId, label: "init.sessionId" },
    { value: threadId, label: "threadId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: TanStack AI ${rejected} rejected; no valid session/conversation/thread id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const session = validMetadataString([fromApp.sessionId, fromEnvelope.sessionId, init?.sessionId]);
  if (session !== undefined) {
    derivedMetadata["tanstack-ai.session"] = session;
  }

  const conversation = validMetadataString([fromApp.conversationId, fromEnvelope.conversationId]);
  if (conversation !== undefined) {
    derivedMetadata["tanstack-ai.conversation"] = conversation;
  }

  const thread = validMetadataString([threadId]);
  if (thread !== undefined) {
    derivedMetadata["tanstack-ai.thread"] = thread;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: TanStackAiAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
