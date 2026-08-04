/**
 * `@arcjet/decorate` — everything this entrypoint publishes, named.
 *
 * The modules under `src/` are implementation. They export whatever suits
 * them; only what this file lists reaches anyone who installs the package, so
 * adding to the public API is a deliberate act rather than a side effect.
 *
 * @packageDocumentation
 */

export { setRateLimitHeaders } from "../index.js";

export type { ArcjetCanDecorate } from "../index.js";
