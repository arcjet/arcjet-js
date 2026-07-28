/**
 * @packageDocumentation
 *
 * Vercel AI SDK v7 namespace for Arcjet Guards.
 *
 * This module provides AI SDK–specific guard helpers (`guardTool`,
 * `aiToolsContext`) and re-exports the framework-agnostic shared layer
 * (`@arcjet/guard/agents`). Importing from here avoids multiple import paths.
 *
 * **Requires the optional peer dependencies:**
 * - `ai@^7.0.36`
 * - `@ai-sdk/provider-utils@^5.0.12`
 *
 * **Re-exports:** Everything from `@arcjet/guard/agents` (context, metadata,
 * guard and capture functions, error types) plus the Vercel AI–specific
 * `guardTool` and `aiToolsContext` helpers.
 *
 * **Note:** There is deliberately no unversioned `@arcjet/guard/vercel-ai`
 * alias. Version the import path (`/v7`) to support future major versions
 * of the Vercel AI SDK in parallel.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool, createAgentContext, aiToolsContext } from "@arcjet/guard/vercel-ai/v7";
 * import { openai } from "@ai-sdk/openai";
 * import { tool, jsonSchema, generateText } from "ai";
 *
 * const arcjetClient = launchArcjet({ key: process.env.ARCJET_KEY! });
 * const languageModel = openai("gpt-4");
 *
 * const searchWebTool = tool({
 *   description: "Search the web",
 *   inputSchema: jsonSchema<{ query: string }>({
 *     type: "object",
 *     properties: { query: { type: "string" } },
 *     required: ["query"],
 *   }),
 *   execute: async (input) => {
 *     const response = await fetch(`https://search.example/?q=${input.query}`);
 *     return await response.text();
 *   },
 * });
 *
 * const searchLimit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * const protectedTools = {
 *   searchWeb: guardTool(arcjetClient, searchWebTool, {
 *     action: "search.web",
 *     rules: () => [searchLimit({ key: "user-123", requested: 1 })],
 *   }),
 * };
 *
 * const ctx = createAgentContext({ correlationId: "req-456" });
 * const result = await generateText({
 *   model: languageModel,
 *   tools: protectedTools,
 *   toolsContext: aiToolsContext(ctx, protectedTools),
 *   messages: [{ role: "user", content: "Search for arcjet" }],
 * });
 * ```
 */

export { guardTool } from "./guard-tool.ts";
export type { ArcjetDenialResult, GuardToolPolicy } from "./guard-tool.ts";
export { aiToolsContext } from "./tools-context.ts";
export * from "../../agents/index.ts";
