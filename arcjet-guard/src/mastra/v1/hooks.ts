import type {
  ToolAfterHookContext,
  ToolBeforeHookResult,
  ToolHookContext,
  ToolHooks,
} from "@mastra/core/tools";

import { captureEvent, shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import type { ArcjetMetadata, RuleWithInput } from "../../types.ts";
import { mastraAgentContext } from "./context.ts";
import type { MastraContextSource } from "./context.ts";
import { denialResult, unavailableResult } from "./denial.ts";
import { runGate } from "./gate.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on `guardHooks`.
 */
export interface GuardHooksCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardHooks()` — `{ beforeToolCall, afterToolCall }` for tools
 * this package did not wrap (`guardTool` is for authored `createTool` only).
 */
export interface GuardHooksPolicy {
  /**
   * Guard label and capture action. Defaults to `"tool.invoked"`. May be a
   * function of the tool name and input.
   */
  action?: string | ((call: GuardHooksCall) => string);
  /**
   * Rules to evaluate before the tool runs. Omitting this still performs the
   * guard call.
   */
  rules?: RuleWithInput[] | ((call: GuardHooksCall) => RuleWithInput[]);
  /** Metadata merged over the derived Mastra context. */
  metadata?: ArcjetMetadata | ((call: GuardHooksCall) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
}

function isContextSource(value: unknown): value is MastraContextSource {
  return value !== null && typeof value === "object";
}

function resolveAction(policy: GuardHooksPolicy, call: GuardHooksCall): string {
  if (typeof policy.action === "function") {
    return policy.action(call);
  }
  if (typeof policy.action === "string" && policy.action.length > 0) {
    return policy.action;
  }
  return "tool.invoked";
}

/**
 * Mastra tool hooks that gate unwrapped tools (MCP, workspace, toolsets).
 *
 * `beforeToolCall` runs `guard()` and, on DENY, returns
 * `{ proceed: false, output }` so the tool does not execute and the model
 * receives a structured denial. `afterToolCall` captures the outcome and
 * never blocks.
 *
 * Use this for tools you did not pass through `guardTool`. Do not also wrap
 * the same authored tool with `@arcjet/guard/vercel-ai/v7`.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardHooks } from "@arcjet/guard/mastra/v1";
 * import { Agent } from "@mastra/core/agent";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * export const agent = new Agent({
 *   id: "support-agent",
 *   name: "support-agent",
 *   instructions: "Help the user.",
 *   model: "openai/gpt-4o",
 *   hooks: guardHooks(arcjet, {
 *     action: ({ toolName }) => `${toolName}.invoked`,
 *     rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *   }),
 * });
 * ```
 */
export function guardHooks(client: ArcjetAgentClient, policy: GuardHooksPolicy = {}): ToolHooks {
  const hooks: ToolHooks = {
    async beforeToolCall(hookContext: ToolHookContext): Promise<void | ToolBeforeHookResult> {
      try {
        const call: GuardHooksCall = {
          toolName: typeof hookContext.toolName === "string" ? hookContext.toolName : "",
          input: hookContext.input,
        };
        const action = resolveAction(policy, call);
        const source = isContextSource(hookContext.context) ? hookContext.context : undefined;
        const agentCtx = mastraAgentContext(source);

        const rules = typeof policy.rules === "function" ? policy.rules(call) : policy.rules;
        const policyMetadata =
          typeof policy.metadata === "function" ? policy.metadata(call) : policy.metadata;
        const metadata: ArcjetMetadata = {
          ...agentCtx.metadata,
          "mastra.phase": "before",
          ...(call.toolName.length > 0 && { "mastra.tool": call.toolName }),
          ...policyMetadata,
        };

        return await runGate<void | ToolBeforeHookResult>(client, {
          action,
          rules,
          correlationId: agentCtx.correlationId,
          metadata,
          onAllow: () => {
            /* allow the tool to proceed */
          },
          onDeny: (decision) => ({ proceed: false, output: denialResult(decision) }),
          onUnavailable: () => ({ proceed: false, output: unavailableResult() }),
          onGuardError: policy.onGuardError ?? "deny",
        });
      } catch (error) {
        // A throw from beforeToolCall skips execute (Mastra rethrows), but a
        // structured `{ proceed: false }` is the documented deny path and
        // cannot be mistaken for "retry the tool". runGate already handles
        // guard errors; this catch is for unexpected throws (e.g. a buggy
        // policy callback).
        if (shouldWarn()) {
          console.warn("@arcjet/guard: guardHooks beforeToolCall threw; denying the tool:", error);
        }
        if (policy.onGuardError === "allow") {
          return;
        }
        return { proceed: false, output: unavailableResult() };
      }
    },
    afterToolCall(hookContext: ToolAfterHookContext): void {
      try {
        const call: GuardHooksCall = {
          toolName: typeof hookContext.toolName === "string" ? hookContext.toolName : "",
          input: hookContext.input,
        };
        const action = resolveAction(policy, call);
        const source = isContextSource(hookContext.context) ? hookContext.context : undefined;
        const agentCtx = mastraAgentContext(source);

        const policyMetadata =
          typeof policy.metadata === "function" ? policy.metadata(call) : policy.metadata;
        const metadata: ArcjetMetadata = {
          ...agentCtx.metadata,
          "mastra.phase": "after",
          outcome: hookContext.error === undefined ? "success" : "error",
          ...(call.toolName.length > 0 && { "mastra.tool": call.toolName }),
          ...policyMetadata,
        };

        const correlation =
          agentCtx.correlationId === undefined ? {} : { correlationId: agentCtx.correlationId };

        captureEvent(client, {
          action,
          ...correlation,
          metadata,
        });
      } catch {
        // Never throw from a hook
      }
    },
  };

  return hooks;
}
