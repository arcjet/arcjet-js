import type { Plugin } from "@strands-agents/sdk";

import { captureEvent, shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { strandsAgentContext } from "./context.ts";
import type { StrandsContextSource } from "./context.ts";
import { runGate } from "./gate.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on `guardHooks`.
 * `input` is the tool's free-text args, not the opaque `toolUseId`.
 */
export interface GuardHooksCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardHooks()` — a Plugin whose `initAgent` registers
 * `BeforeToolCallEvent` (deny unwrapped / MCP-like tools) and
 * `AfterToolCallEvent` (capture only).
 *
 * ## Screen inbound before `invoke()` / `stream()` — there is no inbound hook.
 *
 * There is no first-class inbound channel, so there is no `guardInbound`.
 * Middleware / model hooks are not this gate.
 *
 * ## `interrupt()` is not a policy gate.
 *
 * `event.interrupt()` is human-in-the-loop. Same trap as Mastra
 * `requireApproval`, Claude `canUseTool`, LangGraph `interrupt()`,
 * OpenAI Agents `needsApproval`, and LangChain
 * `humanInTheLoopMiddleware`. This helper never calls it.
 *
 * ## Deny with `BeforeToolCallEvent.cancel`. `BeforeToolsEvent.cancel`
 * skips per-tool hooks — do not use it.
 *
 * Official: set `event.cancel` to a string. `tool.stream()` does not
 * run; `AfterToolCallEvent` still fires. A non-InterruptError throw
 * aborts the invocation and drops the envelope, so this helper never
 * throws.
 */
export interface GuardHooksPolicy {
  /**
   * Guard label and capture action. Defaults to `"tool.invoked"`. May be a
   * function of the tool name and input.
   */
  action?: string | ((call: GuardHooksCall) => string);
  /**
   * Rules to evaluate before an unwrapped tool runs. Omitting this still
   * performs the guard call.
   */
  rules?: RuleWithInput[] | ((call: GuardHooksCall) => RuleWithInput[]);
  /** Metadata merged over the derived Strands context. */
  metadata?: ArcjetMetadata | ((call: GuardHooksCall) => ArcjetMetadata);
  /**
   * Fallback session id when `invocationState` does not carry one.
   * Prefer putting the id you already chose on
   * `agent.invoke(..., { invocationState: { sessionId } })`. Never mint
   * a new id here.
   */
  sessionId?: string | ((call: GuardHooksCall) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload JSON-stringified onto `event.cancel` for
   * a real DENY decision. Unavailable guards take the `onUnavailable`
   * path instead.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

/**
 * Structural `BeforeToolCallEvent` this helper mutates. Declared here
 * so tests can drive the handler without constructing the SDK class.
 */
export interface StrandsBeforeToolCallEvent {
  toolUse?: { name?: unknown; input?: unknown; toolUseId?: unknown };
  tool?: object;
  invocationState?: unknown;
  cancel?: boolean | string;
  interrupt?: (...args: never[]) => unknown;
}

/**
 * Structural `AfterToolCallEvent` this helper reads for capture.
 */
export interface StrandsAfterToolCallEvent {
  toolUse?: { name?: unknown; input?: unknown };
  error?: unknown;
  invocationState?: unknown;
}

/**
 * The Plugin this helper returns. Matches the SDK `Plugin` interface
 * (`name` + `initAgent`) via `import type` only.
 */
export type StrandsGuardPlugin = Plugin;

interface StrandsHookSdk {
  BeforeToolCallEvent: unknown;
  AfterToolCallEvent: unknown;
  HookOrder: { readonly SDK_FIRST: number };
}

let loadedSdk: StrandsHookSdk | undefined;

/**
 * `addHook` keys the registry by constructor identity, so the Plugin
 * must pass the real `BeforeToolCallEvent` / `AfterToolCallEvent`
 * classes. A static value import would make the namespace unloadable
 * when the optional peer is absent. Loading only inside `initAgent`
 * (which an app reaches only after constructing an Agent) keeps
 * `import { guardTool } from "@arcjet/guard/strands-agents/v1"`
 * peer-free. Same reason LangChain dynamically loads `ToolMessage`.
 */
async function loadStrandsHooks(): Promise<StrandsHookSdk> {
  if (loadedSdk !== undefined) {
    return loadedSdk;
  }
  const sdk = await import("@strands-agents/sdk");
  const before = sdk.BeforeToolCallEvent;
  const after = sdk.AfterToolCallEvent;
  const hookOrder = sdk.HookOrder;
  if (typeof before !== "function" || typeof after !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error(
      "@arcjet/guard: guardHooks() could not load BeforeToolCallEvent / AfterToolCallEvent from @strands-agents/sdk; the Plugin cannot register.",
    );
  }
  if (hookOrder === null || typeof hookOrder !== "object" || typeof hookOrder.SDK_FIRST !== "number") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error(
      "@arcjet/guard: guardHooks() could not load HookOrder from @strands-agents/sdk; the Plugin cannot register.",
    );
  }
  loadedSdk = {
    BeforeToolCallEvent: before,
    AfterToolCallEvent: after,
    HookOrder: hookOrder,
  };
  return loadedSdk;
}

function isContextSource(value: unknown): value is StrandsContextSource {
  return value !== null && typeof value === "object";
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
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

function resolveSessionId(policy: GuardHooksPolicy, call: GuardHooksCall): string | undefined {
  if (typeof policy.sessionId === "function") {
    return policy.sessionId(call);
  }
  if (typeof policy.sessionId === "string" && policy.sessionId.length > 0) {
    return policy.sessionId;
  }
  return undefined;
}

function cancelString(payload: unknown): string {
  try {
    return JSON.stringify(payload);
  } catch (error) {
    if (shouldWarn()) {
      console.warn(
        "@arcjet/guard: guardHooks() could not JSON.stringify a denial payload; using the default denial:",
        error,
      );
    }
    return JSON.stringify(unavailableResult());
  }
}

let pluginSeq = 0;

/**
 * A registry key, not a secret: PluginRegistry rejects a second plugin
 * of the same name, so two distinct instances sharing one must not
 * happen — the second would be refused. The counter alone is not
 * enough because a second copy of this module starts counting at one
 * again.
 */
function pluginName(): string {
  pluginSeq += 1;
  return `arcjet-guard-${pluginSeq}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * The `BeforeToolCallEvent` handler. Exported for src tests so the
 * deny / allow / brand-skip path can run without loading the peer
 * (the Plugin's `initAgent` is the only place that value-imports).
 */
export function createBeforeToolCallHandler(
  client: ArcjetAgentClient,
  policy: GuardHooksPolicy = {},
): (event: StrandsBeforeToolCallEvent) => Promise<void> {
  return async (event: StrandsBeforeToolCallEvent): Promise<void> => {
    try {
      if (event.tool !== undefined && arcjetProtectedTool in event.tool) {
        return;
      }

      const call: GuardHooksCall = {
        toolName: stringField(event.toolUse?.name),
        input: event.toolUse?.input ?? {},
      };

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
          return;
        }
        event.cancel = cancelString(unavailableResult());
        return;
      }

      const source = isContextSource(event) ? event : undefined;
      const agentCtx = strandsAgentContext(
        source,
        sessionId === undefined ? undefined : { sessionId },
      );

      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "strands.phase": "before",
        ...(call.toolName.length > 0 && { "strands.tool": call.toolName }),
      };
      const mergedMetadata = { ...metadata, ...policyMetadata };

      await runGate<void>(client, {
        action,
        rules,
        correlationId: agentCtx.correlationId,
        metadata: mergedMetadata,
        onAllow: () => {
          /* allow the tool to proceed — do not set event.cancel */
        },
        onDeny: (decision: DecisionDeny) => {
          if (policy.onDeny === undefined) {
            event.cancel = cancelString(denialResult(decision));
            return;
          }
          try {
            event.cancel = cancelString(policy.onDeny(decision));
          } catch (error) {
            if (shouldWarn()) {
              console.warn(
                '@arcjet/guard: onDeny for "%s" threw; returning the default denial:',
                action,
                error,
              );
            }
            event.cancel = cancelString(denialResult(decision));
          }
        },
        onUnavailable: () => {
          event.cancel = cancelString(unavailableResult());
        },
        onGuardError: policy.onGuardError ?? "deny",
      });
    } catch (error) {
      // A non-InterruptError throw from a hook aborts the invocation
      // and drops the envelope. Fail closed by setting cancel instead.
      if (shouldWarn()) {
        console.warn("@arcjet/guard: guardHooks BeforeToolCallEvent threw; denying the tool:", error);
      }
      if (policy.onGuardError === "allow") {
        return;
      }
      event.cancel = cancelString(unavailableResult());
    }
  };
}

