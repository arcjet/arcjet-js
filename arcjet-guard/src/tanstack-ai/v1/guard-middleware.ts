import type { ChatMiddleware, ChatMiddlewareContext } from "@tanstack/ai";

import type { ActorResolver, InputsResolver } from "../../agents/actor-inputs.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import type { ArcjetMetadata, RuleWithInput } from "../../types.ts";
import { createToolCallGate, middlewareName } from "../v0/guard-middleware.ts";
import { tanstackAiContext } from "./context.ts";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
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
  const onGuardToolCall = createToolCallGate(client, policy, {
    hook: "onGuardToolCall",
    context: tanstackAiContext,
  });

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
