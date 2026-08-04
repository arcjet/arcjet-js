/**
 * `@arcjet/protocol/client` — everything this entrypoint publishes, named.
 *
 * The modules under `src/` are implementation. They export whatever suits
 * them; only what this file lists reaches anyone who installs the package, so
 * adding to the public API is a deliberate act rather than a side effect.
 *
 * @packageDocumentation
 */

export { createClient, decideTimeout } from "../client.js";

export type { Client, ClientOptions } from "../client.js";
