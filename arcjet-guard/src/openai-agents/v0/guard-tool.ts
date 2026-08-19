import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { openaiAgentsContext } from "./context.ts";
import type { OpenAIAgentsContextSource } from "./context.ts";
import { denialResult, unavailableResult } from "./denial.ts";

/**
 * Structural `tool()` / `FunctionTool`. Declared here so `guardTool` does
 * not value-import `@openai/agents`.
 *
 * After `tool({ execute })` the authored `execute` is closed over inside
 * `invoke`. The runner (`toolExecution.ts`) calls `invoke(runContext,
 * argumentsJson, details)` — there is no `execute` on the returned object
 * and no ToolNode. `invoke` is declared with method syntax so a real
 * `FunctionTool` (whose `invoke` is a property typed against `RunContext`)
 * is assignable under `strictFunctionTypes`.
 */
export interface OpenAIAgentsTool {
  name: string;
  description?: string;
  type?: string;
  invoke(runContext: unknown, input: string, details?: unknown): unknown;
}

/**
 * Policy for `guardTool()` — how to guard an authored `tool({ execute })`.
 *
 * Specifies the guard action name, optional rules to evaluate, metadata
 * context, and optional denial handler. Rules can be static or computed
 * from the tool's parsed free-text args. Do not scan opaque call ids.
 */
export interface GuardToolPolicy<TInput> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /**
   * Rules to evaluate, static or computed from the tool's parsed args.
   * Omitting this, or returning `[]`, submits no rules — it does not skip
   * the guard call, which still costs a round trip and returns a decision.
   */
  rules?: RuleWithInput[] | ((input: TInput) => RuleWithInput[]);
  /** Metadata merged over the context's (object, or per-call function of the tool input). */
  metadata?: ArcjetMetadata | ((input: TInput) => ArcjetMetadata);
  /**
   * Fallback session id when `runContext.context` does not carry one.
   * Prefer putting the id you already chose on `run(..., { context })`.
   * Never mint a new id here. Never pass `session.getSessionId()` as a
   * factory that would run against a MemorySession constructed without
   * `sessionId` — that class mints a UUID.
   */
  sessionId?: string | ((input: TInput) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload the model sees for a real DENY decision.
   * The value is returned from `invoke` as-is, which is what `execute`
   * already does; the runner stringifies it onto a `function_call_result`.
   * Unavailable guards take the `onUnavailable` path instead and return
   * the fixed `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }`
   * result; this callback does not fire for outages.
   *
   * **Warning:** A tool created with `outputSchema` validates `execute`'s
   * return. That validation lives inside the `invoke` this wrapper replaces,
   * so a denial is not schema-checked. Prefer omitting `outputSchema` on
   * guarded tools, or verify the schema accepts `ArcjetDenialResult` / your
   * `onDeny` shape.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

function isContextSource(value: unknown): value is OpenAIAgentsContextSource {
  return value !== null && typeof value === "object";
}

/**
 * The model-produced arguments. The runner invokes with
 * `toolCall.arguments` (a JSON string). Scan the parsed args, not
 * `details.toolCall.callId`.
 *
 * Every tool from `tool()` has an object parameter schema — `tool()` rejects
 * `parameters: undefined` at construction even though the type admits it — so
 * a parse failure means malformed model output, not a free-text tool whose
 * arguments were dropped. Rules see `{}` for it, and the original `invoke`
 * then raises the SDK's own invalid-input failure.
 */
function toolArgs(input: unknown): unknown {
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      return {};
    }
  }
  if (input !== null && typeof input === "object") {
    return input;
  }
  return {};
}

function resolveSessionId<TInput>(
  policy: GuardToolPolicy<TInput>,
  input: TInput,
): string | undefined {
  if (typeof policy.sessionId === "function") {
    return policy.sessionId(input);
  }
  if (typeof policy.sessionId === "string" && policy.sessionId.length > 0) {
    return policy.sessionId;
  }
  return undefined;
}

