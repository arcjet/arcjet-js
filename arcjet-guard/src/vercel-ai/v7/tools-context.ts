import type { InferToolSetContext, ToolSet } from "@ai-sdk/provider-utils";

import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetAgentContext } from "../../agents/context.ts";

/**
 * Extract context for tools protected by Arcjet.
 *
 * Maps an ArcjetAgentContext to a `toolsContext` object suitable for the
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
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { createAgentContext, guardTool, aiToolsContext } from "@arcjet/guard/vercel-ai/v7";
 * import { tool, generateText } from "ai";
 *
 * const arcjetClient = launchArcjet({ key: process.env.ARCJET_KEY! });
 * const ctx = createAgentContext();
 * const protectedTools = {
 *   sendEmail: guardTool(arcjetClient, sendEmailTool, {
 *     action: "email.sent",
 *     rules: [tokenBucket({ refillRate: 5, intervalSeconds: 60, maxTokens: 5 })],
 *   }),
 * };
 * const result = await generateText({
 *   model: languageModel,
 *   tools: protectedTools,
 *   toolsContext: aiToolsContext(ctx, protectedTools),
 *   messages: [{ role: "user", content: "Send confirmation" }],
 * });
 * ```
 */
export function aiToolsContext<TOOLS extends ToolSet>(
  ctx: ArcjetAgentContext,
  tools: TOOLS,
): InferToolSetContext<TOOLS> {
  const result: Record<string, ArcjetAgentContext> = {};

  for (const [name, tool] of Object.entries(tools)) {
    // Include context only for tools bearing the Arcjet protection brand
    if (arcjetProtectedTool in (tool as object)) {
      result[name] = ctx;
    }
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- InferToolSetContext<TOOLS> shape is unknowable without the concrete TOOLS type parameter; runtime filtering cannot narrow the type statically
  return result as unknown as InferToolSetContext<TOOLS>;
}
