import type {
  ChatMiddleware,
  ChatMiddlewareContext,
  GuardToolCallDecision,
  ToolCallHookContext,
} from "@tanstack/ai";

import { resolveActorInputs, resolveCallPolicy } from "../../agents/actor-inputs.ts";
import type { ActorResolver, InputsResolver } from "../../agents/actor-inputs.ts";
import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import { assertValidAction } from "../../agents/label.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { tanstackAiContext } from "./context.ts";
import type { TanStackAiContextSource } from "./context.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on
 * `guardMiddleware`. `input` is the tool's checked args — the value the
 * tool runs with — not the opaque `toolCallId`.
 */
export interface GuardMiddlewareCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardMiddleware()` — how to guard tools that run through
 * `chat({ middleware })` via `ChatMiddleware.onGuardToolCall`.
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
  /**
   * Trusted actor identity, or a resolver `(call, ctx) => …` matching
   * `onGuardToolCall(ctx, hookCtx)`. Derive it from `chat({ context })`;
   * never trust a model-produced tool input as the actor identity.
   */
  actor?: ActorResolver<[GuardMiddlewareCall, ChatMiddlewareContext]>;
  /**
   * Typed remote-policy inputs, or a resolver `(call, ctx) => …`. Build each
   * value with {@link policyInput}.
   */
  inputs?: InputsResolver<[GuardMiddlewareCall, ChatMiddlewareContext]>;
  /** Metadata merged over the derived TanStack AI context. */
  metadata?: ArcjetMetadata | ((call: GuardMiddlewareCall) => ArcjetMetadata);
  /**
   * Fallback session id when `chat({ context })` does not carry one. It
   * wins over `chat({ threadId })`. Prefer putting the id you already
   * chose on `chat({ context: { sessionId } })`. Never mint a new id
   * here.
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
  onStart: NonNullable<ChatMiddleware["onStart"]>;
  onGuardToolCall: NonNullable<ChatMiddleware["onGuardToolCall"]>;
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

/**
 * TanStack AI 0.x never calls `onGuardToolCall`, so on a 0.x host this
 * middleware would let every tool run ungated. `retry` is a required
 * `ChatMiddlewareContext` field from 1.0 on, and 0.x does not have it.
 */
function isTanStackAi1Context(ctx: unknown): boolean {
  return isRecord(ctx) && typeof ctx["retry"] === "function";
}

const WRONG_HOST_MESSAGE =
  "@arcjet/guard/tanstack-ai/v1 needs @tanstack/ai 1.x, but this chat() run has no 1.x middleware context. TanStack AI 0.x never calls onGuardToolCall, so tools would run without Guard. Use @arcjet/guard/tanstack-ai/v0 with @tanstack/ai 0.x.";

function isBrandedTool(tool: unknown): boolean {
  return tool !== null && typeof tool === "object" && arcjetProtectedTool in tool;
}

/**
 * The label for a static or absent `action`, and the label used when an
 * `action` callback fails.
 */
function fallbackAction(policy: GuardMiddlewarePolicy): string {
  return typeof policy.action === "string" && policy.action.length > 0
    ? policy.action
    : "tool.invoked";
}

function denyDecision(
  policy: GuardMiddlewarePolicy,
  payload: { message: string },
  kind: "deny" | "unavailable",
): GuardToolCallDecision {
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

async function gateToolCall(
  client: ArcjetAgentClient,
  policy: GuardMiddlewarePolicy,
  ctx: ChatMiddlewareContext,
  hookCtx: ToolCallHookContext,
): Promise<GuardToolCallDecision> {
  if (isBrandedTool(hookCtx.tool)) {
    return undefined;
  }

  const toolName = hookCtx.toolName;
  const input = hookCtx.args ?? {};
  const call: GuardMiddlewareCall = { toolName, input };

  const resolved = resolveCallPolicy(policy, call, fallbackAction(policy));
  const { action, sessionId, rules, metadata: policyMetadata } = resolved;
  const remote = await resolveActorInputs(policy, action, call, ctx);

  const source = isContextSource(ctx) ? ctx : undefined;
  const agentCtx = tanstackAiContext(source, sessionId === undefined ? undefined : { sessionId });

  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(toolName.length > 0 && { "tanstack-ai.tool": toolName }),
  };
  const mergedMetadata = { ...metadata, ...policyMetadata };

  return runGuarded<GuardToolCallDecision>(client, {
    action,
    rules,
    correlationId: agentCtx.correlationId,
    metadata: mergedMetadata,
    degraded: resolved.degraded ?? remote.degraded,
    ...remote.fields,
    onDeny: (decision: DecisionDeny) => denyDecision(policy, denialResult(decision), "deny"),
    onUnavailable: () => denyDecision(policy, unavailableResult(), "unavailable"),
    execute: () => Promise.resolve(),
    onGuardError: policy.onGuardError ?? "deny",
  });
}

/**
 * A `chat({ middleware })` middleware whose `onGuardToolCall` is the
 * tool-call gate.
 *
 * `onGuardToolCall` is TanStack AI's guard tier. It runs for every tool
 * call after all `onBeforeToolCall` hooks and after the tool's
 * `inputSchema` check, so Guard sees the args the tool runs with. A
 * `transformArgs` from another middleware cannot change them after
 * Guard allows the call, and an `onBeforeToolCall` decision does not
 * skip Guard. The middleware array order does not matter for the
 * `onBeforeToolCall` tier. Among `onGuardToolCall` hooks the first
 * decision wins, so a guard placed earlier that denies stops the call
 * before Arcjet runs.
 *
 * An `onBeforeToolCall` skip — for example a `toolCacheMiddleware` hit
 * — answers the call without running the tool, and then no guard runs
 * for that call. Put a cache only on tools whose cached result is safe
 * to return without a Guard decision.
 *
 * Default DENY is `{ type: "skip", result: ArcjetDenialResult }` so
 * the tool never runs and the model sees the payload. Optional
 * `onDeny: "abort"` returns `{ type: "abort", reason }` (the denial
 * `message` string) and stops the chat run. Abort does **not** hand
 * the model `ArcjetDenialResult` — prefer default skip when it
 * should. `onDeny: "abort"` applies to real DENY only; unavailable
 * stays skip. This helper does **not** throw from the hook (a throw
 * from this hook would end the run as an error rather than a policy
 * denial).
 *
 * TanStack AI calls the guard tier before it sends a client tool to
 * the client, so tools with no local `execute` are gated as well.
 * Provider-native tools that the provider runs are out of scope. The
 * guard tier is not called while a call waits for approval.
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
 * `onGuardToolCall` cannot wrap the tool; a later tool throw does
 * not flip that capture.
 *
 * Requires TanStack AI 1.x. The `@tanstack/ai` peer range also admits
 * 0.x (for `@arcjet/guard/tanstack-ai/v0`), and 0.x never calls
 * `onGuardToolCall`. So the middleware also installs `onStart`: when
 * the run's context is not a 1.x context it warns and aborts the run
 * (or, with `onGuardError: "allow"`, only warns).
 *
 * Do not double-wrap with `@arcjet/guard/vercel-ai/v7`. TanStack AI
 * is not the Vercel AI SDK.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardMiddleware } from "@arcjet/guard/tanstack-ai/v1";
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
 *   threadId,
 *   tools: [lookupOrder, ...mcpTools],
 *   context: { sessionId: conversationId },
 *   middleware: [
 *     guardMiddleware(arcjet, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *     }),
 *   ],
 * });
 * ```
 */