/**
 * Wraps a `tool()` / `FunctionTool` so the closed-over `execute` never
 * runs on DENY.
 *
 * After `tool({ execute })` the runner calls `invoke`, not `execute`.
 * This helper replaces `invoke` (via `Object.defineProperty`, so a
 * non-writable descriptor still gets the wrap) and always runs `guard()`
 * before the original `invoke`. On DENY the original `invoke` — and
 * therefore `execute` — never runs. The model receives an
 * `ArcjetDenialResult` (or the result of `policy.onDeny`). This helper
 * does not throw on DENY: a throw would hit the SDK `errorFunction`
 * (generic string, or `ToolCallError` when `outputSchema` /
 * `errorFunction: null`).
 *
 * Guard API errors depend on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): `execute` does not run; the model receives an
 *   `ArcjetDenialResult` with `reason: "ERROR"`.
 * - `"allow"`: `execute` still runs, with a warning gated on
 *   `ARCJET_LOG_LEVEL`.
 *
 * Correlation is read from `runContext.context` (and documented copies
 * on the envelope). No id is minted. `session.getSessionId()` is never
 * called.
 *
 * The runner treats whatever this returns as the tool's output, so two
 * per-tool options see a denial as they would any other result: a
 * `timeoutMs` race covers the guard round trip as well as `execute`, and
 * `outputGuardrails` / `customDataExtractor` receive the denial object.
 * Keep `timeoutMs` wide enough for a guard call, and do not assume your own
 * output shape in those callbacks.
 *
 * Hosted tools, MCP (`mcpToFunctionTool`), handoffs, `agent.asTool()`,
 * and computer / shell / apply_patch are not on this path. Do not also
 * wrap the same tool with `@arcjet/guard/vercel-ai/v7`. The shared
 * `arcjetProtectedTool` brand throws on a second `guardTool` wrap.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/openai-agents/v0";
 * import { tool } from "@openai/agents";
 * import { z } from "zod";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const lookupLimit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * export const lookupOrder = guardTool(
 *   arcjet,
 *   tool({
 *     name: "lookup_order",
 *     description: "Look up an order by number",
 *     parameters: z.object({ orderNumber: z.string() }),
 *     execute: async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *   }),
 *   {
 *     action: "order.looked-up",
 *     rules: (input: { orderNumber: string }) => [
 *       lookupLimit({ key: input.orderNumber, requested: 1 }),
 *     ],
 *   },
 * );
 * ```
 */
export function guardTool<TInput = unknown, TTool extends OpenAIAgentsTool = OpenAIAgentsTool>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardToolPolicy<TInput>,
): TTool {
  // oxlint-disable-next-line typescript/unbound-method -- read to be bound to `tool` immediately below, which is the point
  if (typeof tool.invoke !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error(
      "@arcjet/guard: guardTool() requires a FunctionTool from tool() (invoke). Pass the result of tool({ execute }), not the options object.",
    );
  }
  if (arcjetProtectedTool in tool) {
    throw new Error(
      "@arcjet/guard: guardTool() cannot wrap a tool that is already guarded; do not double-wrap with @arcjet/guard/openai-agents/v0 or @arcjet/guard/vercel-ai/v7",
    );
  }

  const originalInvoke = tool.invoke.bind(tool);

  // Preserve own descriptors (needsApproval, inputGuardrails, …). Those
  // surfaces are not policy gates and are copied, not wrapped.
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
  const proto = Object.getPrototypeOf(tool) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(tool),
  ) as TTool;

  const newInvoke = (runContext: unknown, input: string, details?: unknown): Promise<unknown> =>
    runGuardedTool(client, tool, policy, runContext, input, () =>
      Promise.resolve(originalInvoke(runContext, input, details)),
    );

  Object.defineProperty(wrapped, "invoke", {
    value: newInvoke,
    writable: true,
    enumerable: true,
    configurable: true,
  });

  Object.defineProperty(wrapped, arcjetProtectedTool, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  return wrapped;
}

function runGuardedTool<TInput>(
  client: ArcjetAgentClient,
  tool: OpenAIAgentsTool,
  policy: GuardToolPolicy<TInput>,
  runContext: unknown,
  input: unknown,
  execute: () => Promise<unknown>,
): Promise<unknown> {
  const args = toolArgs(input);

  let sessionId: string | undefined;
  let rules: RuleWithInput[] | undefined;
  let policyMetadata: ArcjetMetadata | undefined;
  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- args are the tool's parsed input; policy factories are typed against it
    const typedArgs = args as TInput;
    sessionId = resolveSessionId(policy, typedArgs);
    rules = typeof policy.rules === "function" ? policy.rules(typedArgs) : policy.rules;
    policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(typedArgs) : policy.metadata;
  } catch (error) {
    if (shouldWarn()) {
      console.warn(
        '@arcjet/guard: policy factory for "%s" threw; treating as a guard error:',
        policy.action,
        error,
      );
    }
    if (policy.onGuardError === "allow") {
      return execute();
    }
    return Promise.resolve(unavailableResult());
  }

  const source = isContextSource(runContext) ? runContext : undefined;
  const agentCtx = openaiAgentsContext(source, sessionId === undefined ? undefined : { sessionId });

  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(typeof tool.name === "string" &&
      tool.name.length > 0 && {
        "openai-agents.tool": tool.name,
      }),
  };
  const mergedMetadata = { ...metadata, ...policyMetadata };

  return runGuarded<unknown>(client, {
    action: policy.action,
    rules,
    correlationId: agentCtx.correlationId,
    metadata: mergedMetadata,
    onDeny: (decision: DecisionDeny) => {
      if (policy.onDeny === undefined) {
        return denialResult(decision);
      }
      try {
        return policy.onDeny(decision);
      } catch (error) {
        if (shouldWarn()) {
          console.warn(
            '@arcjet/guard: onDeny for "%s" threw; returning the default denial:',
            policy.action,
            error,
          );
        }
        return denialResult(decision);
      }
    },
    onUnavailable: () => unavailableResult(),
    execute,
    onGuardError: policy.onGuardError ?? "deny",
  });
}
