/**
 * @packageDocumentation
 *
 * Claude Managed Agents namespace for Arcjet Guards, for `@anthropic-ai/sdk`
 * 1.x.
 *
 * This is **hosted** Claude Managed Agents (REST+SSE, beta
 * `managed-agents-2026-04-01`). Anthropic runs the tool loop. There is **no
 * PreToolUse**. This is not `@arcjet/guard/claude-agent-sdk/v0` and must not
 * reuse that adapter, its hooks, or `guardTool`.
 *
 * **Requires the optional type-only peer `@anthropic-ai/sdk`.** The version
 * segment names the SDK major: use this path with SDK 1.x and
 * `@arcjet/guard/claude-managed-agents/v0` with SDK 0.x. SDK 1.0 changed the
 * default `anthropic-version` and removed legacy completions, but left the
 * Managed Agents session event types this namespace mirrors unchanged. This
 * module therefore re-exports `/v0`: the helpers, types, and object identities
 * are the same through either path. If a later 1.x release changes those event
 * types, this module stops re-exporting and gets its own implementation.
 *
 * Nothing in this module imports the SDK at runtime, so installing
 * `@arcjet/guard` never pulls `@anthropic-ai/sdk` in. There is deliberately no
 * unversioned `@arcjet/guard/claude-managed-agents` alias.
 *
 * - **Inbound text** (`user.message` / `initial_events`) → `guardEvents()`
 *   **before** `sessions.events.send`. DENY does not send the user turn.
 * - **A custom tool you execute** (`agent.custom_tool_use`) →
 *   `guardCustomTool()`. DENY does not run the tool; it sends
 *   `user.custom_tool_result` with `is_error: true` and error text.
 * - **Correlation** → `claudeManagedAgentsContext()` is caller-owned only.
 *
 * Default `permission_policy: always_allow` **cannot** be gated: Anthropic
 * executes cloud tools before your process sees an event.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection } from "@arcjet/guard";
 * import {
 *   claudeManagedAgentsContext,
 *   guardEvents,
 * } from "@arcjet/guard/claude-managed-agents/v1";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * const verdict = await guardEvents(
 *   arcjet,
 *   {
 *     events: [{ type: "user.message", content: [{ type: "text", text: userText }] }],
 *     inbound: {
 *       action: "message.received",
 *       rules: ({ text }) => [detectPromptInjection()(text)],
 *     },
 *     context: claudeManagedAgentsContext({ correlationId: conversationId }),
 *   },
 *   (body) => client.beta.sessions.events.send(session.id, body),
 * );
 * ```
 */

export * from "../v0/index.ts";
