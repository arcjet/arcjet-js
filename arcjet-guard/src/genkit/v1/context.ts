import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `genkitContext` can read.
 *
 * Tool handlers receive `{ context, interrupt, resumed }`. `generate()`
 * also takes `context`. This helper reads a caller-owned id from that
 * object (and documented copies on the envelope). It never mints a new
 * id. It never reads OpenTelemetry / Genkit `traceId`. It never treats
 * `interrupt` / `resumed` as correlation. It never reads
 * `session.sessionId` from a Session object — Genkit's Session mints a
 * UUID when constructed without one.
 *
 * Accepts:
 * - `generate({ context })` / a tool handler's `{ context, interrupt, resumed }`
 * - the `ActionContext` object itself
 * - envelope copies (`correlationId`, `sessionId`, `conversationId`,
 *   already-resolved `flowId` / `runId`)
 */
export interface GenkitContextSource {
  context?: unknown;
  correlationId?: unknown;
  sessionId?: unknown;
  conversationId?: unknown;
  flowId?: unknown;
  runId?: unknown;
}

/**
 * Context derived from a Genkit generate / tool call. `correlationId` is
 * omitted when nothing valid was present — this helper never mints one.
 */
export interface GenkitAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asContextSource(source: unknown): GenkitContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

function asAppContext(value: unknown): GenkitContextSource | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value;
}

/**
 * The integrator-owned app object. On a generate / tool-handler envelope
 * that is `source.context`. On a bare ActionContext it is the source itself.
 */
function readAppContext(source: GenkitContextSource | undefined): GenkitContextSource | undefined {
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
 * Derive correlation and metadata from a Genkit `generate({ context })`
 * options object, a tool handler's `{ context, interrupt, resumed }`, or
 * a bare ActionContext. Never mints a new id. Never calls
 * `createAgentContext`. Never reads `traceId`. Never treats
 * `interrupt` / `resumed` as correlation.
 *
 * Preference order for `correlationId`:
 * 1. Fields the integrator put on `context`: `correlationId`, then
 *    `sessionId`, then `conversationId`
 * 2. Caller-owned flow / run id on `context` (`flowId`, then `runId`)
 *    — only if the caller put them there
 * 3. Documented copies on the envelope
 * 4. `init.sessionId` / `init.correlationId` (a caller-owned fallback)
 *
 * An invalid candidate is skipped (and warned when `ARCJET_LOG_LEVEL`
 * asks for warnings). If nothing valid remains, `correlationId` is
 * omitted so the decision is uncorrelated rather than joined to a
 * generated id nobody has.
 *
 * @example
 * ```ts
 * import { genkitContext } from "@arcjet/guard/genkit/v1";
 *
 * const appContext = { sessionId: conversationId };
 * export function beforeGenerate() {
 *   return genkitContext({ context: appContext });
 * }
 * ```
 */
export function genkitContext(
  source?: GenkitContextSource,
  init?: { sessionId?: string; correlationId?: string; metadata?: ArcjetMetadata },
): GenkitAgentContext {
  const envelope = asContextSource(source);
  const app = readAppContext(envelope);

  const fromApp = {
    correlationId: app?.correlationId,
    sessionId: app?.sessionId,
    conversationId: app?.conversationId,
    flowId: app?.flowId,
    runId: app?.runId,
  };
  const fromEnvelope = {
    correlationId: envelope?.correlationId,
    sessionId: envelope?.sessionId,
    conversationId: envelope?.conversationId,
    flowId: envelope?.flowId,
    runId: envelope?.runId,
  };

  const { id: correlationId, rejected } = firstValidId([
    { value: fromApp.correlationId, label: "context.correlationId" },
    { value: fromApp.sessionId, label: "context.sessionId" },
    { value: fromApp.conversationId, label: "context.conversationId" },
    { value: fromApp.flowId, label: "context.flowId" },
    { value: fromApp.runId, label: "context.runId" },
    { value: fromEnvelope.correlationId, label: "correlationId" },
    { value: fromEnvelope.sessionId, label: "sessionId" },
    { value: fromEnvelope.conversationId, label: "conversationId" },
    { value: fromEnvelope.flowId, label: "flowId" },
    { value: fromEnvelope.runId, label: "runId" },
    { value: init?.correlationId, label: "init.correlationId" },
    { value: init?.sessionId, label: "init.sessionId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: Genkit ${rejected} rejected; no valid session/conversation/flow/run id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const session = firstString([fromApp.sessionId, fromEnvelope.sessionId, init?.sessionId]);
  if (session !== undefined) {
    derivedMetadata["genkit.session"] = session;
  }

  const conversation = firstString([fromApp.conversationId, fromEnvelope.conversationId]);
  if (conversation !== undefined) {
    derivedMetadata["genkit.conversation"] = conversation;
  }

  const flow = firstString([fromApp.flowId, fromEnvelope.flowId]);
  if (flow !== undefined) {
    derivedMetadata["genkit.flow"] = flow;
  }

  const run = firstString([fromApp.runId, fromEnvelope.runId]);
  if (run !== undefined) {
    derivedMetadata["genkit.run"] = run;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: GenkitAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
