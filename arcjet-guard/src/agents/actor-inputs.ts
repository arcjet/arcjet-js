import { isPolicyInput } from "../policy-input.ts";
import type { PolicyInputMap } from "../policy-input.ts";
import { symbolArcjetInternal } from "../symbol.ts";
import type { ArcjetMetadata, RuleWithInput } from "../types.ts";
import { shouldWarn } from "./capture.ts";

/**
 * Trusted actor identity, or a resolver over the adapter's native call.
 * Arguments match that framework's execute / invoke / hook — typically the
 * parsed tool input plus the trusted runtime or context object, the same
 * shape Vercel AI uses as `(input, ctx)`.
 *
 * Derive the actor from authenticated server-side context; never trust a
 * model-produced tool input as the actor identity — a policy can be
 * conditioned on the actor, so a model-controlled value could escape scope.
 */
export type ActorResolver<TArgs extends readonly unknown[]> =
  | string
  | ((...args: TArgs) => string | Promise<string>);

/**
 * Typed remote-policy inputs, or a resolver over the adapter's native call.
 * Build each value with {@link ../policy-input.ts}.
 */
export type InputsResolver<TArgs extends readonly unknown[]> =
  | PolicyInputMap
  | ((...args: TArgs) => PolicyInputMap | Promise<PolicyInputMap>);

/** Optional `actor` / `inputs` fields shared by vendor wrapper policies. */
export interface ActorInputsPolicy<TArgs extends readonly unknown[]> {
  actor?: ActorResolver<TArgs>;
  inputs?: InputsResolver<TArgs>;
}

/** The `actor` and `inputs` a guard call is made with, after their callbacks have run. */
export interface ResolvedActorInputs {
  /**
   * The fields to spread into the guard call. A field the policy omits, or
   * whose callback failed, is absent rather than `undefined`, so it is not
   * sent under `exactOptionalPropertyTypes`.
   */
  fields: { actor?: string; inputs?: PolicyInputMap };
  /**
   * The first of the two callbacks that threw, rejected, or returned a value
   * Guard cannot use, or `undefined` when both succeeded. Pass it on after
   * `resolveCallPolicy`'s, as `call.degraded ?? remote.degraded`, so the
   * first failure in the call is the one reported.
   */
  degraded: Error | undefined;
}

/**
 * Resolve a helper policy's `actor` and `inputs` without letting a failing
 * callback skip the guard call.
 *
 * A value given directly is passed through unchanged. A function is awaited
 * with the adapter's native arguments; if it throws, rejects, or returns
 * something Guard cannot use, its field is left out of the call and the
 * failure is returned as `degraded`, as `resolveCallPolicy` does for the
 * other callbacks. Only type and shape are checked: `actor` must be a string,
 * and `inputs` a plain object whose every value was built with `policyInput`.
 * The service judges a call that lacks them: a policy that requires the actor
 * or a missing input is INCOMPLETE there and denies.
 *
 * @param policy - The helper's policy; only `actor` and `inputs` are read.
 * @param action - The label the call is sent under, named in a failure.
 * @param args - The adapter's native arguments for the two callbacks.
 */
export async function resolveActorInputs<TArgs extends readonly unknown[]>(
  policy: ActorInputsPolicy<TArgs>,
  action: string,
  ...args: TArgs
): Promise<ResolvedActorInputs> {
  const failures: Error[] = [];

  let actor: string | undefined;
  if (typeof policy.actor === "function") {
    const result = await awaitSafely(policy.actor, args, "actor", action, failures);
    if (result.ok && isString(result.value)) {
      actor = result.value;
    } else if (result.ok) {
      failures.push(
        new Error(
          `@arcjet/guard: the actor callback for "${action}" did not return a string; calling Guard without an actor`,
        ),
      );
    }
  } else {
    actor = policy.actor;
  }

  let inputs: PolicyInputMap | undefined;
  if (typeof policy.inputs === "function") {
    const result = await awaitSafely(policy.inputs, args, "inputs", action, failures);
    if (result.ok && isPolicyInputMap(result.value)) {
      inputs = result.value;
    } else if (result.ok) {
      failures.push(
        new Error(
          `@arcjet/guard: the inputs callback for "${action}" did not return an object of values built with policyInput; calling Guard without inputs`,
        ),
      );
    }
  } else {
    inputs = policy.inputs;
  }

  return {
    fields: {
      ...(actor !== undefined && { actor }),
      ...(inputs !== undefined && { inputs }),
    },
    degraded: failures[0],
  };
}

