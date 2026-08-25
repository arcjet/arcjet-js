import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { denialResult, unavailableResult } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { strandsAgentContext } from "./context.ts";
import type { StrandsContextSource } from "./context.ts";

/**
 * Structural `tool({ callback })` result. Declared here so `guardTool`
 * does not value-import `@strands-agents/sdk`.
 *
 * After `tool({ callback })` the object is a `FunctionTool` or `ZodTool`.
 * Both store the authored `callback` as `_callback`. `ZodTool` also
 * closes a validation wrapper over the same callback inside
 * `_functionTool._callback`, and `stream()` (what the executor calls)
 * delegates there. `invoke()` calls `_callback` directly.
 *
 * `stream` and `invoke` are declared with method syntax so a real
 * `ZodTool` / `FunctionTool` stays assignable under
 * `strictFunctionTypes`.
 */
export interface StrandsTool {
  name?: string;
  description?: string;
  toolSpec?: { name?: string };
  stream?(...args: never[]): unknown;
  invoke?(...args: never[]): unknown;
}

/**
 * Input type of a Strands `tool({ callback })`. Used so `guardTool` can
 * keep the concrete tool type while still typing `policy.rules` against
 * the callback args (not opaque tool-use ids).
 */
export type StrandsToolInput<TTool> = TTool extends {
  invoke?(input: infer TInput, context?: unknown): unknown;
}
  ? TInput
  : unknown;

