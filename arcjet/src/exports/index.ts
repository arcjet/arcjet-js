/**
 * `arcjet` — everything this entrypoint publishes, named.
 *
 * The modules under `src/` are implementation. They export whatever suits
 * them; only what this file lists reaches anyone who installs the package, so
 * adding to the public API is a deliberate act rather than a side effect.
 *
 * Names it republishes from `@arcjet/protocol` are listed against that package
 * rather than passed through, so nothing arrives here by accident.
 *
 * @packageDocumentation
 */

export { default } from "../index.js";

export {
  detectBot,
  detectPromptInjection,
  experimental_detectPromptInjection,
  filter,
  fixedWindow,
  protectSignup,
  sensitiveInfo,
  shield,
  slidingWindow,
  tokenBucket,
  validateEmail,
} from "../index.js";

export type {
  Arcjet,
  ArcjetAdapterContext,
  ArcjetOptions,
  ArcjetRequest,
  BotOptions,
  BotOptionsAllow,
  BotOptionsDeny,
  CharacteristicProps,
  DetectPromptInjectionOptions,
  EmailOptions,
  EmailOptionsAllow,
  EmailOptionsDeny,
  ExtraProps,
  FilterOptions,
  FilterOptionsAllow,
  FilterOptionsDeny,
  FixedWindowRateLimitOptions,
  Primitive,
  Product,
  ProtectSignupOptions,
  SensitiveInfoBackend,
  SensitiveInfoBackendContext,
  SensitiveInfoBackendOptions,
  SensitiveInfoOptions,
  SensitiveInfoOptionsAllow,
  SensitiveInfoOptionsDeny,
  ShieldOptions,
  SlidingWindowRateLimitOptions,
  TokenBucketRateLimitOptions,
} from "../index.js";

export {
  ArcjetAllowDecision,
  ArcjetBotReason,
  ArcjetChallengeDecision,
  ArcjetDecision,
  ArcjetDenyDecision,
  ArcjetEdgeRuleReason,
  ArcjetEmailReason,
  ArcjetErrorDecision,
  ArcjetErrorReason,
  ArcjetFilterReason,
  ArcjetIpDetails,
  ArcjetPromptInjectionReason,
  ArcjetRateLimitReason,
  ArcjetReason,
  ArcjetRuleResult,
  ArcjetSensitiveInfoReason,
  ArcjetShieldReason,
  botCategories,
} from "@arcjet/protocol";

export type {
  ArcjetBotCategory,
  ArcjetBotRule,
  ArcjetCacheEntry,
  ArcjetConclusion,
  ArcjetContext,
  ArcjetEmailRule,
  ArcjetEmailType,
  ArcjetFilterRule,
  ArcjetFixedWindowRateLimitRule,
  ArcjetIdentifiedEntity,
  ArcjetLogger,
  ArcjetMetadata,
  ArcjetMode,
  ArcjetPromptInjectionDetectionRule,
  ArcjetRateLimitAlgorithm,
  ArcjetRateLimitRule,
  ArcjetRequestDetails,
  ArcjetRule,
  ArcjetRuleState,
  ArcjetSensitiveInfoRule,
  ArcjetSensitiveInfoType,
  ArcjetShieldRule,
  ArcjetSlidingWindowRateLimitRule,
  ArcjetStack,
  ArcjetTokenBucketRateLimitRule,
  ArcjetWellKnownBot,
  categories,
} from "@arcjet/protocol";
