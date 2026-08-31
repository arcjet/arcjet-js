import type {
  BeforeToolCallDecision,
  ChatMiddleware,
  ChatMiddlewareContext,
  ToolCallHookContext,
} from "@tanstack/ai";

import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { tanstackAiContext } from "./context.ts";
import type { TanStackAiContextSource } from "./context.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on
 * `guardMiddleware`. `input` is the tool's free-text args, not the
 * opaque `toolCallId`.
 */
export interface GuardMiddlewareCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardMiddleware()` — how to guard tools that execute
 * through `chat({ middleware })` via `ChatMiddleware.onBeforeToolCall`.
 *
 * `needsApproval` / `defineInterrupt` / `onInterruptBoundary` is HITL,
 * not a policy gate — this helper never installs those hooks. After a
 * human yes, Guard still runs on the tool call.
 */
export interface GuardMiddlewarePolicy {
  /**
   * Guard label and capture action. Defaults to `"tool.invoked"`. May be a
   * function of the tool name and args.
   */
  action?: string | ((call: GuardMiddlewareCall) => string);
  /**
   * Rules to evaluate before a tool runs. Omitting this still performs
   * the guard call.
   */
  rules?: RuleWithInput[] | ((call: GuardMiddlewareCall) => RuleWithInput[]);
  /** Metadata merged over the derived TanStack AI context. */
  metadata?: ArcjetMetadata | ((call: GuardMiddlewareCall) => ArcjetMetadata);
  /**
   * Fallback session id when `chat({ context })` does not carry one.
   * Prefer putting the id you already chose on
   * `chat({ context: { sessionId } })`. Never mint a new id here.
   */
  sessionId?: string | ((call: GuardMiddlewareCall) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * How to deliver a real DENY decision. Default skip
   * (`{ type: "skip", result: ArcjetDenialResult }`) so the tool never
   * runs and the model sees the payload. `"abort"` returns
   * `{ type: "abort", reason }` and stops the chat run. No other modes.
   */
  onDeny?: "abort";
}

/**
 * The `chat({ middleware })` object this helper returns.
 *
 * This is TanStack AI's `ChatMiddleware` (via `import type` only — this
 * module never value-imports `@tanstack/ai`). `chat({ middleware })`
 * accepts it with no cast.
 */
export type TanStackAiGuardMiddleware = ChatMiddleware & {
  name: string;
  onBeforeToolCall: NonNullable<ChatMiddleware["onBeforeToolCall"]>;
};

function isContextSource(value: unknown): value is TanStackAiContextSource {
  return value !== null && typeof value === "object";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isToolCallHookContext(value: unknown): value is ToolCallHookContext {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value["toolName"] === "string";
}

function isBrandedTool(tool: unknown): boolean {
  return tool !== null && typeof tool === "object" && arcjetProtectedTool in tool;
}

function resolveAction(policy: GuardMiddlewarePolicy, call: GuardMiddlewareCall): string {
  if (typeof policy.action === "function") {
    return policy.action(call);
  }
  if (typeof policy.action === "string" && policy.action.length > 0) {
    return policy.action;
  }
  return "tool.invoked";
}

function resolveSessionId(
  policy: GuardMiddlewarePolicy,
  call: GuardMiddlewareCall,
): string | undefined {
  if (typeof policy.sessionId === "function") {
    return policy.sessionId(call);
  }
  if (typeof policy.sessionId === "string" && policy.sessionId.length > 0) {
    return policy.sessionId;
  }
  return undefined;
}

function denyDecision(
  policy: GuardMiddlewarePolicy,
  payload: { message: string },
  kind: "deny" | "unavailable",
): BeforeToolCallDecision {
  if (kind === "deny" && policy.onDeny === "abort") {
    return { type: "abort", reason: payload.message };
  }
  return { type: "skip", result: payload };
}

let middlewareSeq = 0;

/**
 * A registry key, not a secret: `chat({ middleware })` composes
 * middleware by name in logs, and two distinct instances sharing one
 * would be indistinguishable. The counter alone is not enough because
 * a second copy of this module starts counting at one again.
 */
function middlewareName(): string {
  middlewareSeq += 1;
  return `arcjet-guard-${middlewareSeq}-${crypto.randomUUID().slice(0, 8)}`;
}

function gateToolCall(
  client: ArcjetAgentClient,
  policy: GuardMiddlewarePolicy,
  ctx: ChatMiddlewareContext,
  hookCtx: ToolCallHookContext,
): Promise<BeforeToolCallDecision> {
  if (isBrandedTool(hookCtx.tool)) {
    return Promise.resolve();
  }

  const toolName = hookCtx.toolName;
  const input = hookCtx.args ?? {};
  const call: GuardMiddlewareCall = { toolName, input };

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
      return Promise.resolve();
    }
    return Promise.resolve(denyDecision(policy, unavailableResult(), "unavailable"));
  }

  const source = isContextSource(ctx) ? ctx : undefined;
  const agentCtx = tanstackAiContext(source, sessionId === undefined ? undefined : { sessionId });

  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(toolName.length > 0 && { "tanstack-ai.tool": toolName }),
  };
  const mergedMetadata = { ...metadata, ...policyMetadata };

  return runGuarded<BeforeToolCallDecision>(client, {
    action,
    rules,
    correlationId: agentCtx.correlationId,
    metadata: mergedMetadata,
    onDeny: (decision: DecisionDeny) => denyDecision(policy, denialResult(decision), "deny"),
    onUnavailable: () => denyDecision(policy, unavailableResult(), "unavailable"),
    execute: () => Promise.resolve(),
    onGuardError: policy.onGuardError ?? "deny",
  });
}

/**
 * A `chat({ middleware })` middleware whose `onBeforeToolCall` is the
 * tool-call gate.
 *
 * Put Arcjet **first** in the middleware array. `onBeforeToolCall` is
 * first-win: the first middleware that returns a non-void decision
 * wins, and the rest are skipped. If `toolCacheMiddleware` (or
 * anything else) skips first, Guard never runs.
 *
 * Default DENY is `{ type: "skip", result: ArcjetDenialResult }` so
 * the tool never runs and the model sees the payload. Optional
 * `onDeny: "abort"` returns `{ type: "abort", reason }` (the denial
 * `message` string) and stops the chat run. Abort does **not** hand
 * the model `ArcjetDenialResult` — prefer default skip when it
 * should. `onDeny: "abort"` applies to real DENY only; unavailable
 * stays skip. This helper does **not** throw from the hook (TanStack
 * swallows a throw from `execute` into `{ error }`, and a throw from
 * this hook would abort the run as an error rather than a policy
 * denial).
 *
 * Already-branded tools (`arcjetProtectedTool` from a sibling
 * `guardTool`) are skipped so Guard is not double-called. This
 * namespace has no `guardTool`, and inbound `guard()` before
 * `chat()` does not stamp that brand — it is a separate call and
 * tools are still gated. Tools that are not branded — including
 * when `hookCtx.tool` is undefined — are still gated.
 *
 * On ALLOW this helper captures `outcome: "success"` when the
 * policy lets the tool run, not when `execute` finishes.
 * `onBeforeToolCall` cannot wrap the tool; a later tool throw does
 * not flip that capture.
 *
 * There is no `guardTool`. Throwing from `execute` is swallowed into
 * `{ error }` and is not a usable deny envelope.
 *
 * Client tools and provider-native tools with no local `execute` are
 * out of scope. Do not double-wrap with `@arcjet/guard/vercel-ai/v7`.
 * TanStack AI is not the Vercel AI SDK.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardMiddleware } from "@arcjet/guard/tanstack-ai/v0";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * const stream = chat({
 *   adapter,
 *   messages,
 *   tools: [lookupOrder, ...mcpTools],
 *   context: { sessionId: conversationId },
 *   middleware: [
 *     guardMiddleware(arcjet, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *       sessionId: conversationId,
 *     }),
 *     toolCacheMiddleware(),
 *   ],
 * });
 * ```
 */
export function guardMiddleware(
  client: ArcjetAgentClient,
  policy: GuardMiddlewarePolicy = {},
): TanStackAiGuardMiddleware {
  const onBeforeToolCall = async (
    ctx: ChatMiddlewareContext,
    hookCtx: ToolCallHookContext,
  ): Promise<BeforeToolCallDecision> => {
    try {
      if (!isToolCallHookContext(hookCtx)) {
        return undefined;
      }
      return await gateToolCall(client, policy, ctx, hookCtx);
    } catch (error) {
      if (shouldWarn()) {
        console.warn(
          "@arcjet/guard: onBeforeToolCall for a TanStack AI tool threw; treating as a guard error:",
          error,
        );
      }
      if (policy.onGuardError === "allow") {
        return undefined;
      }
      return denyDecision(policy, unavailableResult(), "unavailable");
    }
  };

  return {
    name: middlewareName(),
    onBeforeToolCall,
  };
}