/**
 * The per-call fields a helper policy may give as a value or as a function of
 * the call. Each helper passes its own policy: the argument is whatever that
 * helper hands its callbacks (the tool input, or a `{ toolName, input }` call).
 */
export interface CallPolicy<TArg> {
  action?: string | ((arg: TArg) => string) | undefined;
  rules?: RuleWithInput[] | ((arg: TArg) => RuleWithInput[]) | undefined;
  metadata?: ArcjetMetadata | ((arg: TArg) => ArcjetMetadata) | undefined;
  sessionId?: string | ((arg: TArg) => string | undefined) | undefined;
}

/** The values a guard call is made with, after every callback has run. */
export interface ResolvedCallPolicy {
  /** The guard label and capture action. */
  action: string;
  /** Local rules, or `undefined` when there are none to submit. */
  rules: RuleWithInput[] | undefined;
  /** The policy's metadata, to merge over what the helper derives itself. */
  metadata: ArcjetMetadata | undefined;
  /** A session ID that overrides the one the helper derives, if any. */
  sessionId: string | undefined;
  /**
   * The first callback that threw or returned a value Guard cannot use, or
   * `undefined` when every callback succeeded. Pass it to `runGuarded` or
   * `runGate` as `degraded`, ahead of `resolveActorInputs`'s: Guard is still
   * called without the failed value, and `onGuardError` decides whether the
   * action proceeds.
   */
  degraded: Error | undefined;
}

/**
 * Run a helper policy's per-call callbacks without letting one skip the guard
 * call.
 *
 * A callback that throws, or returns something Guard cannot use, is replaced
 * by what the helper would send without it: no local rules, no policy
 * metadata, no session override, and `fallbackAction` for the label. The first
 * such failure is returned as `degraded`, so remote policy still evaluates the
 * call and `onGuardError` decides the outcome. `resolveActorInputs` does the
 * same for the `actor` and `inputs` callbacks.
 *
 * Only the return value of a callback is checked, and only for its type and
 * shape. An `action` callback's string is not run through the guard label
 * check: the service judges a call-time label, and a rejected one reaches
 * `onGuardError` as AJ1023. A value given directly is passed through
 * unchanged, as it always was.
 *
 * @param policy - The helper's policy; only the four per-call fields are read.
 * @param arg - The argument the helper passes to its callbacks.
 * @param fallbackAction - The label when `action` is not a function, and when
 *   the `action` callback fails. Helpers compute it the way they resolved a
 *   static `action` before, so a static label is unchanged.
 */
export function resolveCallPolicy<TArg>(
  policy: CallPolicy<TArg>,
  arg: TArg,
  fallbackAction: string,
): ResolvedCallPolicy {
  const failures: Error[] = [];

  let action = fallbackAction;
  if (typeof policy.action === "function") {
    const result = callSafely(policy.action, arg, "action", fallbackAction, failures);
    // A returned string is sent as it is, even one the construction-time label
    // check would refuse: a label that exists only at call time is the
    // service's to judge, and a rejected one comes back as AJ1023, which
    // `onGuardError` already governs.
    if (result.ok && isString(result.value)) {
      action = result.value;
    } else if (result.ok) {
      failures.push(
        new Error(
          `@arcjet/guard: the action callback did not return a string; using "${fallbackAction}"`,
        ),
      );
    }
  }

  let rules: RuleWithInput[] | undefined;
  if (typeof policy.rules === "function") {
    const result = callSafely(policy.rules, arg, "rules", action, failures);
    if (result.ok && isBoundRuleList(result.value)) {
      rules = result.value;
    } else if (result.ok) {
      failures.push(
        new Error(
          `@arcjet/guard: the rules callback for "${action}" did not return an array of rules bound to their input; calling Guard with no local rules`,
        ),
      );
    }
  } else {
    rules = policy.rules;
  }

  let metadata: ArcjetMetadata | undefined;
  if (typeof policy.metadata === "function") {
    const result = callSafely(policy.metadata, arg, "metadata", action, failures);
    if (result.ok && isMetadataObject(result.value)) {
      metadata = result.value;
    } else if (result.ok) {
      failures.push(
        new Error(
          `@arcjet/guard: the metadata callback for "${action}" did not return an object; calling Guard without it`,
        ),
      );
    }
  } else {
    metadata = policy.metadata;
  }

  let sessionId: string | undefined;
  if (typeof policy.sessionId === "function") {
    const result = callSafely(policy.sessionId, arg, "sessionId", action, failures);
    if (result.ok && isOptionalString(result.value)) {
      sessionId = result.value;
    } else if (result.ok) {
      failures.push(
        new Error(
          `@arcjet/guard: the sessionId callback for "${action}" did not return a string; calling Guard without it`,
        ),
      );
    }
  } else if (typeof policy.sessionId === "string" && policy.sessionId.length > 0) {
    sessionId = policy.sessionId;
  }

  return { action, rules, metadata, sessionId, degraded: failures[0] };
}

