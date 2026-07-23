import type { InferToolSetContext, ToolSet } from "@ai-sdk/provider-utils";

import { arcjetProtectedTool } from "./internal.js";
import { ulid } from "./ulid.js";

/**
 * Validation regex for correlation IDs: 1–256 characters of printable ASCII.
 */
const CORRELATION_ID_RE = /^[\x20-\x7e]{1,256}$/;

/**
 * Security context threaded through AI SDK calls.
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
export interface ArcjetAiContext {
  /**
   * Correlation ID for tracing this request across services.
   * Generated as a ULID if not supplied; validates to 1–256 printable ASCII
   * characters when supplied by the caller.
   */
  correlationId: string;
  /**
   * Optional metadata fields (security dimensions, audit context, etc.).
   */
  metadata?: Record<string, string>;
}

/**
 * Create an ArcjetAiContext with a correlation ID and optional metadata.
 *
 * If no `correlationId` is supplied, a ULID is generated automatically.
 * If a `correlationId` is supplied, it is validated to be 1–256 characters
 * of printable ASCII; anything else throws an error (not truncated).
 *
 * @example
 * ```ts
 * // In a route handler with an existing reviewId:
 * const ctx = createAiContext({ correlationId: reviewId });
 * const response = await generateText({
 *   model: "gpt-4o",
 *   tools: protectedTools,
 *   toolsContext: aiToolsContext(ctx, protectedTools),
 *   // ...
 * });
 * ```
 *
 * @param init - Optional initialization object with `correlationId` and `metadata`
 * @returns A new ArcjetAiContext with validated correlation ID and metadata
 * @throws {Error} If a supplied correlationId is invalid (too long, non-ASCII, empty)
 */
export function createAiContext(init?: {
  correlationId?: string;
  metadata?: Record<string, string>;
}): ArcjetAiContext {
  let correlationId: string;

  // Check if correlationId was explicitly provided
  if (init?.correlationId !== undefined) {
    correlationId = init.correlationId;
    // Validate caller-supplied IDs (generated ULIDs are correct by construction)
    if (!CORRELATION_ID_RE.test(correlationId)) {
      const problem =
        correlationId.length === 0
          ? "empty string"
          : correlationId.length > 256
            ? `length ${correlationId.length}`
            : "non-printable characters";
      throw new Error(
        `@arcjet/ai: correlationId must be 1-256 characters of printable ASCII (got ${problem}); it was rejected, not truncated.`,
      );
    }
  } else {
    // No correlationId provided, generate one
    correlationId = ulid();
  }

  const context: ArcjetAiContext = {
    correlationId,
  };

  // Copy metadata into a fresh object if provided
  if (init?.metadata) {
    context.metadata = { ...init.metadata };
  }

  return context;
}

/**
 * Extract context for tools protected by Arcjet.
 *
 * Maps an ArcjetAiContext to a `toolsContext` object suitable for the
 * Vercel AI SDK's `generateText()` call. Only tools bearing the
 * `arcjetProtectedTool` brand are included in the result; unbranded tools
 * are omitted (this preserves type safety at the AI SDK call site).
 *
 * @param ctx - The security context to thread through
 * @param tools - The ToolSet passed to generateText
 * @returns A context map keyed by tool name, containing only protected tools
 *
 * @example
 * ```ts
 * import { createAiContext, aiToolsContext, protectTool } from "@arcjet/ai";
 * import { generateText } from "ai";
 *
 * const ctx = createAiContext();
 * const protected = { sendEmail: protectTool(arcjet, sendEmailTool, {...}) };
 * const result = await generateText({
 *   model,
 *   tools: protected,
 *   toolsContext: aiToolsContext(ctx, protected),
 *   prompt: "Send confirmation",
 * });
 * ```
 */
export function aiToolsContext<TOOLS extends ToolSet>(
  ctx: ArcjetAiContext,
  tools: TOOLS,
): InferToolSetContext<TOOLS> {
  const result: Record<string, ArcjetAiContext> = {};

  for (const [name, tool] of Object.entries(tools)) {
    // Include context only for tools bearing the Arcjet protection brand
    if (arcjetProtectedTool in (tool as object)) {
      result[name] = ctx;
    }
  }

  return result as unknown as InferToolSetContext<TOOLS>;
}
