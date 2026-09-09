import type { PolicyInputMap } from "../policy-input.ts";

/**
 * Trusted actor identity, or a resolver over the adapter's call argument.
 * Derive it from authenticated server-side context; never trust a
 * model-produced tool input as the actor identity — a policy can be
 * conditioned on the actor, so a model-controlled value could escape scope.
 */
export type ActorResolver<TArg> = string | ((arg: TArg) => string | Promise<string>);

/**
 * Typed remote-policy inputs, or a resolver over the adapter's call argument.
 * Build each value with {@link policyInput}.
 */
export type InputsResolver<TArg> =
  | PolicyInputMap
  | ((arg: TArg) => PolicyInputMap | Promise<PolicyInputMap>);

/** Optional `actor` / `inputs` fields shared by vendor wrapper policies. */
export interface ActorInputsPolicy<TArg> {
  actor?: ActorResolver<TArg>;
  inputs?: InputsResolver<TArg>;
}

/**
 * Resolve optional `actor` / `inputs` from a vendor policy. Static values are
 * returned as-is; functions are awaited. Omitted fields stay omitted so they
 * are not sent as `undefined` under `exactOptionalPropertyTypes`.
 */
export async function resolveActorInputs<TArg>(
  policy: ActorInputsPolicy<TArg>,
  arg: TArg,
): Promise<{ actor?: string; inputs?: PolicyInputMap }> {
  const actor =
    policy.actor === undefined
      ? undefined
      : typeof policy.actor === "function"
        ? await policy.actor(arg)
        : policy.actor;
  const inputs =
    policy.inputs === undefined
      ? undefined
      : typeof policy.inputs === "function"
        ? await policy.inputs(arg)
        : policy.inputs;
  return {
    ...(actor !== undefined && { actor }),
    ...(inputs !== undefined && { inputs }),
  };
}
