/**
 * `@arcjet/guard/node` — Node.js entrypoint.
 *
 * Uses HTTP/2 via `@connectrpc/connect-node` for optimal performance
 * with long-lived connections and optimistic pre-connect.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * // or explicitly: import { launchArcjet } from "@arcjet/guard/node";
 *
 * const arcjet = launchArcjet({ key: "ajkey_..." });
 * const limit = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
 * const decision = await arcjet.guard({
 *   label: "tools.weather",
 *   rules: [limit({ key: userId })],
 * });
 * ```
 *
 * Unlike some other `@arcjet/*` packages `@arcjet/guard` never reads any
 * environment variables directly. All configuration must be passed explicitly
 * via `launchArcjet()` options, `Arcjet.guard()`, or rule inputs. This
 * includes `ARCJET_ENV` and `ARCJET_BASE_URL` among others.
 *
 * @packageDocumentation
 */

export {
  // Types
  type Conclusion,
  type Reason,
  type Mode,
  type RuleResult,
  type RuleResultTokenBucket,
  type RuleResultFixedWindow,
  type RuleResultSlidingWindow,
  type RuleResultPromptInjection,
  type RuleResultSensitiveInfo,
  type RuleResultCustom,
  type RuleResultNotRun,
  type RuleResultError,
  type RuleResultUnknown,
  type Decision,
  type DecisionAllow,
  type DecisionDeny,
  type DecisionBase,
  type RuleWithInput,
  type RuleWithConfig,
  type GuardOptions,
  type LaunchOptions,
  type ArcjetGuard,

  // Rule config types
  type TokenBucketConfig,
  type TokenBucketInput,
  type FixedWindowConfig,
  type FixedWindowInput,
  type SlidingWindowConfig,
  type SlidingWindowInput,
  type DetectPromptInjectionConfig,
  type LocalDetectSensitiveInfoConfig,
  type SensitiveInfoEntityType,
  type LocalCustomConfig,
  type LocalCustomInput,

  // Rule factories
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,

  // Transport-agnostic factory
  launchArcjetWithTransport,

  // Internal
  _launchWithTransportFactory,
} from "./index.ts";

import { _launchWithTransportFactory } from "./index.ts";
import type { LaunchOptions, ArcjetGuard } from "./index.ts";
import { createTransport } from "./transport-node.ts";

/**
 * Create an Arcjet guard client using the Node.js HTTP/2 transport.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard/node";
 *
 * const arcjet = launchArcjet({ key: "ajkey_..." });
 * const limit = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
 * const decision = await arcjet.guard({
 *   label: "tools.weather",
 *   rules: [limit({ key: userId })],
 * });
 * ```
 */
export function launchArcjet(options: LaunchOptions): ArcjetGuard {
  return _launchWithTransportFactory(createTransport, options);
}

export { createTransport } from "./transport-node.ts";
