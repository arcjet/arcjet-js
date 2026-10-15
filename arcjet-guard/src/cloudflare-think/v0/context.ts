import { shouldWarn } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Structural source `cloudflareThinkContext` can read.
 *
 * Correlation is a **caller-owned** id from helper options or a bag the
 * integrator already has. This helper never mints a new id. It never
 * reads Think's SDK-minted `toolCallId`. It never reads `requestId`,
 * `traceId`, Durable Object `name` / `id`, or session auto-ids.
 *
 * Accepts:
 * - a caller-owned wrap `{ context: appContext }` for inbound
 *   `cloudflareThinkContext({ context })`
 * - the app context object itself
 * - helper `init.sessionId` / `init.correlationId`
 *
 * A `beforeToolCall` `ToolCallContext` looks like an envelope
 * (`toolName` + `toolCallId`) and is not mined for correlation.
 */
export interface CloudflareThinkContextSource {
  context?: unknown;
  correlationId?: unknown;
  sessionId?: unknown;
  conversationId?: unknown;
  /** Present on Think `ToolCallContext`. Never used for correlation. */
  toolCallId?: unknown;
  /** Present on Think `ToolCallContext`. Never used for correlation. */
  toolName?: unknown;
  /** Present on Think chat / turn results. Never used for correlation. */
  requestId?: unknown;
}

/**
 * Context derived from a Cloudflare Think run. `correlationId` is
 * omitted when nothing valid was present — this helper never mints one.
 */
export interface CloudflareThinkAgentContext {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}

function asContextSource(source: unknown): CloudflareThinkContextSource | undefined {
  if (source === undefined || source === null || typeof source !== "object") {
    return undefined;
  }
  return source;
}

function asAppContext(value: unknown): CloudflareThinkContextSource | undefined {
  if (value === undefined || value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value;
}

/**
 * Think's `beforeToolCall` context always carries `toolName` and
 * `toolCallId`. Those fields are SDK-minted, so an envelope that looks
 * like one must not be mined for correlation.
 */
function isToolCallEnvelope(source: CloudflareThinkContextSource): boolean {
  return typeof source.toolName === "string" && typeof source.toolCallId === "string";
}

/**
 * The integrator-owned app object. On a wrap that is `source.context`.
 * On a bare app object it is the source itself. A Think tool-call
 * envelope is not an app object.
 */
function readAppContext(
  source: CloudflareThinkContextSource | undefined,
): CloudflareThinkContextSource | undefined {
  if (source === undefined) {
    return undefined;
  }
  const nested = asAppContext(source.context);
  if (nested !== undefined) {
    return nested;
  }
  if (isToolCallEnvelope(source)) {
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
 * Derive correlation and metadata from a caller-owned bag or helper
 * options. Never mints a new id. Never calls `createAgentContext`.
 * Never reads `toolCallId` (Think always generates it). Never reads
 * `requestId` / `traceId` / Durable Object `name` / `id`.
 *
 * Preference order for `correlationId`:
 * 1. Fields the integrator put on a caller-owned wrap
 *    (`cloudflareThinkContext({ context: appContext })`):
 *    `correlationId`, then `sessionId`, then `conversationId`
 * 2. Documented copies on a bare app object (not a tool-call envelope)
 * 3. `init.sessionId` / `init.correlationId` (a caller-owned fallback)
 *
 * Prefer `guardHooks({ sessionId })` or
 * `cloudflareThinkContext({ context: appContext })`. A
 * `beforeToolCall` context that has `toolName` and `toolCallId` is
 * treated as a Think envelope, so a top-level `sessionId` on that
 * object is ignored.
 *
 * An invalid candidate is skipped (and warned when `ARCJET_LOG_LEVEL`
 * asks for warnings). If nothing valid remains, `correlationId` is
 * omitted so the decision is uncorrelated rather than joined to a
 * generated id nobody has.
 *
 * @example
 * ```ts
 * import { cloudflareThinkContext } from "@arcjet/guard/cloudflare-think/v0";
 *
 * const appContext = { sessionId: conversationId };
 * export function beforeChat() {
 *   return cloudflareThinkContext({ context: appContext });
 * }
 * ```
 */
export function cloudflareThinkContext(
  source?: CloudflareThinkContextSource,
  init?: { sessionId?: string; correlationId?: string; metadata?: ArcjetMetadata },
): CloudflareThinkAgentContext {
  const envelope = asContextSource(source);
  const app = readAppContext(envelope);
  const envelopeIsToolCall = envelope !== undefined && isToolCallEnvelope(envelope);

  const fromApp = {
    correlationId: app?.correlationId,
    sessionId: app?.sessionId,
    conversationId: app?.conversationId,
  };
  const fromEnvelope = envelopeIsToolCall
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
    { value: fromEnvelope.correlationId, label: "correlationId" },
    { value: fromEnvelope.sessionId, label: "sessionId" },
    { value: fromEnvelope.conversationId, label: "conversationId" },
    { value: init?.correlationId, label: "init.correlationId" },
    { value: init?.sessionId, label: "init.sessionId" },
  ]);

  if (rejected !== undefined && correlationId === undefined && shouldWarn()) {
    console.warn(
      `@arcjet/guard: Cloudflare Think ${rejected} rejected; no valid session/conversation id, leaving the call uncorrelated`,
    );
  }

  const derivedMetadata: ArcjetMetadata = {};

  const session = validMetadataString([fromApp.sessionId, fromEnvelope.sessionId, init?.sessionId]);
  if (session !== undefined) {
    derivedMetadata["cloudflare-think.session"] = session;
  }

  const conversation = validMetadataString([fromApp.conversationId, fromEnvelope.conversationId]);
  if (conversation !== undefined) {
    derivedMetadata["cloudflare-think.conversation"] = conversation;
  }

  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };
  const result: CloudflareThinkAgentContext = {};

  if (correlationId !== undefined) {
    result.correlationId = correlationId;
  }
  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
