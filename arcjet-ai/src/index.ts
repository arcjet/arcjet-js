/**
 * `@arcjet/ai` — Arcjet security helpers for the Vercel AI SDK.
 *
 * Provides context management and metadata vocabulary for integrating Arcjet
 * guard checks into AI SDK workflows. Guards are invoked on protected tool
 * calls to detect and block malicious requests, data exfiltration, and
 * policy violations at the LLM boundary.
 *
 * @packageDocumentation
 *
 * ## Example
 *
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { tool, jsonSchema, generateText } from "ai";
 * import { createAiContext, aiToolsContext, protectTool } from "@arcjet/ai";
 *
 * const arcjetClient = launchArcjet({ key: process.env.ARCJET_KEY! });
 *
 * const sendEmailTool = tool({
 *   description: "Send an email",
 *   inputSchema: jsonSchema<{ to: string }>({
 *     type: "object",
 *     properties: { to: { type: "string" } },
 *     required: ["to"],
 *   }),
 *   execute: async (input: { to: string }) => ({ success: true }),
 * });
 *
 * const protectedEmail = protectTool(arcjetClient, sendEmailTool, {
 *   action: "email.sent",
 *   rules: [tokenBucket({ mode: "LIVE", refillRate: 5, intervalSeconds: 60, maxTokens: 5 })],
 * });
 *
 * const ctx = createAiContext({ correlationId: "req-123" });
 * const result = await generateText({
 *   model: languageModel, // Use a real language model, e.g., from @ai-sdk/openai
 *   tools: { sendEmail: protectedEmail },
 *   toolsContext: aiToolsContext(ctx, { sendEmail: protectedEmail }),
 *   prompt: "Send a confirmation email",
 * });
 * ```
 *
 * ## Architecture
 *
 * - **Context**: Plain JSON-serializable `ArcjetAiContext` object, threaded
 *   explicitly through function calls (no classes, no `AsyncLocalStorage`).
 * - **ULID correlation IDs**: Generated inline with 26-character Crockford
 *   base32 identifiers, sortable by creation time. Server-validated to fit
 *   within 256 bytes of printable ASCII.
 * - **Metadata vocabulary**: `securityMetadata()` helper maps request context
 *   (user identity, agent type, workflow stage, data classification, etc.)
 *   to wire keys for audit and policy decisions.
 * - **Tool protection**: `protectTool` (Phase 3+) wraps tools with a
 *   `contextSchema` for guard evaluation; `aiToolsContext` fans context
 *   to protected tools only.
 *
 * All imports are modular; pick what you need.
 */

export { createAiContext, aiToolsContext } from "./context.js";
export type { ArcjetAiContext } from "./context.js";
export { securityMetadata } from "./metadata.js";
export type { SecurityMetadataFields } from "./metadata.js";
export { protectTool } from "./protect-tool.js";
export type { ArcjetDenialResult, ProtectToolPolicy } from "./protect-tool.js";
export { ArcjetDeniedError, captureAction, protectAction } from "./protect-action.js";
export type { CaptureActionOptions, ProtectActionPolicy } from "./protect-action.js";
export type { ArcjetAiClient, CaptureOptions } from "./client.js";
