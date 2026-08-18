/**
 * @packageDocumentation
 *
 * Claude Agent SDK namespace for Arcjet Guards.
 *
 * This module provides Claude Agent SDK-specific guard helpers plus the
 * framework-agnostic layer they build on, so a Claude agent needs one import
 * path and no notion of layering.
 *
 * **Requires the optional peer dependency `@anthropic-ai/claude-agent-sdk`
 * (`>=0.1.0 <1`)**. Nothing in this module imports the SDK at runtime: every
 * Claude type arrives through `import type`, so installing `@arcjet/guard`
 * never pulls the Claude Agent SDK in.
 *
 * **Note:** the version segment is `v0` because the Claude Agent SDK is
 * pre-1.0. There is deliberately no unversioned
 * `@arcjet/guard/claude-agent-sdk` alias. A `v1` namespace is added when the
 * SDK reaches 1.0; the segment names the SDK's major, not this integration's
 * iteration.
 *
 * Three surfaces, and three things this namespace does not build:
 *
 * - **An authored tool** (`tool()` + `createSdkMcpServer()`) → `guardTool()`.
 *   DENY returns a `CallToolResult` with `isError: true`; it does not throw.
 * - **Inbound text** → `guardHooks()` `UserPromptSubmit`. DENY is
 *   `{ decision: "block" }`. Timeout already fail-closes the prompt
 *   (Claude Code v2.1.208+).
 * - **Built-ins / unwrapped MCP** → `guardHooks()` `PreToolUse` with
 *   `permissionDecision: "deny"`. Timeout already fail-closes (the tool does
 *   not run). `PostToolUse` is capture only.
 * - **Correlation** → `claudeAgentContext()` reads `session_id` from hook
 *   input or `options.sessionId`. Subagents have `agent_id` (metadata only).
 *   It never mints a new id.
 *
 * ## Screen inbound with UserPromptSubmit
 *
 * This is the only place a turn can be declined before the model sees the
 * prompt. There is no `guardInbound`.
 *
 * ## canUseTool is not a policy gate
 *
 * Claude's docs say `canUseTool` is skipped by `allowedTools`, allow rules,
 * and `bypassPermissions` / `acceptEdits`. Same trap as Eve approval and
 * Mastra `requireApproval`. There is no `guardCanUseTool`.
 *
 * ## PreToolUse is the only deny for unwrapped tools
 *
 * Built-ins (Bash, Write, …) and MCP you did not wrap are gated here.
 * Annotations and sandbox are not enforcement. Do not also wrap these tools
 * with `@arcjet/guard/vercel-ai/v7` or `@arcjet/guard/agents`.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardTool, guardHooks } from "@arcjet/guard/claude-agent-sdk/v0";
 * import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
 * import { z } from "zod";
 *
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const lookupLimit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * const lookupOrder = guardTool(
 *   client,
 *   tool(
 *     "lookup_order",
 *     "Look up an order",
 *     { orderNumber: z.string() },
 *     async ({ orderNumber }) => ({
 *       content: [{ type: "text", text: `${orderNumber}: shipped` }],
 *     }),
 *   ),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 *
 * const sessionId = conversationId;
 *
 * for await (const message of query({
 *   prompt: userText,
 *   options: {
 *     sessionId,
 *     mcpServers: {
 *       app: createSdkMcpServer({ name: "app", tools: [lookupOrder] }),
 *     },
 *     hooks: guardHooks(client, {
 *       sessionId,
 *       inbound: {
 *         action: "message.received",
 *         rules: ({ prompt }) => [detectPromptInjection()(prompt)],
 *       },
 *     }),
 *   },
 * })) {
 *   void message;
 * }
 * ```
 */

export { claudeAgentContext } from "./context.ts";
export type { ClaudeAgentContext, ClaudeContextSource } from "./context.ts";
export { guardTool } from "./guard-tool.ts";
export type { GuardToolPolicy, ClaudeToolInput, ClaudeToolDefinition } from "./guard-tool.ts";
export { guardHooks } from "./hooks.ts";
export type {
  GuardHooksPolicy,
  GuardHooksCall,
  GuardHooksInbound,
  GuardHooksInboundPolicy,
} from "./hooks.ts";
export type { ArcjetDenialResult, ClaudeCallToolResult } from "./denial.ts";
export * from "../../agents/index.ts";
