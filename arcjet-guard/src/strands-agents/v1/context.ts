import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `strandsAgentContext` can read.
 *
 * The SDK's `InvocationState` is a caller-owned `Record<string, unknown>`.
 * The core loop writes no keys into it. This helper reads a caller-owned
 * id from that bag (and documented copies on the envelope). It never
 * mints a new id. It never reads `traceId` (a typical OTel / SDK field
 * the docs mention as an example — still not ours). It never reads
 * `agent.id`. It never calls `SessionManager`.
 *
 * Accepts:
 * - the `invocationState` bag itself
 * - a tool / hook envelope (`{ invocationState }`, plus documented copies)
 */
export interface StrandsContextSource {
  invocationState?: unknown;
  correlationId?: unknown;
  sessionId?: unknown;
  requestId?: unknown;
}

/**
 * Context derived from a Strands Agents invocation. `correlationId` is
 * omitted when nothing valid was present — this helper never mints one.
 */
export interface StrandsAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a non-null, non-array object is a property bag
  return value as Record<string, unknown>;
}

function asContextSource(source: unknown): StrandsContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

/**
 * The caller-owned bag. On a tool / hook envelope that is
 * `source.invocationState`. On a bare bag it is the source itself.
 */
function readInvocationState(
  source: StrandsContextSource | undefined,
): Record<string, unknown> | undefined {
  if (source === undefined) {
    return undefined;
  }
  const nested = asRecord(source.invocationState);
  if (nested !== undefined) {
    return nested;
  }
  return asRecord(source);
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
 * Derive correlation and metadata from a Strands `invocationState` bag
 * or a tool / hook envelope that carries one. Never mints a new id.
 * Never calls `createAgentContext`. Never reads `traceId`. Never reads
 * `agent.id`. Never calls `SessionManager`.
 *
 * Preference order for `correlationId`:
 * 1. Fields the integrator put on `invocationState`: `correlationId`,
 *    then `sessionId`, then `requestId`
 * 2. Documented copies on the envelope
 * 3. `init.sessionId` / `init.correlationId` (a caller-owned fallback)
 *
 * An invalid candidate is skipped (and warned when `ARCJET_LOG_LEVEL`
 * asks for warnings). If nothing valid remains, `correlationId` is
 * omitted so the decision is uncorrelated rather than joined to a
 * generated id nobody has.
 *
 * @example
 * ```ts
 * import { strandsAgentContext } from "@arcjet/guard/strands-agents/v1";
 *
 * const invocationState = { sessionId: conversationId };
 * export function beforeInvoke() {
 *   return strandsAgentContext({ invocationState });
 * }
 * ```
 */
export function strandsAgentContext(
  source?: StrandsContextSource,
  init?: { sessionId?: string; correlationId?: string; metadata?: ArcjetMetadata },
): StrandsAgentContext {
  const envelope = asContextSource(source);
  const state = readInvocationState(envelope);

  const fromState = {
    correlationId: state?.["correlationId"],
    sessionId: state?.["sessionId"],
    requestId: state?.["requestId"],
  };
  const fromEnvelope = {
    correlationId: envelope?.correlationId,
    sessionId: envelope?.sessionId,
    requestId: envelope?.requestId,
  };

  const { id: correlationId, rejected } = firstValidId([
    { value: fromState.correlationId, label: "invocationState.correlationId" },
    { value: fromState.sessionId, label: "invocationState.sessionId" },
    { value: fromState.requestId, label: "invocationState.requestId" },
    { value: fromEnvelope.correlationId, label: "correlationId" },
    { value: fromEnvelope.sessionId, label: "sessionId" },
    { value: fromEnvelope.requestId, label: "requestId" },
    { value: init?.correlationId, label: "init.correlationId" },
    { value: init?.sessionId, label: "init.sessionId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: Strands Agents ${rejected} rejected; no valid session/request id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const session = validMetadataString([
    fromState.sessionId,
    fromEnvelope.sessionId,
    init?.sessionId,
  ]);
  if (session !== undefined) {
    derivedMetadata["strands.session"] = session;
  }

  const request = validMetadataString([fromState.requestId, fromEnvelope.requestId]);
  if (request !== undefined) {
    derivedMetadata["strands.request"] = request;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: StrandsAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
