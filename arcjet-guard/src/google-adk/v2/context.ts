import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `googleAdkContext` can read.
 *
 * Correlation is a **caller-owned** id from helper options or a bag the
 * integrator put on the run (`state`, a nested `context`, or a bare
 * object). This helper never mints a new id. It never reads ADK's
 * `invocationId` (always generated). It never reads `traceId`. It never
 * reads `functionCallId`. It never uses `toolContext.sessionId` /
 * `session.id` — those can be ephemeral / session-service auto-ids.
 *
 * Accepts:
 * - a `Context` / `toolContext` envelope (only `state` and nested
 *   `context` are mined)
 * - a session `state` bag (`toRecord()`, `get()`, or a plain object)
 * - the app context object itself
 * - helper `init.sessionId` / `init.correlationId`
 */
export interface GoogleAdkContextSource {
  context?: unknown;
  state?: unknown;
  correlationId?: unknown;
  sessionId?: unknown;
  conversationId?: unknown;
  /** Present on ADK `ReadonlyContext`. Never used for correlation. */
  invocationId?: unknown;
  /** Present on ADK tool context. Never used for correlation. */
  functionCallId?: unknown;
}

/**
 * Context derived from a Google ADK run. `correlationId` is omitted
 * when nothing valid was present — this helper never mints one.
 */
export interface GoogleAdkAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asContextSource(source: unknown): GoogleAdkContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a non-null, non-array object is a property bag
  return value as Record<string, unknown>;
}

function asAppContext(value: unknown): GoogleAdkContextSource | undefined {
  return asRecord(value);
}

/**
 * ADK `ReadonlyContext` / `Context` always carries `invocationId` (see
 * `newInvocationContextId()`). An envelope that looks like one must not
 * be mined for `sessionId` — that field is the session service id and
 * can be ephemeral.
 */
function isAdkContextEnvelope(source: GoogleAdkContextSource): boolean {
  return typeof source.invocationId === "string";
}

function readStateBag(state: unknown): Record<string, unknown> | undefined {
  if (state === undefined || state === null || typeof state !== "object") {
    return undefined;
  }
  const withToRecord = state as { toRecord?: unknown };
  if (typeof withToRecord.toRecord === "function") {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- guarded by typeof
    return asRecord((withToRecord as { toRecord: () => unknown }).toRecord());
  }
  const withGet = state as { get?: unknown };
  if (typeof withGet.get === "function") {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- guarded by typeof
    const get = (withGet as { get: (key: string) => unknown }).get.bind(state);
    return {
      correlationId: get("correlationId"),
      sessionId: get("sessionId"),
      conversationId: get("conversationId"),
    };
  }
  return asRecord(state);
}

/**
 * The integrator-owned app object. On a `toolContext` envelope that is
 * `source.context` or caller keys on `state`. On a bare app object it
 * is the source itself.
 */
function readAppContext(
  source: GoogleAdkContextSource | undefined,
): GoogleAdkContextSource | undefined {
  if (source === undefined) {
    return undefined;
  }
  const nested = asAppContext(source.context);
  if (nested !== undefined) {
    return nested;
  }
  if (isAdkContextEnvelope(source)) {
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
 * Derive correlation and metadata from a Google ADK `toolContext`,
 * session `state`, or a caller-owned bag. Never mints a new id. Never
 * calls `createAgentContext`. Never reads `invocationId` (ADK always
 * generates it). Never reads `traceId` / `functionCallId`. Never reads
 * `toolContext.sessionId` / `session.id` (session auto-ids).
 *
 * Preference order for `correlationId`:
 * 1. Fields the integrator put on a nested `context` bag:
 *    `correlationId`, then `sessionId`, then `conversationId`
 * 2. The same keys on session `state` (`toRecord()` / `get()` / object)
 * 3. Documented copies on a bare app object (not an ADK Context envelope)
 * 4. `init.sessionId` / `init.correlationId` (a caller-owned fallback)
 *
 * Prefer `googleAdkContext({ context: appContext })` or put the id on
 * `state` / helper options. A `toolContext` that has `invocationId` is
 * treated as an ADK envelope, so a top-level `sessionId` on that object
 * is ignored.
 *
 * An invalid candidate is skipped (and warned when `ARCJET_LOG_LEVEL`
 * asks for warnings). If nothing valid remains, `correlationId` is
 * omitted so the decision is uncorrelated rather than joined to a
 * generated id nobody has.
 *
 * @example
 * ```ts
 * import { googleAdkContext } from "@arcjet/guard/google-adk/v2";
 *
 * const appContext = { sessionId: conversationId };
 * export function beforeRun() {
 *   return googleAdkContext({ context: appContext });
 * }
 * ```
 */
export function googleAdkContext(
  source?: GoogleAdkContextSource,
  init?: { sessionId?: string; correlationId?: string; metadata?: ArcjetMetadata },
): GoogleAdkAgentContext {
  const envelope = asContextSource(source);
  const app = readAppContext(envelope);
  const state = readStateBag(envelope?.state);
  const envelopeIsAdk = envelope !== undefined && isAdkContextEnvelope(envelope);

  const fromApp = {
    correlationId: app?.correlationId,
    sessionId: app?.sessionId,
    conversationId: app?.conversationId,
  };
  const fromState = {
    correlationId: state?.["correlationId"],
    sessionId: state?.["sessionId"],
    conversationId: state?.["conversationId"],
  };
  const fromEnvelope = envelopeIsAdk
    ? { correlationId: undefined, sessionId: undefined, conversationId: undefined }
    : {
        correlationId: envelope?.correlationId,
        sessionId: envelope?.sessionId,
        conversationId: envelope?.conversationId,
      };

  const { id: correlationId, rejected } = firstValidId([
    { value: fromApp.correlationId, label: "context.correlationId" },
    { value: fromApp.sessionId, label: "context.sessionId" },
    { value: fromApp.conversationId, label: "context.conversationId" },
    { value: fromState.correlationId, label: "state.correlationId" },
    { value: fromState.sessionId, label: "state.sessionId" },
    { value: fromState.conversationId, label: "state.conversationId" },
    { value: fromEnvelope.correlationId, label: "correlationId" },
    { value: fromEnvelope.sessionId, label: "sessionId" },
    { value: fromEnvelope.conversationId, label: "conversationId" },
    { value: init?.correlationId, label: "init.correlationId" },
    { value: init?.sessionId, label: "init.sessionId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: Google ADK ${rejected} rejected; no valid session/conversation id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const session = validMetadataString([
    fromApp.sessionId,
    fromState.sessionId,
    fromEnvelope.sessionId,
    init?.sessionId,
  ]);
  if (session !== undefined) {
    derivedMetadata["google-adk.session"] = session;
  }

  const conversation = validMetadataString([
    fromApp.conversationId,
    fromState.conversationId,
    fromEnvelope.conversationId,
  ]);
  if (conversation !== undefined) {
    derivedMetadata["google-adk.conversation"] = conversation;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: GoogleAdkAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
