import type {
  HookCallback,
  HookCallbackMatcher,
  HookEvent,
  HookJSONOutput,
  PostToolUseHookInput,
  PreToolUseHookInput,
  UserPromptSubmitHookInput,
} from "@anthropic-ai/claude-agent-sdk";

import { captureEvent, shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import type { ArcjetMetadata, RuleWithInput } from "../../types.ts";
import { claudeAgentContext } from "./context.ts";
import type { ClaudeContextSource } from "./context.ts";
import { deniedReason, unavailableReason } from "./denial.ts";
import { runGate } from "./gate.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on `guardHooks`
 * for PreToolUse / PostToolUse.
 */
export interface GuardHooksCall {
  toolName: string;
  input: unknown;
}

/**
 * Input passed to inbound (`UserPromptSubmit`) policy callbacks.
 */
export interface GuardHooksInbound {
  prompt: string;
}

/**
 * Inbound screen for `UserPromptSubmit`. This is the only place a turn can
 * be declined before the model sees the prompt.
 */
export interface GuardHooksInboundPolicy {
  /**
   * Guard label and capture action. Defaults to `"message.received"`.
   */
  action?: string | ((input: GuardHooksInbound) => string);
  /**
   * Rules to evaluate before the prompt is processed. Omitting this still
   * performs the guard call.
   */
  rules?: RuleWithInput[] | ((input: GuardHooksInbound) => RuleWithInput[]);
  /** Metadata merged over the derived Claude context. */
  metadata?: ArcjetMetadata | ((input: GuardHooksInbound) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
}

/**
 * Policy for `guardHooks()` — PreToolUse (deny unwrapped / built-in tools),
 * UserPromptSubmit (inbound), and PostToolUse (capture only).
 *
 * ## Screen inbound with UserPromptSubmit
 *
 * Put prompt-injection and other inbound rules on `inbound`. A DENY returns
 * `{ decision: "block" }` so the prompt is erased. A timeout already
 * fail-closes the prompt (Claude Code v2.1.208+).
 *
 * ## canUseTool is not a policy gate
 *
 * Claude's docs say `canUseTool` is skipped by `allowedTools`, allow rules,
 * and `bypassPermissions` / `acceptEdits`. Do not put Arcjet policy there.
 * There is no `guardCanUseTool`.
 *
 * ## PreToolUse is the only deny for unwrapped tools
 *
 * Built-ins (Bash, Write, …) and MCP tools you did not pass through
 * `guardTool` are gated here with `permissionDecision: "deny"`. A timeout
 * already fail-closes (the tool does not run). PostToolUse is capture only.
 * Annotations and sandbox settings are not enforcement.
 */
export interface GuardHooksPolicy {
  /**
   * Fallback session id when hook input has no valid `session_id`. Pass the
   * same value you give `query({ options.sessionId })`. Never mint a new id.
   */
  sessionId?: string;
  /**
   * Guard label and capture action for tool hooks. Defaults to
   * `"tool.invoked"`. May be a function of the tool name and input.
   */
  action?: string | ((call: GuardHooksCall) => string);
  /**
   * Rules to evaluate before an unwrapped / built-in tool runs. Omitting
   * this still performs the guard call.
   */
  rules?: RuleWithInput[] | ((call: GuardHooksCall) => RuleWithInput[]);
  /** Metadata merged over the derived Claude context for tool hooks. */
  metadata?: ArcjetMetadata | ((call: GuardHooksCall) => ArcjetMetadata);
  /** How to respond when a tool-gate evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /** Inbound screen on `UserPromptSubmit`. Defaults to action `"message.received"`. */
  inbound?: GuardHooksInboundPolicy;
}

function isContextSource(value: unknown): value is ClaudeContextSource {
  return value !== null && typeof value === "object";
}

function resolveToolAction(policy: GuardHooksPolicy, call: GuardHooksCall): string {
  if (typeof policy.action === "function") {
    return policy.action(call);
  }
  if (typeof policy.action === "string" && policy.action.length > 0) {
    return policy.action;
  }
  return "tool.invoked";
}

function resolveInboundAction(policy: GuardHooksInboundPolicy, input: GuardHooksInbound): string {
  if (typeof policy.action === "function") {
    return policy.action(input);
  }
  if (typeof policy.action === "string" && policy.action.length > 0) {
    return policy.action;
  }
  return "message.received";
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function preToolUseDeny(reason: string): HookJSONOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function userPromptBlock(reason: string): HookJSONOutput {
  return {
    decision: "block",
    reason,
  };
}

/**
 * Claude Agent SDK hooks that screen inbound prompts and gate unwrapped tools.
 *
 * Registers three events:
 * - `UserPromptSubmit` — inbound screen. DENY is `{ decision: "block" }`.
 * - `PreToolUse` — the only deny for built-ins and unwrapped MCP. DENY is
 *   `permissionDecision: "deny"`.
 * - `PostToolUse` — capture only; never blocks.
 *
 * Use this for tools you did not pass through `guardTool`. Do not also wrap
 * the same authored tool with `@arcjet/guard/vercel-ai/v7`. Do not put
 * policy on `canUseTool`.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, tokenBucket } from "@arcjet/guard";
 * import { guardHooks } from "@arcjet/guard/claude-agent-sdk/v0";
 * import { query } from "@anthropic-ai/claude-agent-sdk";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * const sessionId = conversationId;
 *
 * for await (const message of query({
 *   prompt: userText,
 *   options: {
 *     sessionId,
 *     hooks: guardHooks(arcjet, {
 *       sessionId,
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
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
export function guardHooks(
  client: ArcjetAgentClient,
  policy: GuardHooksPolicy = {},
): Partial<Record<HookEvent, HookCallbackMatcher[]>> {
  const inboundPolicy: GuardHooksInboundPolicy = policy.inbound ?? {};

  const preToolUse: HookCallback = async (input): Promise<HookJSONOutput> => {
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this matcher is registered only on PreToolUse
      const hookInput = input as PreToolUseHookInput;
      const call: GuardHooksCall = {
        toolName: stringField(hookInput.tool_name),
        input: hookInput.tool_input,
      };
      const action = resolveToolAction(policy, call);
      const source = isContextSource(hookInput) ? hookInput : undefined;
      const agentCtx = claudeAgentContext(
        source,
        policy.sessionId === undefined ? undefined : { sessionId: policy.sessionId },
      );

      const rules = typeof policy.rules === "function" ? policy.rules(call) : policy.rules;
      const policyMetadata =
        typeof policy.metadata === "function" ? policy.metadata(call) : policy.metadata;
      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "claude.phase": "before",
        ...(call.toolName.length > 0 && { "claude.tool": call.toolName }),
        ...policyMetadata,
      };

      return await runGate<HookJSONOutput>(client, {
        action,
        rules,
        correlationId: agentCtx.correlationId,
        metadata,
        onAllow: () => ({}),
        onDeny: (decision) => preToolUseDeny(deniedReason(decision)),
        onUnavailable: () => preToolUseDeny(unavailableReason()),
        onGuardError: policy.onGuardError ?? "deny",
      });
    } catch (error) {
      if (shouldWarn()) {
        console.warn("@arcjet/guard: guardHooks PreToolUse threw; denying the tool:", error);
      }
      if (policy.onGuardError === "allow") {
        return {};
      }
      return preToolUseDeny(unavailableReason());
    }
  };

  const userPromptSubmit: HookCallback = async (input): Promise<HookJSONOutput> => {
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this matcher is registered only on UserPromptSubmit
      const hookInput = input as UserPromptSubmitHookInput;
      const inbound: GuardHooksInbound = {
        prompt: stringField(hookInput.prompt),
      };
      const action = resolveInboundAction(inboundPolicy, inbound);
      const source = isContextSource(hookInput) ? hookInput : undefined;
      const agentCtx = claudeAgentContext(
        source,
        policy.sessionId === undefined ? undefined : { sessionId: policy.sessionId },
      );

      const rules =
        typeof inboundPolicy.rules === "function"
          ? inboundPolicy.rules(inbound)
          : inboundPolicy.rules;
      const policyMetadata =
        typeof inboundPolicy.metadata === "function"
          ? inboundPolicy.metadata(inbound)
          : inboundPolicy.metadata;
      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "claude.phase": "inbound",
        ...policyMetadata,
      };

      return await runGate<HookJSONOutput>(client, {
        action,
        rules,
        correlationId: agentCtx.correlationId,
        metadata,
        onAllow: () => ({}),
        onDeny: (decision) => userPromptBlock(deniedReason(decision)),
        onUnavailable: () => userPromptBlock(unavailableReason()),
        onGuardError: inboundPolicy.onGuardError ?? policy.onGuardError ?? "deny",
      });
    } catch (error) {
      if (shouldWarn()) {
        console.warn(
          "@arcjet/guard: guardHooks UserPromptSubmit threw; blocking the prompt:",
          error,
        );
      }
      if ((inboundPolicy.onGuardError ?? policy.onGuardError) === "allow") {
        return {};
      }
      return userPromptBlock(unavailableReason());
    }
  };

  const postToolUse: HookCallback = (input): Promise<HookJSONOutput> => {
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this matcher is registered only on PostToolUse
      const hookInput = input as PostToolUseHookInput;
      const call: GuardHooksCall = {
        toolName: stringField(hookInput.tool_name),
        input: hookInput.tool_input,
      };
      const action = resolveToolAction(policy, call);
      const source = isContextSource(hookInput) ? hookInput : undefined;
      const agentCtx = claudeAgentContext(
        source,
        policy.sessionId === undefined ? undefined : { sessionId: policy.sessionId },
      );

      const policyMetadata =
        typeof policy.metadata === "function" ? policy.metadata(call) : policy.metadata;
      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "claude.phase": "after",
        outcome: "success",
        ...(call.toolName.length > 0 && { "claude.tool": call.toolName }),
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
    return Promise.resolve({});
  };

  return {
    PreToolUse: [{ hooks: [preToolUse] }],
    UserPromptSubmit: [{ hooks: [userPromptSubmit] }],
    PostToolUse: [{ hooks: [postToolUse] }],
  };
}