/**
 * The `AfterToolCallEvent` handler. Capture only; never sets cancel
 * and never throws.
 */
export function createAfterToolCallHandler(
  client: ArcjetAgentClient,
  policy: GuardHooksPolicy = {},
): (event: StrandsAfterToolCallEvent) => void {
  return (event: StrandsAfterToolCallEvent): void => {
    try {
      const call: GuardHooksCall = {
        toolName: stringField(event.toolUse?.name),
        input: event.toolUse?.input ?? {},
      };
      const action = resolveAction(policy, call);
      const source = isContextSource(event) ? event : undefined;
      const agentCtx = strandsAgentContext(source);

      const policyMetadata =
        typeof policy.metadata === "function" ? policy.metadata(call) : policy.metadata;
      const metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "strands.phase": "after",
        outcome: event.error === undefined ? "success" : "error",
        ...(call.toolName.length > 0 && { "strands.tool": call.toolName }),
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
  };
}

/**
 * A Plugin registered on `new Agent({ plugins })`.
 *
 * `initAgent` calls `agent.addHook(BeforeToolCallEvent, …, { order:
 * HookOrder.SDK_FIRST - 1 })` so this gate runs before the SDK's own
 * earliest hooks. On DENY it sets `event.cancel` to
 * `JSON.stringify(ArcjetDenialResult)`. `tool.stream()` does not run;
 * `AfterToolCallEvent` still fires.
 *
 * Already-branded (`guardTool`) tools are skipped so Guard is not
 * double-called. Tools that are not branded — MCP, vended tools,
 * anything not wrapped — are still gated.
 *
 * Do **not** use `BeforeToolsEvent.cancel` (that skips per-tool hooks).
 * Do **not** call `event.interrupt()` (that is HITL).
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardHooks } from "@arcjet/guard/strands-agents/v1";
 * import { Agent } from "@strands-agents/sdk";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * const agent = new Agent({
 *   tools: [lookupOrder],
 *   plugins: [
 *     guardHooks(arcjet, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *       sessionId: conversationId,
 *     }),
 *   ],
 * });
 * ```
 */
export function guardHooks(
  client: ArcjetAgentClient,
  policy: GuardHooksPolicy = {},
): StrandsGuardPlugin {
  const onBefore = createBeforeToolCallHandler(client, policy);
  const onAfter = createAfterToolCallHandler(client, policy);

  return {
    name: pluginName(),
    initAgent: async (agent): Promise<void> => {
      const sdk = await loadStrandsHooks();
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- addHook is generic over the event constructor; we pass the real class from the peer
      agent.addHook(sdk.BeforeToolCallEvent as never, onBefore as never, {
        order: sdk.HookOrder.SDK_FIRST - 1,
      });
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- AfterToolCallEvent is capture only; same constructor-identity constraint
      agent.addHook(sdk.AfterToolCallEvent as never, onAfter as never);
    },
  };
}
