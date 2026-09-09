import type { PolicyInputMap } from "../policy-input.ts";

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
 * Build each value with {@link policyInput}.
 */
export type InputsResolver<TArgs extends readonly unknown[]> =
  | PolicyInputMap
  | ((...args: TArgs) => PolicyInputMap | Promise<PolicyInputMap>);

/** Optional `actor` / `inputs` fields shared by vendor wrapper policies. */
export interface ActorInputsPolicy<TArgs extends readonly unknown[]> {
  actor?: ActorResolver<TArgs>;
  inputs?: InputsResolver<TArgs>;
}

/**
 * Resolve optional `actor` / `inputs` from a vendor policy. Static values are
 * returned as-is; functions are awaited with the adapter's native arguments.
 * Omitted fields stay omitted so they are not sent as `undefined` under
 * `exactOptionalPropertyTypes`.
 */
export async function resolveActorInputs<TArgs extends readonly unknown[]>(
  policy: ActorInputsPolicy<TArgs>,
  ...args: TArgs
): Promise<{ actor?: string; inputs?: PolicyInputMap }> {
  const actor =
    policy.actor === undefined
      ? undefined
      : typeof policy.actor === "function"
        ? await policy.actor(...args)
        : policy.actor;
  const inputs =
    policy.inputs === undefined
      ? undefined
      : typeof policy.inputs === "function"
        ? await policy.inputs(...args)
        : policy.inputs;
  return {
    ...(actor !== undefined && { actor }),
    ...(inputs !== undefined && { inputs }),
  };
}
