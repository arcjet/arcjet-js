/**
 * `@arcjet/protocol/well-known-bots` — everything this entrypoint publishes, named.
 *
 * The modules under `src/` are implementation. They export whatever suits
 * them; only what this file lists reaches anyone who installs the package, so
 * adding to the public API is a deliberate act rather than a side effect.
 *
 * @packageDocumentation
 */

export { categories } from "../well-known-bots.js";

export type { ArcjetBotCategory, ArcjetWellKnownBot } from "../well-known-bots.js";
