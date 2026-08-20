import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { genkitContext } from "./context.ts";
import type { GenkitContextSource } from "./context.ts";

/**
 * Input passed to `rules` / `metadata` / `action` callbacks on
 * `guardMiddleware`. `input` is the tool's free-text args, not the
 * opaque `toolRequest.ref`.
 */
export interface GuardMiddlewareCall {
  toolName: string;
  input: unknown;
}

/**
 * Policy for `guardMiddleware()` — how to guard tools that execute
 * through `ai.generate({ use })`, including filesystem middleware
 * tools, MCP tools, and anything not wrapped with `guardTool`.
 *
 * `interrupt()` / `defineInterrupt` / `toolApproval` is HITL, not a
 * policy gate — this helper never throws `ToolInterruptError`.
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
  /** Metadata merged over the derived Genkit context. */
  metadata?: ArcjetMetadata | ((call: GuardMiddlewareCall) => ArcjetMetadata);
  /**
   * Fallback session id when the tool-hook `ctx.context` does not carry
   * one. Prefer putting the id you already chose on
   * `ai.generate({ context: { sessionId } })` *and* here when the hook
   * does not receive ALS context. Never mint a new id here.
   */
  sessionId?: string | ((call: GuardMiddlewareCall) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload the model sees for a real DENY decision.
   * Unavailable guards take the `onUnavailable` path instead.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

/**
 * Structural `generate({ use })` middleware this helper returns.
 *
 * Matches Genkit's `normalizeMiddleware` object+`instantiate` branch
 * (not a raw function — those become *model* hooks only, which cannot
 * deny a tool). Declared here so this module never value-imports
 * `generateMiddleware`.
 */
export interface GenkitGuardMiddleware {
  name: string;
  instantiate: (options?: unknown) => {
    tool: (
      req: unknown,
      ctx: unknown,
      next: (req: unknown, ctx: unknown) => Promise<unknown>,
    ) => Promise<unknown>;
  };
}

function isContextSource(value: unknown): value is GenkitContextSource {
  return value !== null && typeof value === "object";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function isToolRequestPart(
  value: unknown,
): value is { toolRequest: { name: string; ref?: string; input?: unknown } } {
  if (!isRecord(value) || !isRecord(value["toolRequest"])) {
    return false;
  }
  return typeof value["toolRequest"]["name"] === "string";
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

function resolveSessionId(policy: GuardMiddlewarePolicy, call: GuardMiddlewareCall): string | undefined {
  if (typeof policy.sessionId === "function") {
    return policy.sessionId(call);
  }
  if (typeof policy.sessionId === "string" && policy.sessionId.length > 0) {
    return policy.sessionId;
  }
  return undefined;
}

/**
 * Best-effort lookup of a registered tool so already-branded
 * (`guardTool`) actions can skip a second guard call. Uses the `ai`
 * instance Genkit passes to `instantiate` — no value import of `genkit`.
 */
function isRegisteredTool(value: unknown): value is object {
  return typeof value === "function" || (typeof value === "object" && value !== null);
}

async function lookupRegisteredTool(ai: unknown, name: string): Promise<object | undefined> {
  if (ai === null || typeof ai !== "object") {
    return undefined;
  }
  const registry = "registry" in ai ? (ai as { registry?: unknown }).registry : undefined;
  if (registry === null || typeof registry !== "object") {
    return undefined;
  }
  const lookup = (registry as { lookupAction?: (key: string) => Promise<unknown> }).lookupAction;
  if (typeof lookup !== "function") {
    return undefined;
  }
  const candidates = [name, `/tool/${name}`, `/tool.v2/${name}`];
  for (const key of candidates) {
    try {
      const found = await lookup.call(registry, key);
      // A ToolAction is a function; `typeof === "object"` would miss it
      // and double-call Guard on every branded defineTool.
      if (isRegisteredTool(found)) {
        return found;
      }
    } catch {
      // continue
    }
  }
  return undefined;
}

let middlewareSeq = 0;

/**
 * A `generate({ use })` middleware whose `tool` hook is the
 * generate()-wide gate.
 *
 * Filesystem middleware tools, MCP tools, and anything not wrapped with
 * `guardTool` skip the authored handler. This is the LangGraph
 * `guardToolNode` / Claude `guardHooks` equivalent. Put it on
 * `ai.generate({ use: [guardMiddleware(...)] })`.
 *
 * The `tool` hook *can* deny: Genkit's `resolveToolRequest` treats a
 * `ToolResponsePart` returned without calling `next()` as a completed
 * tool result. This helper does that. It does **not** throw
 * `ToolInterruptError` (that sets `finishReason: "interrupted"` and is
 * HITL — see `@genkit-ai/middleware` `toolApproval`).
 *
 * Already-branded tools (`guardTool`) are skipped when they can be
 * found on the registry, so Guard is not double-called. Tools that
 * cannot be looked up are still gated (the unwrapped / MCP /
 * filesystem case).
 *
 * Correlation is read from the hook `ctx.context` (and documented
 * copies). `generate({ context })` is delivered to authored handlers
 * via ALS and is **not** copied onto the hook `ctx` today — put the
 * same id on `policy.sessionId` when you need tool-time correlation
 * through this hook. No id is minted.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardMiddleware } from "@arcjet/guard/genkit/v1";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const mcpLimit = tokenBucket({
 *   refillRate: 20,
 *   intervalSeconds: 60,
 *   maxTokens: 20,
 * });
 *
 * const response = await ai.generate({
 *   prompt: userText,
 *   tools: [lookupOrder, ...mcpTools],
 *   use: [
 *     guardMiddleware(arcjet, {
 *       action: ({ toolName }) => `${toolName}.invoked`,
 *       rules: ({ toolName }) => [mcpLimit({ key: toolName, requested: 1 })],
 *       sessionId: conversationId,
 *     }),
 *   ],
 *   context: { sessionId: conversationId },
 * });
 * ```
 */
export function guardMiddleware(
  client: ArcjetAgentClient,
  policy: GuardMiddlewarePolicy = {},
): GenkitGuardMiddleware {
  middlewareSeq += 1;
  const name = `arcjet-guard-${middlewareSeq}`;

  return {
    name,
    instantiate: (options?: unknown) => {
      const ai =
        options !== null && typeof options === "object" && "ai" in options
          ? (options as { ai?: unknown }).ai
          : undefined;

      return {
        tool: async (req: unknown, ctx: unknown, next: (req: unknown, ctx: unknown) => Promise<unknown>) => {
          if (!isToolRequestPart(req)) {
            return next(req, ctx);
          }

          const toolName = req.toolRequest.name;
          const input = req.toolRequest.input ?? {};
          const call: GuardMiddlewareCall = { toolName, input };

          const registered = await lookupRegisteredTool(ai, toolName);
          if (registered !== undefined && arcjetProtectedTool in registered) {
            return next(req, ctx);
          }

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
              return next(req, ctx);
            }
            return denialPart(req, unavailableResult());
          }

          const source = isContextSource(ctx) ? ctx : undefined;
          const agentCtx = genkitContext(source, sessionId === undefined ? undefined : { sessionId });

          const metadata: ArcjetMetadata = {
            ...agentCtx.metadata,
            ...(toolName.length > 0 && { "genkit.tool": toolName }),
          };
          const mergedMetadata = { ...metadata, ...policyMetadata };

          return runGuarded<unknown>(client, {
            action,
            rules,
            correlationId: agentCtx.correlationId,
            metadata: mergedMetadata,
            onDeny: (decision: DecisionDeny) => {
              if (policy.onDeny === undefined) {
                return denialPart(req, denialResult(decision));
              }
              try {
                return denialPart(req, policy.onDeny(decision));
              } catch (error) {
                if (shouldWarn()) {
                  console.warn(
                    '@arcjet/guard: onDeny for "%s" threw; returning the default denial:',
                    action,
                    error,
                  );
                }
                return denialPart(req, denialResult(decision));
              }
            },
            onUnavailable: () => denialPart(req, unavailableResult()),
            execute: () => next(req, ctx),
            onGuardError: policy.onGuardError ?? "deny",
          });
        },
      };
    },
  };
}

function denialPart(
  req: { toolRequest: { name: string; ref?: string } },
  output: unknown,
): { toolResponse: { name: string; ref?: string; output: unknown } } {
  const part: { toolResponse: { name: string; ref?: string; output: unknown } } = {
    toolResponse: {
      name: req.toolRequest.name,
      output,
    },
  };
  if (req.toolRequest.ref !== undefined) {
    part.toolResponse.ref = req.toolRequest.ref;
  }
  return part;
}