/**
 * Policy for `guardTool()` — how to guard an authored
 * `tool({ callback })`.
 *
 * Specifies the guard action name, optional rules to evaluate, metadata
 * context, and optional denial handler. Rules can be static or computed
 * from the tool's free-text args. Do not scan opaque `toolUseId`s.
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
   * Fallback session id when `invocationState` does not carry one.
   * Prefer putting the id you already chose on
   * `agent.invoke(..., { invocationState: { sessionId } })`. Never mint
   * a new id here. Never pass `agent.id` or a `SessionManager` id.
   */
  sessionId?: string | ((input: TInput) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload the model sees for a real DENY decision.
   * The value is returned from the authored `callback` as-is, which
   * `FunctionTool.stream()` wraps in a `ToolResultBlock` / `JsonBlock`.
   * This helper does not fabricate an SDK message type. Unavailable
   * guards take the `onUnavailable` path instead and return the fixed
   * `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }` result;
   * this callback does not fire for outages.
   *
   * **Warning:** A tool created with `outputSchema` validates the
   * authored callback's return *inside* `FunctionTool`. A denial is
   * not schema-checked. Prefer omitting `outputSchema` on guarded
   * tools, or verify the schema accepts `ArcjetDenialResult` / your
   * `onDeny` shape.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

interface CallbackHolder {
  _callback?: (input: unknown, context?: unknown) => unknown;
  _functionTool?: CallbackHolder;
}

function isContextSource(value: unknown): value is StrandsContextSource {
  return value !== null && typeof value === "object";
}

function isCallbackHolder(value: unknown): value is CallbackHolder {
  return value !== null && typeof value === "object";
}

function toolName(tool: StrandsTool): string | undefined {
  if (typeof tool.name === "string" && tool.name.length > 0) {
    return tool.name;
  }
  if (typeof tool.toolSpec?.name === "string" && tool.toolSpec.name.length > 0) {
    return tool.toolSpec.name;
  }
  return undefined;
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

function contextSource(context: unknown): StrandsContextSource | undefined {
  if (!isContextSource(context)) {
    return undefined;
  }
  if (context.invocationState !== undefined) {
    return context;
  }
  // A bare invocationState bag (or a ToolContext without a nested
  // `invocationState` field spelled that way) is still readable.
  return context;
}

/**
 * Wraps an authored `tool({ callback })` so the side-effect never runs
 * on DENY.
 *
 * After `tool()` the runner calls `stream()`, which calls `_callback`
 * (FunctionTool) or `_functionTool._callback` (ZodTool's validation
 * wrapper over the same authored function). `invoke()` calls
 * `_callback` directly. This helper replaces those callback slots so
 * every path is gated, and always runs `guard()` before the original
 * callback. On DENY the original callback never runs. The model
 * receives a plain `ArcjetDenialResult` (or the result of
 * `policy.onDeny`) as the callback return — `FunctionTool` wraps that
 * object in a `JsonBlock`. This helper does not throw on DENY and
 * does not fabricate a `ToolResultBlock`.
 *
 * Guard API errors depend on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): callback does not run; the model receives an
 *   `ArcjetDenialResult` with `reason: "ERROR"`.
 * - `"allow"`: callback still runs, with a warning gated on
 *   `ARCJET_LOG_LEVEL`.
 *
 * Correlation is read from `toolContext.invocationState` (and
 * documented copies). No id is minted. `traceId`, `agent.id`, and
 * `SessionManager` are never read.
 *
 * MCP tools and anything not wrapped with `guardTool` skip this path
 * — use `guardHooks` for those. Do not also wrap the same tool with
 * `@arcjet/guard/vercel-ai/v7` or `@arcjet/guard/langgraph/v1`. The
 * shared `arcjetProtectedTool` brand throws on a second `guardTool`
 * wrap and lets `guardHooks` skip an already-guarded tool.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/strands-agents/v1";
 * import { tool } from "@strands-agents/sdk";
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
 *     inputSchema: z.object({ orderNumber: z.string() }),
 *     callback: async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *   }),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 * ```
 */
export function guardTool<TInput = unknown, TTool extends StrandsTool = StrandsTool>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardToolPolicy<TInput>,
): TTool {
  if (!isCallbackHolder(tool) || typeof tool._callback !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error(
      "@arcjet/guard: guardTool() requires a tool() result with a callback. Pass the result of tool({ callback }), not the config object.",
    );
  }
  if (arcjetProtectedTool in tool) {
    throw new Error(
      "@arcjet/guard: guardTool() cannot wrap a tool that is already guarded; do not double-wrap with @arcjet/guard/strands-agents/v1, @arcjet/guard/vercel-ai/v7, or @arcjet/guard/langgraph/v1",
    );
  }

  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
  const proto = Object.getPrototypeOf(tool) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(tool),
  ) as TTool & CallbackHolder;

  installGuardedCallback(client, tool, policy, wrapped);

  const inner = wrapped._functionTool;
  if (isCallbackHolder(inner) && typeof inner._callback === "function") {
    // ZodTool.stream() delegates to this inner FunctionTool, which
    // closes over the authored callback at construction. Copy it so
    // the original tool's stream() path stays unguarded for the
    // caller who still holds that reference, then gate the copy.
    // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed `any`
    const innerProto = Object.getPrototypeOf(inner) as object | null;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.defineProperties copies every own descriptor, including symbols
    const innerCopy = Object.defineProperties(
      Object.create(innerProto),
      Object.getOwnPropertyDescriptors(inner),
    ) as CallbackHolder;
    installGuardedCallback(client, tool, policy, innerCopy);
    wrapped._functionTool = innerCopy;
  }

  Object.defineProperty(wrapped, arcjetProtectedTool, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  return wrapped;
}

function installGuardedCallback<TInput>(
  client: ArcjetAgentClient,
  tool: StrandsTool,
  policy: GuardToolPolicy<TInput>,
  holder: CallbackHolder,
): void {
  const original = holder._callback;
  if (typeof original !== "function") {
    return;
  }

  const guarded = (input: unknown, context?: unknown): Promise<unknown> =>
    runGuardedCallback(client, tool, policy, input, context, () =>
      Promise.resolve(original(input, context)),
    );

  Object.defineProperty(holder, "_callback", {
    value: guarded,
    writable: true,
    enumerable: false,
    configurable: true,
  });
}

function runGuardedCallback<TInput>(
  client: ArcjetAgentClient,
  tool: StrandsTool,
  policy: GuardToolPolicy<TInput>,
  input: unknown,
  context: unknown,
  execute: () => Promise<unknown>,
): Promise<unknown> {
  const args = input === undefined ? {} : input;

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

  const source = contextSource(context);
  const agentCtx = strandsAgentContext(source, sessionId === undefined ? undefined : { sessionId });

  const name = toolName(tool);
  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(name !== undefined && { "strands.tool": name }),
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
