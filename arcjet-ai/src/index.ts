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
 * import Anthropic from "@anthropic-ai/sdk";
 * import { arcjet, createAiContext, aiToolsContext, protectTool } from "@arcjet/ai";
 *
 * const aj = arcjet({ key: process.env.ARCJET_KEY! });
 *
 * const tools = {
 *   transfer_funds: protectTool(aj, { name: "transfer_funds", ... }),
 * };
 *
 * const ctx = createAiContext({ correlationId: requestId });
 * const message = await client.messages.create({
 *   model: "claude-3-5-sonnet-20241022",
 *   max_tokens: 1024,
 *   tools,
 *   toolsContext: aiToolsContext(ctx, tools),
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
