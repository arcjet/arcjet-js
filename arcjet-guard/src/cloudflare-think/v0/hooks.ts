import type { ToolCallContext, ToolCallDecision } from "@cloudflare/think";

import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { cloudflareThinkContext } from "./context.ts";
import type { CloudflareThinkContextSource } from "./context.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on
 * `guardHooks`. `input` is the tool's free-text args, not the
 * opaque `toolCallId`.
 */
export interface GuardHooksCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardHooks()` — how to guard tools that execute
 * through Think's `beforeToolCall` lifecycle hook.
 *
 * Think starter `needsApproval` is HITL, not a policy gate — this
 * helper never installs it. After a human yes, Guard still runs on
 * the tool call.
 *
 * Think re-wraps `execute` on the Cloudflare Agents harness
 * (Durable Objects, workspace / MCP / client tools). Do **not** also
 * wrap the same tools with `@arcjet/guard/vercel-ai/v7`.
 */
export interface GuardHooksPolicy {
  /**
   * Guard label and capture action. Defaults to `"tool.invoked"`. May be a
   * function of the tool name and args.
   */
  action?: string | ((call: GuardHooksCall) => string);
  /**
   * Rules to evaluate before a tool runs. Omitting this still performs
   * the guard call.
   */
  rules?: RuleWithInput[] | ((call: GuardHooksCall) => RuleWithInput[]);
  /** Metadata merged over the derived Cloudflare Think context. */
  metadata?: ArcjetMetadata | ((call: GuardHooksCall) => ArcjetMetadata);
  /**
   * Fallback session id when the hook context does not carry one.
   * Prefer putting the id you already chose on
   * `guardHooks({ sessionId })`. Never mint a new id here.
   */
  sessionId?: string | ((call: GuardHooksCall) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * How to deliver a real DENY decision. Default substitute
   * (`{ action: "substitute", output: ArcjetDenialResult }`) so the
   * tool never runs and the model sees the payload. `"block"` returns
   * `{ action: "block", reason }` (the denial `message` string). No
   * other modes.
   */
  onDeny?: "block";
}

/**
 * The Think lifecycle object this helper returns.
 *
 * This is Think's `beforeToolCall` hook (via `import type` only — this
 * module never value-imports `@cloudflare/think`). A `Think` subclass
 * delegates to it with no cast. void / `{ action: "allow" }` runs
 * `execute`. `{ action: "block" }` / `{ action: "substitute" }` skip
 * `execute`.
 */
export type CloudflareThinkGuardHooks = {
  beforeToolCall: (ctx: ToolCallContext) => Promise<ToolCallDecision | void>;
};

function isContextSource(value: unknown): value is CloudflareThinkContextSource {
  return value !== null && typeof value === "object";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isToolCallContext(value: unknown): value is ToolCallContext {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value["toolName"] === "string";
}

function isBrandedTool(tool: unknown): boolean {
  return tool !== null && typeof tool === "object" && arcjetProtectedTool in tool;
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

function denyDecision(
  policy: GuardHooksPolicy,
  payload: { message: string },
  kind: "deny" | "unavailable",
): ToolCallDecision {
  if (kind === "deny" && policy.onDeny === "block") {
    return { action: "block", reason: payload.message };
  }
  return { action: "substitute", output: payload };
}

function gateToolCall(
  client: ArcjetAgentClient,
  policy: GuardHooksPolicy,
  ctx: ToolCallContext,
): Promise<ToolCallDecision | void> {
  // Think's ToolCallContext has no `tool` field; a sibling guardTool may
  // still attach the brand on a bag the harness passes through.
  const brandedCandidate: unknown = Object.getOwnPropertyDescriptor(ctx, "tool")?.value;
  if (isBrandedTool(brandedCandidate)) {
    return Promise.resolve();
  }

  const toolName = ctx.toolName;
  const input: unknown = ctx.input ?? {};
  const call: GuardHooksCall = { toolName, input };

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
  const agentCtx = cloudflareThinkContext(
    source,
    sessionId === undefined ? undefined : { sessionId },
  );

  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(toolName.length > 0 && { "cloudflare-think.tool": toolName }),
  };
  const mergedMetadata = { ...metadata, ...policyMetadata };

  return runGuarded<ToolCallDecision | void>(client, {
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
 * Think `beforeToolCall` hooks that gate tool execution before
 * `execute` runs.
 *
 * Delegate from a `Think` subclass:
 *
 * ```ts
 * const hooks = guardHooks(arcjet, { sessionId: conversationId });
 * export class SupportAgent extends Think<Env> {
 *   beforeToolCall(ctx) {
 *     return hooks.beforeToolCall(ctx);
 *   }
 * }
 * ```
 *
 * Default DENY is `{ action: "substitute", output: ArcjetDenialResult }`
 * so the tool never runs and the model sees the payload. Optional
 * `onDeny: "block"` returns `{ action: "block", reason }` (the denial
 * `message` string). `onDeny: "block"` applies to real DENY only;
 * unavailable stays substitute. This helper does **not** throw from
 * the hook.
 *
 * On Guard error this helper fail-closes: it ALWAYS returns
 * `block` / `substitute`, never void / `{ action: "allow" }` (unless
 * `onGuardError: "allow"`). Core `protect()` / `guard()` stay
 * fail-open.
 *
 * Think starter `needsApproval` is HITL, not a policy gate. After a
 * human yes, Guard still runs. Client tools and tools with no local
 * `execute` are out of scope — Think does not fire `beforeToolCall`
 * for those.
 *
 * Already-branded tools (`arcjetProtectedTool` from a sibling
 * `guardTool`) are skipped so Guard is not double-called. This
 * namespace has no `guardTool`, and inbound `guard()` before `chat()`
 * does not stamp that brand — it is a separate call and tools are
 * still gated.
 *
 * Think re-wraps `execute` on the Cloudflare Agents harness (Durable
 * Objects, workspace / MCP / client tools). Do **not** also wrap the
 * same tools with `@arcjet/guard/vercel-ai/v7`. Mixing the two
 * wrappers on one tool is disallowed.
 *
 * On ALLOW this helper captures `outcome: "success"` when the
 * policy lets the tool run, not when `execute` finishes.
 * `beforeToolCall` cannot wrap the tool; a later tool throw does
 * not flip that capture.
 *
 * There is no `guardTool`. Skip is the hook return, not
 * throw-from-execute. There is no `guardInbound` and no
 * `guardApproval`.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardHooks } from "@arcjet/guard/cloudflare-think/v0";
 * import { Think } from "@cloudflare/think";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * const hooks = guardHooks(arcjet, {
 *   action: ({ toolName }) => `${toolName}.invoked`,
 *   rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *   sessionId: conversationId,
 * });
 *
 * export class SupportAgent extends Think<Env> {
 *   beforeToolCall(ctx) {
 *     return hooks.beforeToolCall(ctx);
 *   }
 * }
 * ```
 */
export function guardHooks(
  client: ArcjetAgentClient,
  policy: GuardHooksPolicy = {},
): CloudflareThinkGuardHooks {
  const beforeToolCall = async (ctx: ToolCallContext): Promise<ToolCallDecision | void> => {
    try {
      if (!isToolCallContext(ctx)) {
        return undefined;
      }
      return await gateToolCall(client, policy, ctx);
    } catch (error) {
      if (shouldWarn()) {
        console.warn(
          "@arcjet/guard: beforeToolCall for a Cloudflare Think tool threw; treating as a guard error:",
          error,
        );
      }
      if (policy.onGuardError === "allow") {
        return undefined;
      }
      return denyDecision(policy, unavailableResult(), "unavailable");
    }
  };

  return { beforeToolCall };
}
