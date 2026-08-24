import type { AgentMiddleware, WrapToolCallHook } from "langchain";

import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { langchainContext } from "./context.ts";
import type { LangChainContextSource } from "./context.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on
 * `guardMiddleware`. `input` is the tool's free-text args, not the
 * opaque `toolCall.id`.
 */
export interface GuardMiddlewareCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardMiddleware()` — how to guard tools that execute
 * through `createAgent({ middleware })`, including MCP tools,
 * runtime-discovered tools, and anything not wrapped with `guardTool`.
 *
 * `humanInTheLoopMiddleware` / `interrupt()` is HITL, not a policy
 * gate — this helper never calls `interrupt()` and never installs an
 * `afterModel` hook.
 */
export interface GuardMiddlewarePolicy {
  /**
   * Guard label and capture action. Defaults to `"tool.invoked"`. May be a
   * function of the tool name and args.
   */
  action?: string | ((call: GuardMiddlewareCall) => string);
  /**
   * Rules to evaluate before an unwrapped tool runs. Omitting this still
   * performs the guard call.
   */
  rules?: RuleWithInput[] | ((call: GuardMiddlewareCall) => RuleWithInput[]);
  /** Metadata merged over the derived LangChain context. */
  metadata?: ArcjetMetadata | ((call: GuardMiddlewareCall) => ArcjetMetadata);
  /**
   * Fallback session id when `runtime.configurable.thread_id` is absent.
   * Prefer putting the id you already chose on
   * `agent.invoke(..., { configurable: { thread_id } })`. Never mint a
   * new id here.
   */
  sessionId?: string | ((call: GuardMiddlewareCall) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload JSON-stringified onto the completed
   * `ToolMessage.content` for a real DENY decision. Unavailable guards
   * take the `onUnavailable` path instead.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

/**
 * The `createMiddleware`-shaped result this helper returns.
 *
 * This is LangChain's `AgentMiddleware` (via `import type` only — this
 * module never value-imports `createMiddleware`). `createAgent({
 * middleware })` accepts it with no cast.
 */
export type LangChainGuardMiddleware = AgentMiddleware & {
  wrapToolCall: NonNullable<AgentMiddleware["wrapToolCall"]>;
};

/**
 * Well-known brand `createMiddleware` stamps on every instance. A raw
 * function is not middleware; this symbol is what keeps a `{ name }`
 * object from being mistaken for one.
 */
const MIDDLEWARE_BRAND: symbol = Symbol.for("AgentMiddleware");

/**
 * Fields wrapToolCall's official auth example puts on a deny
 * `ToolMessage`. `status` is omitted so it stays success — the denial
 * lives in `content`.
 */
interface DenialToolMessageFields {
  content: string;
  tool_call_id: string;
  name?: string;
}

type ToolMessageCtor = new (fields: DenialToolMessageFields) => unknown;

let toolMessageCtor: ToolMessageCtor | undefined;

/**
 * wrapToolCall's return is NOT passed through `baseHandler`. A bare
 * object is the reducer-crash case. Construct a real `ToolMessage`
 * from `@langchain/core/messages`.
 *
 * This is a dynamic import on purpose: a static value import would
 * make the namespace unloadable when the optional peer is absent.
 * Construction only runs on a deny / fail-closed path, which is
 * only reachable in an app that already installed `langchain`.
 */
async function loadToolMessage(): Promise<ToolMessageCtor> {
  if (toolMessageCtor !== undefined) {
    return toolMessageCtor;
  }
  const messages = await import("@langchain/core/messages");
  const ctor: unknown = messages.ToolMessage;
  if (typeof ctor !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error(
      "@arcjet/guard: guardMiddleware() could not load ToolMessage from @langchain/core/messages; wrapToolCall cannot return a completed denial.",
    );
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ToolMessage is the class createAgent's wrapToolCall validator accepts
  toolMessageCtor = ctor as ToolMessageCtor;
  return toolMessageCtor;
}

async function denialToolMessage(
  request: { toolCall: { id?: string; name: string } },
  payload: unknown,
): Promise<unknown> {
  const ToolMessage = await loadToolMessage();
  const fields: DenialToolMessageFields = {
    content: JSON.stringify(payload),
    tool_call_id: typeof request.toolCall.id === "string" ? request.toolCall.id : "",
  };
  if (request.toolCall.name.length > 0) {
    fields.name = request.toolCall.name;
  }
  return new ToolMessage(fields);
}

function isContextSource(value: unknown): value is LangChainContextSource {
  return value !== null && typeof value === "object";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isToolCallRequest(value: unknown): value is {
  toolCall: { name: string; args?: unknown; id?: string };
  tool?: object;
  runtime?: unknown;
} {
  if (!isRecord(value) || !isRecord(value["toolCall"])) {
    return false;
  }
  return typeof value["toolCall"]["name"] === "string";
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

function isBrandedTool(tool: unknown): boolean {
  return tool !== null && typeof tool === "object" && arcjetProtectedTool in tool;
}

let middlewareSeq = 0;

/**
 * A registry key, not a secret: `createAgent` composes middleware by
 * name in error messages, and two distinct instances sharing one
 * would be indistinguishable in those logs. The counter alone is not
 * enough because a second copy of this module starts counting at one
 * again.
 */
function middlewareName(): string {
  middlewareSeq += 1;
  return `arcjet-guard-${middlewareSeq}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * A `createAgent({ middleware })` middleware whose `wrapToolCall` is
 * the invoke()-wide gate.
 *
 * MCP tools, runtime-discovered tools, and anything not wrapped with
 * `guardTool` skip the authored handler. This is the Genkit
 * `guardMiddleware` / LangGraph `guardToolNode` equivalent. Put it on
 * `createAgent({ middleware: [guardMiddleware(...)] })`.
 *
 * `wrapToolCall` *can* deny: LangChain's official auth example returns
 * a `ToolMessage` without calling `handler`. This helper does that.
 * The return is validated with `ToolMessage.isInstance` and is **not**
 * passed through `baseHandler`, so a bare object is the
 * messages-reducer crash. This helper does **not** throw (throws
 * bubble and drop `arcjetDenied`) and does **not** set
 * `status: "error"` (the denial lives in `content`). Policy sits on
 * `wrapToolCall` only — `afterModel` is where HITL already lives.
 *
 * Already-branded tools (`guardTool`) are skipped when
 * `request.tool` can be looked up, so Guard is not double-called.
 * Tools that cannot be looked up (`request.tool` undefined — MCP /
 * unwrapped / runtime-discovered) are still gated.
 *
 * Correlation is read from `request.runtime.configurable.thread_id`
 * (langchain >= 1.2.34). No id is minted.
 *
 * Server-side provider tools and headless `.implement()` tools are
 * out of scope.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardMiddleware } from "@arcjet/guard/langchain/v1";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * const agent = createAgent({
 *   model,
 *   tools: [lookupOrder, ...mcpTools],
 *   middleware: [
 *     guardMiddleware(arcjet, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *       sessionId: conversationId,
 *     }),
 *   ],
 * });
 * ```
 */
export function guardMiddleware(
  client: ArcjetAgentClient,
  policy: GuardMiddlewarePolicy = {},
): LangChainGuardMiddleware {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- body is structural; the hook type is what createAgent assigns without a cast
  const wrapToolCall = ((request: unknown, handler: (request: unknown) => Promise<unknown>) => {
    if (!isToolCallRequest(request)) {
      return handler(request);
    }

    if (isBrandedTool(request.tool)) {
      return handler(request);
    }

    const toolName = request.toolCall.name;
    const input = request.toolCall.args ?? {};
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
        return handler(request);
      }
      return denialToolMessage(request, unavailableResult());
    }

    const source = isContextSource(request.runtime) ? request.runtime : undefined;
    const agentCtx = langchainContext(source, sessionId === undefined ? undefined : { sessionId });

    const metadata: ArcjetMetadata = {
      ...agentCtx.metadata,
      ...(toolName.length > 0 && { "langchain.tool": toolName }),
    };
    const mergedMetadata = { ...metadata, ...policyMetadata };

    return runGuarded<unknown>(client, {
      action,
      rules,
      correlationId: agentCtx.correlationId,
      metadata: mergedMetadata,
      onDeny: (decision: DecisionDeny) => {
        if (policy.onDeny === undefined) {
          return denialToolMessage(request, denialResult(decision));
        }
        try {
          return denialToolMessage(request, policy.onDeny(decision));
        } catch (error) {
          if (shouldWarn()) {
            console.warn(
              '@arcjet/guard: onDeny for "%s" threw; returning the default denial:',
              action,
              error,
            );
          }
          return denialToolMessage(request, denialResult(decision));
        }
      },
      onUnavailable: () => denialToolMessage(request, unavailableResult()),
      execute: () => handler(request),
      onGuardError: policy.onGuardError ?? "deny",
    });
  }) as WrapToolCallHook;

  const middleware: LangChainGuardMiddleware = {
    name: middlewareName(),
    wrapToolCall,
  };

  Object.defineProperty(middleware, MIDDLEWARE_BRAND, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  return middleware;
}
