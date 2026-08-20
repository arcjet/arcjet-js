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
 * Structural `defineTool` / `tool()` action. Declared here so `guardTool`
 * does not value-import `genkit`.
 *
 * After `ai.defineTool(config, handler)` the authored handler is closed
 * over inside the returned `ToolAction`. `generate()` calls that action
 * as a function (`tool(input, options)`), which delegates to `.run`.
 *
 * The call signature is `(...args: never[]) => unknown` so a real
 * `ToolAction` — whose parameters are a concrete input and
 * `ToolRunOptions` — stays assignable under `strictFunctionTypes`.
 * Written as `(input?: unknown, options?: unknown)` those parameters
 * are contravariant and every real tool is rejected at the call site.
 */
export type GenkitTool = ((...args: never[]) => unknown) & {
  __action?: {
    name?: string;
    key?: string;
    metadata?: Record<string, unknown>;
    actionType?: string;
  };
  run?(...args: never[]): unknown;
  stream?(...args: never[]): unknown;
  respond?(interrupt: unknown, outputData: unknown, options?: unknown): unknown;
  restart?(interrupt: unknown, resumedMetadata?: unknown, options?: unknown): unknown;
};

/**
 * Input type of a Genkit `defineTool` / `tool()` action. Used so
 * `guardTool` can keep the concrete tool type while still typing
 * `policy.rules` against the tool args (not opaque call refs).
 */
export type GenkitToolInput<TTool> = TTool extends {
  (input?: infer TInput, options?: unknown): unknown;
}
  ? TInput
  : unknown;

/**
 * Policy for `guardTool()` — how to guard an authored
 * `ai.defineTool(config, handler)`.
 *
 * Specifies the guard action name, optional rules to evaluate, metadata
 * context, and optional denial handler. Rules can be static or computed
 * from the tool's free-text args. Do not scan opaque call refs.
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
   * Fallback session id when the tool options / generate context do not
   * carry one. Prefer putting the id you already chose on
   * `ai.generate({ context: { sessionId } })`. Never mint a new id here.
   * Never pass a Genkit `Session.sessionId` that the Session constructed
   * without an id — that class mints a UUID.
   */
  sessionId?: string | ((input: TInput) => string | undefined);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /**
   * Reshape the denial payload the model sees for a real DENY decision.
   * The value is returned from the tool action as-is, which is what
   * `generate()` puts on `toolResponse.output`. Unavailable guards take
   * the `onUnavailable` path instead and return the fixed
   * `{ reason: "ERROR", retryable: true, retryAfterSeconds: 5 }` result;
   * this callback does not fire for outages.
   *
   * **Warning:** A tool created with `outputSchema` validates the
   * authored handler's return *inside* the `ToolAction` this wrapper
   * replaces. A denial is not schema-checked. Prefer omitting
   * `outputSchema` on guarded tools, or verify the schema accepts
   * `ArcjetDenialResult` / your `onDeny` shape. Returning a
   * schema-mismatched value from the *inner* handler would throw and
   * fail `generate()` — wrapping the action is what keeps a denial a
   * completed tool result.
   */
  onDeny?: (decision: DecisionDeny) => unknown;
}

function isContextSource(value: unknown): value is GenkitContextSource {
  return value !== null && typeof value === "object";
}

/**
 * The model-produced arguments. `generate()` invokes a tool with the
 * parsed `toolRequest.input` object. Scan those args, not
 * `toolRequest.ref`.
 */
