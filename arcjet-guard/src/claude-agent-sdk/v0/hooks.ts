import type {
  HookCallback,
  HookCallbackMatcher,
  HookEvent,
  HookJSONOutput,
  PostToolUseHookInput,
  PreToolUseHookInput,
  UserPromptSubmitHookInput,
} from "@anthropic-ai/claude-agent-sdk";

import {
  resolveActorInputs,
  resolveCallPolicy,
  warnCaptureDegraded,
} from "../../agents/actor-inputs.ts";
import type { ActorResolver, InputsResolver } from "../../agents/actor-inputs.ts";
import { captureEvent, shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import {
  deniedReason,
  denialResult,
  unavailableReason,
  unavailableResult,
} from "../../agents/denial.ts";
import type { ArcjetDenialResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { assertValidAction } from "../../agents/label.ts";
import type { ArcjetMetadata, RuleWithInput } from "../../types.ts";
import { claudeAgentContext } from "./context.ts";
import type { ClaudeContextSource } from "./context.ts";
import { runGate } from "./gate.ts";
import { canReplaceResult, replacementOutput, toolResultText } from "./tool-results.ts";

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
  /**
   * Trusted actor identity, or a resolver `(inbound, hookInput) => …` matching
   * Claude `UserPromptSubmit`. Derive it from `session_id` / hook input; never
   * trust the prompt as the actor identity.
   */
  actor?: ActorResolver<[GuardHooksInbound, UserPromptSubmitHookInput]>;
  /**
   * Typed remote-policy inputs, or a resolver `(inbound, hookInput) => …`.
   * Build each value with {@link policyInput}.
   */
  inputs?: InputsResolver<[GuardHooksInbound, UserPromptSubmitHookInput]>;
  /** Metadata merged over the derived Claude context. */
  metadata?: ArcjetMetadata | ((input: GuardHooksInbound) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
}

/**
 * Input passed to `toolResults` callbacks: the tool call plus what it returned.
 */
export interface GuardHooksToolResult extends GuardHooksCall {
  /** The tool's result as the hook reports it, unchanged. */
  response: unknown;
  /**
   * The result's text: MCP text blocks in order, Bash's `stdout` and
   * `stderr`, Read's file content, or the whole result as JSON. Never
   * shortened.
   */
  text: string;
}

/**
 * Result screen for `PostToolUse`: Guard runs over each tool's result before
 * the model reads it.
 *
 * On DENY, or an unevaluated policy under the default `onGuardError: "deny"`,
 * an MCP tool or a tool in {@link REPLACEABLE_BUILTIN_TOOLS} has its result
 * replaced with the denial envelope through `updatedToolOutput`. Any other
 * tool's replacement would be rejected by the CLI, which then sends the
 * original result, so the run stops with `continue: false` instead. A stopped
 * session still holds the original result and must not be resumed.
 */
export interface GuardHooksToolResultsPolicy {
  /** Guard label and capture action. Defaults to `"tool.result"`. */
  action?: string | ((result: GuardHooksToolResult) => string);
  /**
   * Rules to screen the result with. Required, and a function, because a rule
   * has to be bound to text the tool has not returned yet.
   */
  rules: (result: GuardHooksToolResult) => RuleWithInput[];
  /**
   * Trusted actor identity, or a resolver `(result, hookInput) => …` matching
   * Claude `PostToolUse`. No remote-policy inputs are sent: they belong to the
   * call's own gate.
   */
  actor?: ActorResolver<[GuardHooksToolResult, PostToolUseHookInput]>;
  /** Metadata merged over the derived Claude context. */
  metadata?: ArcjetMetadata | ((result: GuardHooksToolResult) => ArcjetMetadata);
  /**
   * How to respond when the screen is unavailable. Defaults to the policy's
   * `onGuardError`, then `"deny"`.
   */
  onGuardError?: OnGuardError;
}

/**
 * A tool `PreToolUse` must not gate, because `guardTool` already guards it.
 *
 * Either the exact name the hook reports (`"Bash"`,
 * `"mcp__support__lookup_order"`), or the authored tool plus the SDK MCP server
 * it was registered under, which resolves to `mcp__<server>__<name>`. The
 * object form exists so an authored tool can be excluded without hand-writing
 * the prefix — and so a bare name never accidentally matches another server's
 * tool of the same name.
 */
export type GuardHooksExclusion = string | { server: string; name: string };

/**
 * Policy for `guardHooks()` — PreToolUse (deny unwrapped / built-in tools),
 * UserPromptSubmit (inbound), and PostToolUse (capture, plus the result screen
 * when `toolResults` is set).
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
 * already fail-closes (the tool does not run). PostToolUse captures every
 * call and blocks nothing unless `toolResults` is set. Annotations and
 * sandbox settings are not enforcement.
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
  /**
   * Trusted actor identity, or a resolver `(call, hookInput) => …` matching
   * Claude `PreToolUse`. Derive it from `session_id` / hook input; never
   * trust a model-produced tool input as the actor identity.
   */
  actor?: ActorResolver<[GuardHooksCall, PreToolUseHookInput]>;
  /**
   * Typed remote-policy inputs, or a resolver `(call, hookInput) => …`. Build
   * each value with {@link policyInput}.
   */
  inputs?: InputsResolver<[GuardHooksCall, PreToolUseHookInput]>;
  /** Metadata merged over the derived Claude context for tool hooks. */
  metadata?: ArcjetMetadata | ((call: GuardHooksCall) => ArcjetMetadata);
  /** How to respond when a tool-gate evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Tools that `PreToolUse` must not gate, because they are already wrapped
   * with `guardTool`. Without this the wrapped tool is guarded twice for one
   * invocation — two round trips, two quota units — since `PreToolUse` fires
   * for every tool and the hook input carries only a name, never the Arcjet
   * brand `guardTool` applies.
   *
   * Entries match the reported tool name **exactly**. An authored tool reaches
   * hooks as `mcp__<server>__<tool>`, so name its server with
   * `{ server, name }` and the qualified name is built for you. A bare string
   * is matched as-is, which is what you want for a built-in such as `"Bash"` —
   * it does **not** match `mcp__support__Bash`.
   *
   * `PostToolUse` capture is unaffected: excluding a tool stops the gate, not
   * the audit trail.
   *
   * @example
   * ```ts
   * guardHooks(arcjet, {
   *   exclude: [
   *     { server: "support", name: "lookup_order" },
   *     { server: "support", name: "issue_refund" },
   *   ],
   * })
   * ```
   */
  exclude?: readonly GuardHooksExclusion[];
  /** Inbound screen on `UserPromptSubmit`. Defaults to action `"message.received"`. */
  inbound?: GuardHooksInboundPolicy;
  /**
   * Result screen on `PostToolUse`. Not skipped by `exclude`, so a tool
   * wrapped with `guardTool({ resultRules })` is screened twice.
   */
  toolResults?: GuardHooksToolResultsPolicy;
}

/**
 * Resolve one exclusion to the exact tool name `PreToolUse` reports.
 *
 * An authored tool reaches hooks as `mcp__<server>__<tool>`, so the object form
 * builds that name from the server it was registered under rather than asking
 * the caller to hand-write the prefix.
 */
function exclusionToolName(exclusion: GuardHooksExclusion): string {
  return typeof exclusion === "string" ? exclusion : `mcp__${exclusion.server}__${exclusion.name}`;
}

/**
 * Whether `PreToolUse` should skip this tool because `guardTool` already guards
 * it.
 *
 * Matching is **exact** against the name the hook reports. It deliberately does
 * not treat a bare authored name as matching every MCP-qualified tool ending in
 * it: two servers can expose the same tool name, and only one of them may be
 * wrapped, so a loose match would silently drop the gate on an unprotected
 * tool. Name the server with `{ server, name }` when excluding an authored tool.
 */
export function isExcludedTool(
  toolName: string,
  exclude: readonly GuardHooksExclusion[] | undefined,
): boolean {
  if (exclude === undefined || exclude.length === 0 || toolName.length === 0) {
    return false;
  }
  return exclude.some((exclusion) => exclusionToolName(exclusion) === toolName);
}

function isContextSource(value: unknown): value is ClaudeContextSource {
  return value !== null && typeof value === "object";
}

/**
 * The tool label for a static or absent `action`, and the label used when an
 * `action` callback fails.
 */
function fallbackToolAction(policy: GuardHooksPolicy): string {
  return typeof policy.action === "string" && policy.action.length > 0
    ? policy.action
    : "tool.invoked";
}

/**
 * The inbound label for a static or absent `action`, and the label used when
 * an `action` callback fails.
 */
function fallbackInboundAction(policy: GuardHooksInboundPolicy): string {
  return typeof policy.action === "string" && policy.action.length > 0
    ? policy.action
    : "message.received";
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
 * Keep a denied result from the model: replace it where the CLI accepts a
 * replacement, and stop the run everywhere else.
 */
function postToolUseDenial(
  toolName: string,
  response: unknown,
  payload: ArcjetDenialResult,
): HookJSONOutput {
  const replacement = replacementOutput(toolName, response, JSON.stringify(payload));
  if (replacement === undefined) {
    return { continue: false, stopReason: payload.message };
  }
  return {
    hookSpecificOutput: { hookEventName: "PostToolUse", updatedToolOutput: replacement },
  };
}

function fallbackResultAction(policy: GuardHooksToolResultsPolicy): string {
  return typeof policy.action === "string" && policy.action.length > 0
    ? policy.action
    : "tool.result";
}

/**
 * Claude Agent SDK hooks that screen inbound prompts and gate unwrapped tools.
 *
 * Registers three events:
 * - `UserPromptSubmit` — inbound screen. DENY is `{ decision: "block" }`.
 * - `PreToolUse` — the only deny for built-ins and unwrapped MCP. DENY is
 *   `permissionDecision: "deny"`.
 * - `PostToolUse` — capture; with `toolResults`, also screens each tool's
 *   result and keeps a denied one from the model (see
 *   {@link GuardHooksToolResultsPolicy}).
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
  // An empty action means "unset" here and falls back to the default.
  if (typeof policy.action === "string" && policy.action !== "") {
    assertValidAction(policy.action, "guardHooks");
  }
  if (typeof policy.inbound?.action === "string" && policy.inbound.action !== "") {
    assertValidAction(policy.inbound.action, "guardHooks inbound");
  }
  const inboundPolicy: GuardHooksInboundPolicy = policy.inbound ?? {};
  const resultsPolicy = policy.toolResults;
  if (resultsPolicy !== undefined) {
    if (typeof resultsPolicy.rules !== "function") {
      throw new TypeError(
        "@arcjet/guard: guardHooks toolResults.rules must be a function of the tool's result, since a rule has to be bound to text the tool has not returned yet",
      );
    }
    if (typeof resultsPolicy.action === "string" && resultsPolicy.action !== "") {
      assertValidAction(resultsPolicy.action, "guardHooks toolResults");
    }
  }

  const preToolUse: HookCallback = async (input): Promise<HookJSONOutput> => {
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this matcher is registered only on PreToolUse
      const hookInput = input as PreToolUseHookInput;
      const call: GuardHooksCall = {
        toolName: stringField(hookInput.tool_name),
        input: hookInput.tool_input,
      };
      // A tool already wrapped with `guardTool` guards itself; gating it here
      // too would call Arcjet twice for one invocation.
      if (isExcludedTool(call.toolName, policy.exclude)) {
        return {};
      }
      // `sessionId` is static on this policy and resolved below as before, so
      // only the action, rules and metadata come from the resolution.
      const resolved = resolveCallPolicy(
        { action: policy.action, rules: policy.rules, metadata: policy.metadata },
        call,
        fallbackToolAction(policy),
      );
      const source = isContextSource(hookInput) ? hookInput : undefined;
      const agentCtx = claudeAgentContext(
        source,
        policy.sessionId === undefined ? undefined : { sessionId: policy.sessionId },
      );

      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "claude.phase": "before",
        ...(call.toolName.length > 0 && { "claude.tool": call.toolName }),
        ...resolved.metadata,
      };
      const remote = await resolveActorInputs(policy, resolved.action, call, hookInput);

      return await runGate<HookJSONOutput>(client, {
        action: resolved.action,
        rules: resolved.rules,
        correlationId: agentCtx.correlationId,
        metadata,
        degraded: resolved.degraded ?? remote.degraded,
        ...remote.fields,
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
      const resolved = resolveCallPolicy(
        inboundPolicy,
        inbound,
        fallbackInboundAction(inboundPolicy),
      );
      const source = isContextSource(hookInput) ? hookInput : undefined;
      const agentCtx = claudeAgentContext(
        source,
        policy.sessionId === undefined ? undefined : { sessionId: policy.sessionId },
      );

      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "claude.phase": "inbound",
        ...resolved.metadata,
      };
      const remote = await resolveActorInputs(inboundPolicy, resolved.action, inbound, hookInput);

      return await runGate<HookJSONOutput>(client, {
        action: resolved.action,
        rules: resolved.rules,
        correlationId: agentCtx.correlationId,
        metadata,
        degraded: resolved.degraded ?? remote.degraded,
        ...remote.fields,
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

  const capturePostToolUse = (input: Parameters<HookCallback>[0]): void => {
    try {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this matcher is registered only on PostToolUse
      const hookInput = input as PostToolUseHookInput;
      const call: GuardHooksCall = {
        toolName: stringField(hookInput.tool_name),
        input: hookInput.tool_input,
      };
      // A capture carries no rules, so only `action` and `metadata` are
      // resolved. A failed callback leaves its value out of the capture, not
      // the capture out of the record.
      const resolved = resolveCallPolicy(
        { action: policy.action, metadata: policy.metadata },
        call,
        fallbackToolAction(policy),
      );
      if (resolved.degraded !== undefined) {
        warnCaptureDegraded(resolved.action, resolved.degraded);
      }
      const source = isContextSource(hookInput) ? hookInput : undefined;
      const agentCtx = claudeAgentContext(
        source,
        policy.sessionId === undefined ? undefined : { sessionId: policy.sessionId },
      );

      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "claude.phase": "after",
        outcome: "success",
        ...(call.toolName.length > 0 && { "claude.tool": call.toolName }),
        ...resolved.metadata,
      };

      const correlation =
        agentCtx.correlationId === undefined ? {} : { correlationId: agentCtx.correlationId };

      captureEvent(client, {
        action: resolved.action,
        ...correlation,
        metadata,
      });
    } catch {
      // Never throw from a hook
    }
  };

  const screenToolResult = async (
    input: Parameters<HookCallback>[0],
    results: GuardHooksToolResultsPolicy,
  ): Promise<HookJSONOutput> => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- this matcher is registered only on PostToolUse
    const hookInput = input as PostToolUseHookInput;
    const toolName = stringField(hookInput.tool_name);
    const response: unknown = hookInput.tool_response;
    const onGuardError = results.onGuardError ?? policy.onGuardError ?? "deny";
    try {
      const result: GuardHooksToolResult = {
        toolName,
        input: hookInput.tool_input,
        response,
        text: toolResultText(toolName, response),
      };
      const resolved = resolveCallPolicy(results, result, fallbackResultAction(results));
      const source = isContextSource(hookInput) ? hookInput : undefined;
      const agentCtx = claudeAgentContext(
        source,
        policy.sessionId === undefined ? undefined : { sessionId: policy.sessionId },
      );
      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "claude.phase": "result",
        ...(toolName.length > 0 && { "claude.tool": toolName }),
        ...resolved.metadata,
      };
      const remote = await resolveActorInputs(
        results.actor === undefined ? {} : { actor: results.actor },
        resolved.action,
        result,
        hookInput,
      );

      return await runGate<HookJSONOutput>(client, {
        action: resolved.action,
        rules: resolved.rules,
        correlationId: agentCtx.correlationId,
        metadata,
        denialMetadata: {
          "claude.denial": canReplaceResult(toolName) ? "replaced" : "run_stopped",
        },
        degraded: resolved.degraded ?? remote.degraded,
        ...remote.fields,
        onAllow: () => ({}),
        onDeny: (decision) => postToolUseDenial(toolName, response, denialResult(decision)),
        onUnavailable: () => postToolUseDenial(toolName, response, unavailableResult()),
        onGuardError,
      });
    } catch (error) {
      if (shouldWarn()) {
        console.warn(
          "@arcjet/guard: guardHooks PostToolUse screen threw; keeping the result from the model:",
          error,
        );
      }
      if (onGuardError === "allow") {
        return {};
      }
      return postToolUseDenial(toolName, response, unavailableResult());
    }
  };

  const postToolUse: HookCallback = async (input): Promise<HookJSONOutput> => {
    capturePostToolUse(input);
    if (resultsPolicy === undefined) {
      return {};
    }
    return await screenToolResult(input, resultsPolicy);
  };

  return {
    PreToolUse: [{ hooks: [preToolUse] }],
    UserPromptSubmit: [{ hooks: [userPromptSubmit] }],
    PostToolUse: [{ hooks: [postToolUse] }],
  };
}