/**
 * Warn that Guard judged a call without a callback's value, and what
 * `onGuardError` did about it. Shared by `runGuarded` and `runGate`.
 */
export function warnDegraded(action: string, failClosed: boolean, error: Error): void {
  if (!shouldWarn()) {
    return;
  }
  if (failClosed) {
    console.warn(
      '@arcjet/guard: policy for "%s" was evaluated without a failed callback; failing closed:',
      action,
      error,
    );
  } else {
    console.warn(
      '@arcjet/guard: policy for "%s" was evaluated without a failed callback; failing open:',
      action,
      error,
    );
  }
}

type CallResult<T> = { ok: true; value: T } | { ok: false };

/**
 * Call a synchronous policy callback, recording a throw in `failures`.
 *
 * A promise, or any other thenable, is a failure too: these callbacks are
 * synchronous, and a promise passes the object check `metadata` gets, so it
 * would otherwise be sent as empty metadata with nothing reported. Its
 * rejection is handled here so it cannot become an unhandled rejection.
 */
function callSafely<TArg, T>(
  fn: (arg: TArg) => T,
  arg: TArg,
  field: string,
  action: string,
  failures: Error[],
): CallResult<T> {
  let value: T;
  try {
    value = fn(arg);
  } catch (error) {
    failures.push(
      new Error(`@arcjet/guard: the ${field} callback for "${action}" threw`, { cause: error }),
    );
    return { ok: false };
  }
  if (isThenable(value)) {
    value.then(undefined, () => {});
    failures.push(
      new Error(
        `@arcjet/guard: the ${field} callback for "${action}" returned a promise; it must return its value directly`,
      ),
    );
    return { ok: false };
  }
  return { ok: true, value };
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

async function awaitSafely<TArgs extends readonly unknown[], T>(
  fn: (...args: TArgs) => T | Promise<T>,
  args: TArgs,
  field: string,
  action: string,
  failures: Error[],
): Promise<CallResult<T>> {
  try {
    return { ok: true, value: await fn(...args) };
  } catch (error) {
    failures.push(
      new Error(`@arcjet/guard: the ${field} callback for "${action}" threw`, { cause: error }),
    );
    return { ok: false };
  }
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isMetadataObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether `value` is an object literal of `policyInput` values. The prototype
 * check refuses a `Map` or class instance, whose entries the client would not
 * read, so the call would go out with no inputs and no sign of why.
 */
function isPolicyInputMap(value: unknown): value is PolicyInputMap {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return false;
  }
  return Object.values(value).every((input) => isPolicyInput(input));
}

/**
 * Whether `value` is a rule bound to its input — what calling a rule
 * configuration produces, such as `tokenBucket(config)(input)`. An unbound
 * configuration is a function, and carries no input ID.
 */
function isBoundRule(value: unknown): boolean {
  if (typeof value !== "object" || value === null || !(symbolArcjetInternal in value)) {
    return false;
  }
  const internal: unknown = value[symbolArcjetInternal];
  return (
    typeof internal === "object" &&
    internal !== null &&
    "inputId" in internal &&
    typeof internal.inputId === "string"
  );
}

function isBoundRuleList(value: unknown): value is RuleWithInput[] {
  return Array.isArray(value) && value.every((rule) => isBoundRule(rule));
}
