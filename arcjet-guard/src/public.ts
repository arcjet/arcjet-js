/**
 * Curated public API surface shared by every `@arcjet/guard` entrypoint.
 *
 * Both the Node.js (`./node.ts`) and fetch (`./fetch.ts`) entrypoints
 * `export *` from this module so the public surface stays identical across
 * runtimes. Only the transport-specific `launchArcjet` and `createTransport`
 * live in the individual entrypoints.
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
  type RuleResultModerateContent,
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
  type ExperimentalModerateContentConfig,
  type LocalDetectSensitiveInfoConfig,
  type SensitiveInfoEntityType,
  type LocalCustomConfig,
  type LocalCustomInput,

  // Rule factories
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  experimental_moderateContent,
  localDetectSensitiveInfo,
  defineCustomRule,

  // Transport-agnostic factory
  launchArcjetWithTransport,

  // Internal
  _launchWithTransportFactory,
} from "./index.ts";
