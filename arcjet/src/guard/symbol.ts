/**
 * Internal symbol used for SDK bookkeeping.
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
