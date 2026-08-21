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
   * On a `multipart: true` tool the value is placed on the `output`
   * field of the multipart response, because that is the field
   * `executeTool` reads for `toolResponse.output`.
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
      // Scanning the raw text would submit it under the wrong field
      // names, so nothing is scanned — say so, or a misconfigured tool
      // looks like a rule that never matches.
      if (shouldWarn()) {
        console.warn(
          '@arcjet/guard: guardTool() for "%s" was invoked with a string input that is not JSON, so no arguments were scanned.',
          action,
        );
      }
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
 * The registry map `defineTool` registered this action in, when the
 * action came from `defineTool` rather than `dynamicTool` / `tool()`.
 */
function registryStore(tool: GenkitTool): object | undefined {
  const registry = "__registry" in tool ? (tool as { __registry?: unknown }).__registry : undefined;
  if (registry === null || typeof registry !== "object") {
    return undefined;
  }
  if (!("actionsById" in registry)) {
    return undefined;
  }
  const store: unknown = registry.actionsById;
  if (store === null || typeof store !== "object") {
    return undefined;
  }
  return store;
}

/**
 * Every registry key that can resolve to `tool`'s authored handler.
 *
 * `defineTool(config, fn)` registers *two* actions for a non-multipart
 * tool: the returned action under `/tool/<name>`, and a second
 * `basicToolV2(config, fn)` twin under `/tool.v2/<name>` that closes
 * over the same `fn`. Guarding only the first leaves a live unguarded
 * reference to the handler on the registry.
 */
function registryKeys(tool: GenkitTool): string[] {
  const { key, actionType, name } = tool.__action ?? {};
  const keys = new Set<string>();
  if (typeof key === "string") {
    keys.add(key);
  }
  if (typeof name === "string") {
    if (typeof actionType === "string") {
      keys.add(`/${actionType}/${name}`);
    }
    keys.add(`/tool/${name}`);
    keys.add(`/tool.v2/${name}`);
  }
  return [...keys];
}

/**
 * `ai.generate({ tools })` does not keep the ToolAction objects. It
 * converts them to name/schema definitions (`toToolDefinition`) and
 * `resolveTools` looks the live action up on the registry. A wrapper
 * that is only a copy would be discarded; the original registered
 * action would run unguarded. Overwrite every registry entry that
 * resolves to the authored handler so generate() resolves a guarded
 * callable. Dynamic tools (`metadata.dynamic`) are registered from the
 * `tools` array at generate() time and do not need this.
 *
 * The `/tool.v2/<name>` twin is a different action object wrapping the
 * same handler, so it is guarded with its own wrapper — passing the
 * basic wrapper would change the multipart response shape
 * `executeTool` expects from a `tool.v2` action.
 */
function reregisterGuardedTool(
  original: GenkitTool,
  wrapped: GenkitTool,
  wrapTwin: (twin: GenkitTool) => GenkitTool,
): void {
  const store = registryStore(original);
  if (store === undefined) {
    return;
  }

  for (const candidate of registryKeys(original)) {
    if (!Object.hasOwn(store, candidate)) {
      continue;
    }
    const current: unknown = Reflect.get(store, candidate);
    if (current === original) {
      install(store, candidate, wrapped);
      continue;
    }
    if (typeof current === "function" && !(arcjetProtectedTool in current)) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a registry entry under a tool key is a ToolAction
      install(store, candidate, wrapTwin(current as GenkitTool));
    }
  }
}

/**
 * Replace one registry entry, or fail loudly.
 *
 * A frozen or otherwise non-writable entry makes `Reflect.set` return
 * `false` rather than throw, and generate() would then resolve the
 * unguarded original. Silently handing back a wrapper that the runner
 * never calls is the one outcome a security wrapper must not have, so
 * this fails at wrap time — the same choice `guardToolNode` makes for a
 * frozen `ToolNode.tools` array.
 */
function install(store: object, key: string, action: GenkitTool): void {
  if (Reflect.set(store, key, action)) {
    return;
  }
  throw new Error(
    `@arcjet/guard: guardTool() could not replace the registry entry for "${key}"; generate() would run the tool unguarded. Guard the tool before it is registered, or unfreeze the Genkit registry.`,
  );
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
 * therefore overwrites the registry entries so generate() cannot run
 * the unguarded `defineTool` action — including the `/tool.v2/<name>`
 * twin `defineTool` registers alongside a basic tool, which closes over
 * the same handler. Dynamic tools are registered from the `tools` array
 * at generate() time and do not need that.
 *
 * A `multipart: true` tool resolves to `{ output, content }` and
 * `executeTool` reads `.output`; denials from one are returned in that
 * shape so the model still sees the explanation.
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

  const wrapped = wrapToolAction(client, tool, policy);

  reregisterGuardedTool(tool, wrapped, (twin) => wrapToolAction(client, twin, policy));

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- descriptors copied from the original ToolAction
  return wrapped as TTool;
}

/**
 * The wrap itself, without the registry replacement: replaces the
 * callable and `.run` with guarded ones and brands the result.
 */
function wrapToolAction<TInput>(
  client: ArcjetAgentClient,
  tool: GenkitTool,
  policy: GuardToolPolicy<TInput>,
): GenkitTool {
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
  const wrapped = wrappedFn as unknown as GenkitTool;

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

  return wrapped;
}

/**
 * Shape a denial the way the action the wrapper replaced would have
 * returned it.
 *
 * A `tool.v2` (multipart) action resolves to
 * `{ output, content, metadata }`, and `executeTool` reads `.output`
 * off it — returning a bare denial from one puts `undefined` on
 * `toolResponse.output` and the model is told nothing. `.run()` adds
 * the `{ result, telemetry }` envelope on top of either shape.
 */
function denialEnvelope(
  value: unknown,
  extras: { multipart: boolean; wrapRunResult: boolean },
): unknown {
  const shaped = extras.multipart ? { output: value } : value;
  return extras.wrapRunResult ? { result: shaped, telemetry: { traceId: "", spanId: "" } } : shaped;
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
  const envelope = {
    multipart: tool.__action?.actionType === "tool.v2",
    wrapRunResult: extras?.wrapRunResult === true,
  };

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
    return Promise.resolve(denialEnvelope(unavailableResult(), envelope));
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

  const asResult = (value: unknown): unknown => denialEnvelope(value, envelope);

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
    // The allow path returns whatever the original action returned —
    // `.run`'s `{ result, telemetry }`, or a multipart response — so it
    // is already in the shape the caller expects.
    execute,
    onGuardError: policy.onGuardError ?? "deny",
  });
}