export function guardMiddleware(
  client: ArcjetAgentClient,
  policy: GuardMiddlewarePolicy = {},
): TanStackAiGuardMiddleware {
  // An empty action means "unset" here and falls back to the default.
  if (typeof policy.action === "string" && policy.action !== "") {
    assertValidAction(policy.action, "guardMiddleware");
  }
  const onGuardToolCall = async (
    ctx: ChatMiddlewareContext,
    hookCtx: ToolCallHookContext,
  ): Promise<GuardToolCallDecision> => {
    try {
      if (!isToolCallHookContext(hookCtx)) {
        return undefined;
      }
      return await gateToolCall(client, policy, ctx, hookCtx);
    } catch (error) {
      if (shouldWarn()) {
        console.warn(
          "@arcjet/guard: onGuardToolCall for a TanStack AI tool threw; treating as a guard error:",
          error,
        );
      }
      if (policy.onGuardError === "allow") {
        return undefined;
      }
      return denyDecision(policy, unavailableResult(), "unavailable");
    }
  };

  const onStart = (ctx: ChatMiddlewareContext): void => {
    if (isTanStackAi1Context(ctx)) {
      return;
    }
    // Not gated on ARCJET_LOG_LEVEL: without it a wrong install is silent.
    console.warn(`@arcjet/guard: ${WRONG_HOST_MESSAGE}`);
    if (policy.onGuardError === "allow") {
      return;
    }
    if (isRecord(ctx) && typeof ctx["abort"] === "function") {
      ctx.abort(WRONG_HOST_MESSAGE);
    }
  };

  return {
    name: middlewareName(),
    onStart,
    onGuardToolCall,
  };
}