function toolArgs(input: unknown, action: string): unknown {
  if (input !== null && typeof input === "object") {
    return input;
  }
  if (typeof input === "string") {
    try {
      return JSON.parse(input) as unknown;
    } catch {
      return {};
    }
  }
  if (input === undefined) {
    return {};
  }
  if (shouldWarn()) {
    console.warn(
      '@arcjet/guard: guardTool() for "%s" was invoked with a %s input; expected the parsed object generate() passes, so no arguments were scanned.',
      action,
      input === null ? "null" : typeof input,
    );
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
 * `ai.generate({ tools })` does not keep the ToolAction objects. It
 * converts them to name/schema definitions (`toToolDefinition`) and
 * `resolveTools` looks the live action up on the registry. A wrapper
 * that is only a copy would be discarded; the original registered
 * action would run unguarded. Overwrite the existing registry entry
 * so generate() resolves the guarded callable. Dynamic tools
 * (`metadata.dynamic`) are registered from the `tools` array at
 * generate() time and do not need this.
 */
function reregisterGuardedTool(original: GenkitTool, wrapped: GenkitTool): void {
  const registry = "__registry" in original ? (original as { __registry?: unknown }).__registry : undefined;
  if (registry === null || typeof registry !== "object") {
    return;
  }
  if (!("actionsById" in registry)) {
    return;
  }
  const store: unknown = registry.actionsById;
  if (store === null || typeof store !== "object") {
    return;
  }

  const key = original.__action?.key;
  const actionType = original.__action?.actionType;
  const name = original.__action?.name;
  const candidates = [
    typeof key === "string" ? key : undefined,
    typeof actionType === "string" && typeof name === "string" ? `/${actionType}/${name}` : undefined,
  ];
  for (const candidate of candidates) {
    if (candidate !== undefined && Object.hasOwn(store, candidate)) {
      Reflect.set(store, candidate, wrapped);
    }
  }
}

function copyToolDescriptors(tool: GenkitTool, onto: object): void {
  const descriptors = Object.getOwnPropertyDescriptors(tool);
  // Function identity fields are not writable on a new function; copying
  // them throws. Everything else (`__action`, `respond`, `restart`, …)
  // is what generate() and `toToolDefinition` actually read.
  delete descriptors["name"];
  delete descriptors["length"];
  delete descriptors["arguments"];
  delete descriptors["caller"];
  delete descriptors["prototype"];
  Object.defineProperties(onto, descriptors);
}

/**
 * Wraps a `defineTool` / `tool()` `ToolAction` so the closed-over
 * handler never runs on DENY.
 *
 * After `ai.defineTool(config, handler)` the runner calls the returned
 * action as a function. This helper replaces that callable (and `.run`,
 * so a direct `tool.run()` is gated the same way) and always runs
 * `guard()` before the original action. On DENY the original action —
 * and therefore the authored handler and `outputSchema` validation —
 * never runs. The model receives an `ArcjetDenialResult` (or the result
 * of `policy.onDeny`) as a completed `toolResponse.output`. This helper
 * does not throw on DENY and does not call `interrupt()` /
 * `ToolInterruptError` (those are HITL).
 *
 * `ai.generate({ tools })` converts the array to name/schema
 * definitions and looks the live action up on the registry. This helper
 * therefore overwrites the original registry entry so generate() cannot
 * run the unguarded `defineTool` action. Dynamic tools are registered
 * from the `tools` array at generate() time and do not need that.
 *
 * Guard API errors depend on `policy.onGuardError` (defaults to `"deny"`):
 * - `"deny"` (default): handler does not run; the model receives an
 *   `ArcjetDenialResult` with `reason: "ERROR"`.
 * - `"allow"`: handler still runs, with a warning gated on
 *   `ARCJET_LOG_LEVEL`.
 *
 * Correlation is read from the tool `options.context` (and documented
 * copies on the envelope). `generate({ context })` is delivered to the
 * authored handler via Genkit's ALS; the wrapper sees it when the
 * caller passed `options.context` explicitly, or via `policy.sessionId`.
 * No id is minted. `interrupt` / `resumed` / `traceId` are never read.
 *
 * Filesystem middleware tools, MCP tools, and anything not wrapped with
 * `guardTool` skip this path — use `guardMiddleware` for those. Do not
 * also wrap the same tool with `@arcjet/guard/vercel-ai/v7`. The shared
 * `arcjetProtectedTool` brand throws on a second `guardTool` wrap.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardTool } from "@arcjet/guard/genkit/v1";
 * import { genkit, z } from "genkit";
 *
 * const ai = genkit({ ... });
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const lookupLimit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * export const lookupOrder = guardTool(
 *   arcjet,
 *   ai.defineTool(
 *     {
 *       name: "lookup_order",
 *       description: "Look up an order by number",
 *       inputSchema: z.object({ orderNumber: z.string() }),
 *     },
 *     async ({ orderNumber }) => ({ orderNumber, status: "shipped" }),
 *   ),
 *   {
 *     action: "order.looked-up",
 *     rules: (input) => [lookupLimit({ key: input.orderNumber, requested: 1 })],
 *   },
 * );
 * ```
 */
export function guardTool<TInput = unknown, TTool extends GenkitTool = GenkitTool>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardToolPolicy<TInput>,
): TTool {
  if (typeof tool !== "function") {
    // oxlint-disable-next-line unicorn/prefer-type-error -- Error preserves backward compatibility with the other vendor namespaces
    throw new Error(
      "@arcjet/guard: guardTool() requires a ToolAction from defineTool() (a callable). Pass the result of ai.defineTool(config, handler), not the config object.",
    );
  }
  if (arcjetProtectedTool in tool) {
    throw new Error(
      "@arcjet/guard: guardTool() cannot wrap a tool that is already guarded; do not double-wrap with @arcjet/guard/genkit/v1 or @arcjet/guard/vercel-ai/v7",
    );
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- GenkitTool's never[] call is the accept-any-ToolAction trick; invoke with the runtime args
  const originalCall = tool.bind(tool) as (input?: unknown, options?: unknown) => unknown;
  // oxlint-disable-next-line typescript/unbound-method -- read to be bound to `tool` immediately below, which is the point
  const originalRun =
    typeof tool.run === "function"
      ? // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- same never[] accept-any trick as originalCall
        (tool.run.bind(tool) as (input?: unknown, options?: unknown) => unknown)
      : undefined;

  const wrappedFn = function guardedGenkitTool(
    input?: unknown,
    options?: unknown,
  ): Promise<unknown> {
    return runGuardedTool(client, tool, policy, input, options, () =>
      Promise.resolve(originalCall(input, options)),
    );
  };

  // Preserve own descriptors (`__action`, `respond`, `restart`, …).
  copyToolDescriptors(tool, wrappedFn);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- descriptors copied from the original ToolAction
  const wrapped = wrappedFn as unknown as TTool;

  if (originalRun !== undefined) {
    const newRun = (input?: unknown, options?: unknown): Promise<unknown> =>
      runGuardedTool(client, tool, policy, input, options, () => Promise.resolve(originalRun(input, options)), {
        wrapRunResult: true,
      });
    Object.defineProperty(wrapped, "run", {
      value: newRun,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }

  Object.defineProperty(wrapped, arcjetProtectedTool, {
    value: true,
    enumerable: false,
    configurable: true,
  });

  reregisterGuardedTool(tool, wrapped);

  return wrapped;
}

function isActionResult(value: unknown): value is { result: unknown; telemetry: unknown } {
  return (
    value !== null &&
    typeof value === "object" &&
    "result" in value &&
    "telemetry" in value
  );
}

function runGuardedTool<TInput>(
  client: ArcjetAgentClient,
  tool: GenkitTool,
  policy: GuardToolPolicy<TInput>,
  input: unknown,
  options: unknown,
  execute: () => Promise<unknown>,
  extras?: { wrapRunResult?: boolean },
): Promise<unknown> {
  const args = toolArgs(input, policy.action);

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
    return Promise.resolve(
      extras?.wrapRunResult === true ? { result: unavailableResult(), telemetry: { traceId: "", spanId: "" } } : unavailableResult(),
    );
  }

  const source = isContextSource(options) ? options : undefined;
  const agentCtx = genkitContext(source, sessionId === undefined ? undefined : { sessionId });

  const toolName =
    typeof tool.__action?.name === "string" && tool.__action.name.length > 0
      ? tool.__action.name
      : undefined;
  const metadata: ArcjetMetadata = {
    ...agentCtx.metadata,
    ...(toolName !== undefined && { "genkit.tool": toolName }),
  };
  const mergedMetadata = { ...metadata, ...policyMetadata };

  const asResult = (value: unknown): unknown =>
    extras?.wrapRunResult === true ? { result: value, telemetry: { traceId: "", spanId: "" } } : value;

  return runGuarded<unknown>(client, {
    action: policy.action,
    rules,
    correlationId: agentCtx.correlationId,
    metadata: mergedMetadata,
    onDeny: (decision: DecisionDeny) => {
      if (policy.onDeny === undefined) {
        return asResult(denialResult(decision));
      }
      try {
        return asResult(policy.onDeny(decision));
      } catch (error) {
        if (shouldWarn()) {
          console.warn(
            '@arcjet/guard: onDeny for "%s" threw; returning the default denial:',
            policy.action,
            error,
          );
        }
        return asResult(denialResult(decision));
      }
    },
    onUnavailable: () => asResult(unavailableResult()),
    execute: async () => {
      const out = await execute();
      // `.run` already returns `{ result, telemetry }`; do not wrap twice.
      if (extras?.wrapRunResult === true && isActionResult(out)) {
        return out;
      }
      return out;
    },
    onGuardError: policy.onGuardError ?? "deny",
  });
}
