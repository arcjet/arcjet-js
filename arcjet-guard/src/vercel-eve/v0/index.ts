/**
 * @packageDocumentation
 *
 * Vercel Eve namespace for Arcjet Guards.
 *
 * This module provides Eve-specific guard helpers plus the framework-agnostic
 * layer they build on, so an Eve agent needs one import path and no notion of
 * layering.
 *
 * **Requires the optional peer dependency `eve@>=0.25.1 <1`**, and Eve's own
 * Node floor of 24 — higher than `@arcjet/guard`'s. Nothing in this module
 * imports `eve` at runtime: every Eve type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls Eve in.
 *
 * **Note:** the version segment is `v0` because Eve is pre-1.0 and has never
 * published a 1.x. A `v1` namespace is added when Eve reaches 1.0; the segment
 * names the SDK's major, not this integration's iteration.
 *
 * @example
 * ```ts
 * // agent/tools/my-tool.ts - guard a tool with Arcjet
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/vercel-eve/v0";
 * import type { ToolDefinition } from "eve/tools";
 *
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * const myTool: ToolDefinition<{ query: string }, string> = {
 *   description: "A protected tool",
 *   inputSchema: { query: "string" },
 *   execute: async (input: { query: string }): Promise<string> => {
 *     return `Results for: ${input.query}`;
 *   },
 * };
 *
 * export const protectedTool: ToolDefinition<{ query: string }, string> = guardTool(
 *   client,
 *   myTool,
 *   {
 *     action: "tool.invoke",
 *     onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
 *     rules: () => [
 *       tokenBucket({
 *         refillRate: 10,
 *         intervalSeconds: 60,
 *         maxTokens: 10,
 *       })({ key: "user-id", requested: 1 }),
 *     ],
 *   },
 * );
 * ```
 *
 * ```ts
 * // agent/hooks/arcjet.ts - capture Eve lifecycle events
 * import { launchArcjet } from "@arcjet/guard";
 * import { arcjetHooks } from "@arcjet/guard/vercel-eve/v0";
 * import { defineHook } from "eve/hooks";
 * import type { HookDefinition } from "eve/hooks";
 *
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * const arcjetHookDefinition: HookDefinition = arcjetHooks(client, {
 *   events: ["session", "tool"],
 * });
 *
 * const arcjetHook: typeof arcjetHookDefinition = defineHook(arcjetHookDefinition);
 *
 * export default arcjetHook;
 * ```
 *
 * ```ts
 * // agent/context.ts - derive agent context from Eve's session
 * import { eveAgentContext } from "@arcjet/guard/vercel-eve/v0";
 * import type { SessionContext } from "eve/context";
 * import type { ArcjetAgentContext } from "@arcjet/guard/vercel-eve/v0";
 *
 * export function agentContext(eveCtx: SessionContext): ArcjetAgentContext {
 *   // eveAgentContext derives an ArcjetAgentContext from an Eve SessionContext,
 *   // using the session id and auth principal to thread context through guard calls.
 *   return eveAgentContext(eveCtx);
 * }
 * ```
 */

export { eveAgentContext } from "./context.ts";
export { guardApproval } from "./guard-approval.ts";
export type { GuardApprovalPolicy } from "./guard-approval.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy } from "./guard-tool.ts";
export { guardInbound } from "./guard-inbound.ts";
export type { GuardInboundOptions, InboundVerdict } from "./guard-inbound.ts";
export { arcjetHooks } from "./hooks.ts";
export type { ArcjetHookFamily, ArcjetHooksOptions } from "./hooks.ts";
export type { ArcjetDenialResult } from "./denial.ts";
export * from "../../agents/index.ts";
