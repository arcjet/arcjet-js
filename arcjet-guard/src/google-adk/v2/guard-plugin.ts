import type { BasePlugin } from "@google/adk";

import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { googleAdkContext } from "./context.ts";
import type { GoogleAdkContextSource } from "./context.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on
 * `guardPlugin`. `input` is the tool's free-text args, not the
 * opaque `functionCallId`.
 */
export interface GuardPluginCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardPlugin()` — how to guard tools that execute
 * through a Runner `BasePlugin.beforeToolCallback`.
 *
 * `requireConfirmation` / `toolContext.requestConfirmation` /
 * `SecurityPlugin` CONFIRM is HITL, not a policy gate — this helper
 * never installs those hooks and does not use `SecurityPlugin`. After
 * a human yes, Guard still runs on the tool call.
 */
export interface GuardPluginPolicy {
  /**
   * Guard label and capture action. Defaults to `"tool.invoked"`. May be a
   * function of the tool name and args.
   */
  action?: string | ((call: GuardPluginCall) => string);
  /**
   * Rules to evaluate before a tool runs. Omitting this still performs
   * the guard call.
   */
  rules?: RuleWithInput[] | ((call: GuardPluginCall) => RuleWithInput[]);
  /** Metadata merged over the derived Google ADK context. */
  metadata?: ArcjetMetadata | ((call: GuardPluginCall) => ArcjetMetadata);
  /**
   * Fallback session id when the tool context does not carry a
   * caller-owned one. Prefer putting the id you already chose on
   * helper options or session `state`. Never mint a new id here.
   */
  sessionId?: string | ((call: GuardPluginCall) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
}

type BeforeToolCallbackParams = Parameters<BasePlugin["beforeToolCallback"]>[0];

/**
 * The Runner plugin this helper returns.
 *
 * This is ADK's `BasePlugin` (via `import type` only — this module
 * never value-imports `@google/adk`). `new Runner({ plugins })`
 * accepts it with no cast. PluginManager does not check
 * `instanceof`; it calls methods by name. Returning a dictionary
 * from `beforeToolCallback` stops `runAsync` and short-circuits
 * remaining plugins.
 */
export type GoogleAdkGuardPlugin = BasePlugin;

function isContextSource(value: unknown): value is GoogleAdkContextSource {
  return value !== null && typeof value === "object";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isBeforeToolParams(value: unknown): value is BeforeToolCallbackParams {
  if (!isRecord(value)) {
    return false;
  }
  const tool = value["tool"];
  return isRecord(tool) && typeof tool["name"] === "string";
}

function isBrandedTool(tool: unknown): boolean {
  return tool !== null && typeof tool === "object" && arcjetProtectedTool in tool;
}

function resolveAction(policy: GuardPluginPolicy, call: GuardPluginCall): string {
  if (typeof policy.action === "function") {
    return policy.action(call);
  }
  if (typeof policy.action === "string" && policy.action.length > 0) {
    return policy.action;
  }
  return "tool.invoked";
}

function resolveSessionId(policy: GuardPluginPolicy, call: GuardPluginCall): string | undefined {
  if (typeof policy.sessionId === "function") {
    return policy.sessionId(call);
  }
  if (typeof policy.sessionId === "string" && policy.sessionId.length > 0) {
    return policy.sessionId;
  }
  return undefined;
}

function denyDict(payload: { message: string }): Record<string, unknown> {
  return payload;
}

let pluginSeq = 0;

/**
 * A registry key, not a secret: `PluginManager` rejects two plugins
 * that share a name, and two distinct instances sharing one would
 * fail to register. The counter alone is not enough because a second
 * copy of this module starts counting at one again.
 */
function pluginName(): string {
  pluginSeq += 1;
  return `arcjet-guard-${pluginSeq}-${crypto.randomUUID().slice(0, 8)}`;
}

function gateToolCall(
  client: ArcjetAgentClient,
  policy: GuardPluginPolicy,
  params: BeforeToolCallbackParams,
): Promise<Record<string, unknown> | undefined> {
  if (isBrandedTool(params.tool)) {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- ADK skip is `undefined`, not void
    return Promise.resolve(undefined);
  }

  const toolName = params.tool.name;
  const input = params.toolArgs ?? {};
  const call: GuardPluginCall = { toolName, input };

  let action: string;
  let sessionId: string | undefined;
  let rules: RuleWithInput[] | undefined;
  let policyMetadata: ArcjetMetadata | undefined;
  try {
    action = resolveAction(policy, call);
    sessionId = resolveSessionId(policy, call);
    rules = typeof policy.rules === "function" ? policy.rules(call) : policy.rules;
    policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(call) : policy.metadata;
  } catch (error) {
    const actionLabel = typeof policy.action === "string" ? policy.action : "tool.invoked";
    if (shouldWarn()) {
      console.warn(
        '@arcjet/guard: policy factory for "%s" threw; treating as a guard error:',
        actionLabel,
        error,
      );
    }
    if (policy.onGuardError === "allow") {
      // oxlint-disable-next-line unicorn/no-useless-undefined -- ADK skip is `undefined`, not void
      return Promise.resolve(undefined);
    }
    return Promise.resolve(denyDict(unavailableResult()));
  }

  const source = isContextSource(params.toolContext) ? params.toolContext : undefined;
  const agentCtx = googleAdkContext(source, sessionId === undefined ? undefined : { sessionId });

  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(toolName.length > 0 && { "google-adk.tool": toolName }),
  };
  const mergedMetadata = { ...metadata, ...policyMetadata };

  return runGuarded<Record<string, unknown> | undefined>(client, {
    action,
    rules,
    correlationId: agentCtx.correlationId,
    metadata: mergedMetadata,
    onDeny: (decision: DecisionDeny) => denyDict(denialResult(decision)),
    onUnavailable: () => denyDict(unavailableResult()),
    // oxlint-disable-next-line unicorn/no-useless-undefined -- ALLOW is `undefined` so the tool runs
    execute: () => Promise.resolve(undefined),
    onGuardError: policy.onGuardError ?? "deny",
  });
}

function noopUndefined(): Promise<undefined> {
  // oxlint-disable-next-line unicorn/no-useless-undefined -- PluginManager skip is `undefined`, not void
  return Promise.resolve(undefined);
}

function noopVoid(): Promise<void> {
  return Promise.resolve();
}

/**
 * Structural `BasePlugin` with every PluginManager callback present.
 *
 * PluginManager calls methods by name on every plugin for every
 * lifecycle event. A missing method throws, and a throw from a
 * plugin is re-raised as a plugin error — a different path than
 * skip. No-op stubs return `undefined` so later plugins still run
 * for those events. Only `beforeToolCallback` is the policy gate.
 * Closures, not instance fields, so extracting the callback still
 * fail-closes.
 */
function createGuardPlugin(
  client: ArcjetAgentClient,
  policy: GuardPluginPolicy,
): GoogleAdkGuardPlugin {
  const beforeToolCallback = async (
    params: BeforeToolCallbackParams,
  ): Promise<Record<string, unknown> | undefined> => {
    try {
      if (!isBeforeToolParams(params)) {
        return undefined;
      }
      return await gateToolCall(client, policy, params);
    } catch (error) {
      if (shouldWarn()) {
        console.warn(
          "@arcjet/guard: beforeToolCallback for a Google ADK tool threw; treating as a guard error:",
          error,
        );
      }
      if (policy.onGuardError === "allow") {
        return undefined;
      }
      return denyDict(unavailableResult());
    }
  };

  return {
    name: pluginName(),
    beforeToolCallback,
    onUserMessageCallback: noopUndefined,
    beforeRunCallback: noopUndefined,
    onEventCallback: noopUndefined,
    afterRunCallback: noopVoid,
    beforeAgentCallback: noopUndefined,
    afterAgentCallback: noopUndefined,
    beforeNodeCallback: noopUndefined,
    afterNodeCallback: noopUndefined,
    beforeModelCallback: noopUndefined,
    afterModelCallback: noopUndefined,
    onModelErrorCallback: noopUndefined,
    beforeToolSelection: noopUndefined,
    beforeContextCompaction: noopVoid,
    afterContextCompaction: noopVoid,
    afterToolCallback: noopUndefined,
    onToolErrorCallback: noopUndefined,
  };
}

/**
 * A Runner `BasePlugin` whose `beforeToolCallback` is the tool-call
 * gate.
 *
 * Put Arcjet **first** in `new Runner({ plugins })`. PluginManager
 * is first-win: the first plugin that returns a non-`undefined`
 * value short-circuits remaining plugins and agent callbacks. If
 * another plugin (including `SecurityPlugin`) returns first, Guard
 * never runs.
 *
 * DENY is a dictionary (`ArcjetDenialResult`). ADK treats a returned
 * dict as skip: `runAsync` does not run and the model sees the
 * payload. `undefined` lets the tool execute. This helper does
 * **not** throw from the callback — PluginManager wraps a throw as a
 * plugin error, which is a different path than skip.
 *
 * On Guard error this helper fail-closes: it ALWAYS returns a deny
 * dict, never `undefined` (unless `onGuardError: "allow"`). Core
 * `protect()` / `guard()` stay fail-open.
 *
 * Do not use ADK `SecurityPlugin` as the Arcjet policy gate.
 * `requireConfirmation` / `requestConfirmation` is HITL. After a
 * human yes, Guard still runs.
 *
 * Already-branded tools (`arcjetProtectedTool` from a sibling
 * `guardTool`) are skipped so Guard is not double-called. This
 * namespace has no `guardTool`, and inbound `guard()` before
 * `Runner.runAsync` does not stamp that brand — it is a separate
 * call and tools are still gated. The plugin does not implement an
 * inbound / before-model prompt gate (`onUserMessageCallback` and
 * `beforeModelCallback` are no-ops) so a preceding `guard()` does
 * not double-call. Tools that are not branded — including when
 * `params.tool` is unbranded — are still gated.
 *
 * On ALLOW this helper captures `outcome: "success"` when the
 * policy lets the tool run, not when `runAsync` finishes.
 * `beforeToolCallback` cannot wrap the tool; a later tool throw
 * does not flip that capture.
 *
 * There is no `guardTool`. Skip is the plugin return, not
 * throw-from-execute. There is no `guardInbound` and no
 * `guardApproval`: `onUserMessageCallback` replaces the user
 * message, `beforeRunCallback` / `beforeModelCallback` return
 * `Content` / `LlmResponse` rather than a deny dict, and
 * confirmation is HITL. Tool gate is enough for v2.
 *
 * Do not double-wrap with `@arcjet/guard/vercel-ai/v7`. This is
 * Google ADK JS (`@google/adk` 2.x), not `@google/genai` and not
 * Python google-adk.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardPlugin } from "@arcjet/guard/google-adk/v2";
 * import { Runner } from "@google/adk";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * const runner = new Runner({
 *   appName: "my_app",
 *   agent,
 *   sessionService,
 *   plugins: [
 *     guardPlugin(arcjet, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *       sessionId: conversationId,
 *     }),
 *   ],
 * });
 * ```
 */
export function guardPlugin(
  client: ArcjetAgentClient,
  policy: GuardPluginPolicy = {},
): GoogleAdkGuardPlugin {
  // PluginManager accepts any object with the callback methods; it does
  // not check `instanceof BasePlugin`.
  return createGuardPlugin(client, policy);
}
