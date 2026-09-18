import type { ToolCallContext, ToolCallDecision } from "@cloudflare/think";

import { resolveActorInputs } from "../../agents/actor-inputs.ts";
import type { ActorResolver, InputsResolver } from "../../agents/actor-inputs.ts";
import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { assertValidAction } from "../../agents/label.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { cloudflareThinkContext } from "./context.ts";

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
 * through Think's class `beforeToolCall`.
 *
 * `needsApproval` is HITL, not a policy gate — this helper never
 * installs approval hooks. After a human yes, Guard still runs on
 * the tool call.
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
  /**
   * Trusted actor identity, or a resolver `(call, ctx) => …` matching
   * `beforeToolCall(ctx)`. Derive it from authenticated server-side
   * context; never trust a model-produced tool input as the actor
   * identity.
   */
  actor?: ActorResolver<[GuardHooksCall, ToolCallContext]>;
  /**
   * Typed remote-policy inputs, or a resolver `(call, ctx) => …`. Build
   * each value with {@link policyInput}.
   */
  inputs?: InputsResolver<[GuardHooksCall, ToolCallContext]>;
  /** Metadata merged over the derived Cloudflare Think context. */
  metadata?: ArcjetMetadata | ((call: GuardHooksCall) => ArcjetMetadata);
  /**
   * Fallback session id when the Think tool-call context does not
   * carry one — it never does. Prefer putting the id you already
   * chose on `guardHooks({ sessionId })`. Never mint a new id here.
   */
  sessionId?: string | ((call: GuardHooksCall) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * How to deliver a real DENY decision. Default substitute
   * (`{ action: "substitute", output: ArcjetDenialResult }`) so the
   * tool never runs and the model sees the payload. `"block"` returns
   * `{ action: "block", reason }` and skips the tool. No other modes.
   */
  onDeny?: "block";
}

/**
 * The Think lifecycle object this helper returns.
 *
 * This is Think's `beforeToolCall` hook (via `import type` only —
 * this module never value-imports `@cloudflare/think`). Assign
 * `hooks.beforeToolCall` on a `Think` subclass with no cast.
 */
export type CloudflareThinkGuardHooks = {
  beforeToolCall: (ctx: ToolCallContext) => Promise<ToolCallDecision | void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isToolCallContext(value: unknown): value is ToolCallContext {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value["toolName"] === "string";
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

/**
 * Same filter as `validMetadataString` on session/conversation: drop
 * empty or non-printable names so `cloudflare-think.tool` matches
 * how the other derived keys are handled.
 */
function metadataToolName(toolName: string): string | undefined {
  return correlationIdProblem(toolName) === undefined ? toolName : undefined;
}

async function gateToolCall(
  client: ArcjetAgentClient,
  policy: GuardHooksPolicy,
  ctx: ToolCallContext,
): Promise<ToolCallDecision | void> {
  const toolName = ctx.toolName;
  // Preserve explicit `null` (a nullable tool schema). Only missing
  // `undefined` is normalized to `{}` for policy callbacks.
  const input: unknown = ctx.input === undefined ? {} : ctx.input;
  const call: GuardHooksCall = { toolName, input };

  let action: string;
  let sessionId: string | undefined;
  let rules: RuleWithInput[] | undefined;
  let policyMetadata: ArcjetMetadata | undefined;
  let remote: Awaited<ReturnType<typeof resolveActorInputs>> = {};
  try {
    action = resolveAction(policy, call);
    sessionId = resolveSessionId(policy, call);
    rules = typeof policy.rules === "function" ? policy.rules(call) : policy.rules;
    policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(call) : policy.metadata;
    remote = await resolveActorInputs(policy, call, ctx);
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
      return undefined;
    }
    return denyDecision(policy, unavailableResult(), "unavailable");
  }

  // Think's ToolCallContext is an envelope, not a caller-owned bag.
  // Correlation comes only from `policy.sessionId` via init.
  const agentCtx = cloudflareThinkContext(
    undefined,
    sessionId === undefined ? undefined : { sessionId },
  );

  const tool = metadataToolName(toolName);
  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(tool !== undefined && { "cloudflare-think.tool": tool }),
  };
  const mergedMetadata = { ...metadata, ...policyMetadata };

  return runGuarded<ToolCallDecision | void>(client, {
    action,
    rules,
    correlationId: agentCtx.correlationId,
    metadata: mergedMetadata,
    ...remote,
    onDeny: (decision: DecisionDeny) => denyDecision(policy, denialResult(decision), "deny"),
    onUnavailable: () => denyDecision(policy, unavailableResult(), "unavailable"),
    execute: () => Promise.resolve(),
    onGuardError: policy.onGuardError ?? "deny",
  });
}

/**
 * A Think `beforeToolCall` hook object that is the tool-call gate.
 *
 * Assign `hooks.beforeToolCall` on a `Think` subclass. Think wraps
 * every server-side tool's `execute` so this hook runs first. Client
 * tools are out of scope — Think cannot intercept them.
 *
 * Default DENY is `{ action: "substitute", output: ArcjetDenialResult }`
 * so the tool never runs and the model sees the payload. Optional
 * `onDeny: "block"` returns `{ action: "block", reason }` (the denial
 * `message` string) and skips the tool — the model does not get
 * `ArcjetDenialResult`. Block does **not** hand the model
 * `ArcjetDenialResult` — prefer default substitute when it should.
 * `onDeny: "block"` applies to real DENY only; unavailable stays
 * substitute. This helper does **not** throw from the hook (a throw
 * from Think's `beforeToolCall` is a hook error, not a policy denial).
 *
 * On ALLOW this helper captures `outcome: "success"` when the
 * policy lets the tool run, not when `execute` finishes.
 * `beforeToolCall` cannot wrap the tool; a later tool throw does
 * not flip that capture.
 *
 * There is no `guardTool`. There is no `afterToolCall` capture
 * hook — `beforeToolCall` is the gate. Do not mix with
 * `@arcjet/guard/vercel-ai/v7`. Think is not the Vercel AI SDK.
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
 *   override beforeToolCall = hooks.beforeToolCall;
 * }
 * ```
 */
export function guardHooks(
  client: ArcjetAgentClient,
  policy: GuardHooksPolicy = {},
): CloudflareThinkGuardHooks {
  // An empty action means "unset" here and falls back to the default.
  if (typeof policy.action === "string" && policy.action !== "") {
    assertValidAction(policy.action, "guardHooks");
  }
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
