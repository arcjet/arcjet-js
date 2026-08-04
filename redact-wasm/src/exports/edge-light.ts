/**
 * `@arcjet/redact-wasm` — everything the `edge-light` build publishes, named.
 *
 * The modules under `src/` are implementation. They export whatever suits
 * them; only what this file lists reaches anyone who installs the package, so
 * adding to the public API is a deliberate act rather than a side effect.
 *
 * Publishes `CustomDetect` and `CustomRedact`, which the default
 * entrypoint does not. That difference predates this file; it is written down
 * here rather than quietly evened out.
 *
 * @packageDocumentation
 */

export { initializeWasm } from "../edge-light.js";

export type {
  CustomDetect,
  CustomRedact,
  RedactSensitiveInfoConfig,
  RedactedSensitiveInfoEntity,
  SensitiveInfoEntity,
} from "../edge-light.js";
