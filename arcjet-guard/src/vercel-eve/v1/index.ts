/**
 * @packageDocumentation
 *
 * Vercel Eve namespace for Arcjet Guards, for Eve 1.x.
 *
 * This module provides Eve-specific guard helpers plus the framework-agnostic
 * layer they build on, so an Eve agent needs one import path and no notion of
 * layering.
 *
 * **Requires the optional peer dependency `eve@>=1 <2`**, and Eve's own Node
 * floor of 24 — higher than `@arcjet/guard`'s. Nothing in this module imports
 * `eve` at runtime: every Eve type arrives through `import type`, so
 * installing `@arcjet/guard` never pulls Eve in.
 *
 * **Note:** the version segment names the SDK major: use this path with Eve 1.x
 * and `@arcjet/guard/vercel-eve/v0` with Eve 0.x. Eve 1.0 keys hooks on session
 * stream version 27 facts and its hook loader rejects the event keys version 27
 * removed, so this namespace has its own `arcjetHooks`. `guardTool`,
 * `guardApproval`, `guardInbound`, and `eveAgentContext` are the same functions
 * as in `/v0`: the tool, approval, and session contracts they read are
 * unchanged in 1.x.
 *
 * @example
 * ```ts
 * // agent/tools/my-tool.ts - guard a tool with Arcjet
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/vercel-eve/v1";
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
 * import { arcjetHooks } from "@arcjet/guard/vercel-eve/v1";
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
 */

export { eveAgentContext } from "../v0/context.ts";
export { guardApproval } from "../v0/guard-approval.ts";
export type { GuardApprovalPolicy, GuardApprovalResponsePolicy } from "../v0/guard-approval.ts";
export { guardTool } from "../v0/guard-tool.ts";
export type { GuardToolPolicy } from "../v0/guard-tool.ts";
export { guardInbound } from "../v0/guard-inbound.ts";
export type { GuardInboundOptions, InboundVerdict } from "../v0/guard-inbound.ts";
export { arcjetHooks } from "./hooks.ts";
export type { ArcjetHookFamily, ArcjetHooksOptions } from "./hooks.ts";
export * from "../../agents/index.ts";
