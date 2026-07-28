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
 * import { guardTool, createAgentContext } from "@arcjet/guard/vercel-ai/v7";
 * import { openai } from "@ai-sdk/openai";
 * import { generateText } from "ai";
 *
 * const client = openai("gpt-4");
 * const context = createAgentContext();
 *
 * const tools = {
 *   searchWeb: guardTool(
 *     {
 *       description: "Search the web",
 *       execute: async (query: string) => {
 *         return await fetch(`https://search.example/?q=${query}`);
 *       },
 *     },
 *     {
 *       action: "search.web",
 *       rules: [
 *         // Define rate limits or detection rules here
 *       ],
 *     },
 *   ),
 * };
 *
 * const result = await generateText({
 *   model: client,
 *   tools,
 *   toolsContext: { search: context },
 *   messages: [{ role: "user", content: "Search for arcjet" }],
 * });
 * ```
 */

export { guardTool } from "./guard-tool.ts";
export type { ArcjetDenialResult, GuardToolPolicy } from "./guard-tool.ts";
export { aiToolsContext } from "./tools-context.ts";
export * from "../../agents/index.ts";
