/**
 * Internal symbols used for SDK bookkeeping.
 *
 * Symbol keys are hidden from JSON.stringify, Object.keys, and casual
 * property access, so consumers can't accidentally depend on — or
 * forge — them.
 *
 * @packageDocumentation
 * @internal
 */

/** @internal Single symbol key for correlation IDs. */
export const symbolArcjetInternal: unique symbol = Symbol.for("arcjet.guard.internal");

/**
 * The `globalThis` slot holding the registered client.
 *
 * Registered under `Symbol.for` so two copies of `@arcjet/guard` in one realm —
 * a direct dependency and a transitive one on a different version — resolve to
 * the same slot, instead of each keeping a private registration the other
 * cannot see.
 *
 * Namespaced under `guard` rather than taking a bare `arcjet.client` on
 * purpose. Registration is scoped to the Guards SDK for now, and a client in
 * this slot has `guard()`, `capture()` and `flush()` but no `protect()`.
 * Claiming the unnamespaced key would leave the request SDK finding a client
 * here that cannot satisfy the interface it expects.
 *
 * @internal
 */
export const symbolArcjetClient: unique symbol = Symbol.for("arcjet.guard.client");
