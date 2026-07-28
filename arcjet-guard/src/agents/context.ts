/* oxlint-disable eslint/no-negated-condition,unicorn/no-negated-condition -- validation logic requires negation */
import type { ArcjetMetadata } from "../types.ts";

import { ulid } from "./ulid.ts";

/**
 * Validation regex for correlation IDs: 1–256 characters of printable ASCII.
 */
const CORRELATION_ID_RE: RegExp = /^[ -~]{1,256}$/;

/**
 * Security context threaded through guard evaluations.
 *
 * Plain JSON-serializable object containing a correlation ID and optional
 * metadata. Thread it explicitly through function calls and workflow/queue
 * inputs (never use module state or `AsyncLocalStorage`). The correlation ID
 * joins all decisions and events for this request into one observable sequence
 * in the Arcjet console.
 *
 * Generated automatically as a ULID if not provided; validation ensures
 * caller-supplied IDs fit within 1–256 printable ASCII characters.
 */
export interface ArcjetAgentContext {
  /**
   * Correlation ID for tracing this request across services.
   * Generated as a ULID if not supplied; validates to 1–256 printable ASCII
   * characters when supplied by the caller.
   */
  correlationId: string;
  /**
   * Optional metadata fields (security dimensions, audit context, etc.).
   */
  metadata?: ArcjetMetadata;
}

/**
 * Create an ArcjetAgentContext with a correlation ID and optional metadata.
 *
 * If no `correlationId` is supplied, a ULID is generated automatically.
 * If a `correlationId` is supplied, it is validated to be 1–256 characters
 * of printable ASCII; anything else throws an error (not truncated).
 *
 * @example
 * ```ts
 * import { createAgentContext, guardAction } from "@arcjet/guard/agents";
 *
 * // In a request handler with a request-scoped context:
 * const ctx = createAgentContext();
 * const decision = await guardAction({
 *   client,
 *   action: "post_comment",
 *   rules,
 *   correlationId: ctx.correlationId,
 *   metadata: ctx.metadata,
 *   async execute() {
 *     // Your protected operation here
 *     return await postComment(...);
 *   },
 * });
 * ```
 *
 * @param init - Optional initialization object with `correlationId` and `metadata`
 * @returns A new ArcjetAgentContext with validated correlation ID and metadata
 * @throws {Error} If a supplied correlationId is invalid (too long, non-ASCII, empty)
 */
export function createAgentContext(init?: {
  correlationId?: string;
  metadata?: ArcjetMetadata;
}): ArcjetAgentContext {
  let correlationId: string;

  if (init?.correlationId !== undefined) {
    correlationId = init.correlationId;
    // Validate caller-supplied IDs (generated ULIDs are correct by construction).
    // The typeof check matters for untyped callers: RegExp.test() coerces
    // non-strings, so e.g. a number would otherwise pass the regex.
    if (typeof correlationId === "string" && CORRELATION_ID_RE.test(correlationId)) {
      // valid - continue below
    } else {
      const problem =
        typeof correlationId !== "string"
          ? `type ${typeof correlationId}`
          : correlationId.length === 0
            ? "empty string"
            : correlationId.length > 256
              ? `length ${correlationId.length}`
              : "non-printable characters";
      throw new Error(
        `@arcjet/guard: correlationId must be 1-256 characters of printable ASCII (got ${problem}); it was rejected, not truncated.`,
      );
    }
  } else {
    correlationId = ulid();
  }

  const context: ArcjetAgentContext = {
    correlationId,
  };

  // Copy metadata so the returned context owns a fresh, JSON-serializable object.
  if (init?.metadata) {
    context.metadata = { ...init.metadata };
  }

  return context;
}

export { CORRELATION_ID_RE };
