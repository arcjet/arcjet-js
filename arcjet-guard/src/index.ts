/**
 * `@arcjet/guard` — Arcjet Guards SDK for JavaScript/TypeScript.
 *
 * Guards provide rate limiting, prompt injection detection, sensitive
 * information detection, and custom rules for AI tool calls and other
 * backend operations.
 *
 * This module is the portable core — it re-exports types and rule
 * factories but does **not** include a transport. Import from
 * `@arcjet/guard/node` or `@arcjet/guard/fetch` for a runtime-specific
 * `launchArcjet()`, or import from the bare `@arcjet/guard` specifier
 * which resolves to the correct transport via conditional exports.
 *
 * @packageDocumentation
 */

import type { Transport } from "@connectrpc/connect";

import { createGuardClient } from "./client.ts";
import type { Decision, GuardOptions } from "./types.ts";
export type {
  Conclusion,
  Reason,
  Mode,
  RuleResult,
  RuleResultTokenBucket,
  RuleResultFixedWindow,
  RuleResultSlidingWindow,
  RuleResultPromptInjection,
  RuleResultSensitiveInfo,
  RuleResultCustom,
  RuleResultNotRun,
  RuleResultError,
  RuleResultUnknown,
  Decision,
  DecisionAllow,
  DecisionDeny,
  DecisionBase,
  RuleWithInput,
  RuleWithConfig,
  RuleWithConfigTokenBucket,
  RuleWithConfigFixedWindow,
  RuleWithConfigSlidingWindow,
  RuleWithConfigPromptInjection,
  RuleWithConfigSensitiveInfo,
  RuleWithConfigCustom,
  RuleWithInputTokenBucket,
  RuleWithInputFixedWindow,
  RuleWithInputSlidingWindow,
  RuleWithInputPromptInjection,
  RuleWithInputSensitiveInfo,
  RuleWithInputCustom,
  TokenBucketConfig,
  TokenBucketInput,
  FixedWindowConfig,
  FixedWindowInput,
  SlidingWindowConfig,
  SlidingWindowInput,
  DetectPromptInjectionConfig,
  LocalDetectSensitiveInfoConfig,
  SensitiveInfoEntityType,
  LocalCustomConfig,
  LocalCustomInput,
  CustomEvaluateResult,
  CustomEvaluateFn,
  GuardOptions,
} from "./types.ts";

export {
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  localDetectSensitiveInfo,
  localCustom,
} from "./rules.ts";
/** Options for `launchArcjet()`. */
export interface LaunchOptions {
  /** Arcjet API key (starts with `"ajkey_"`). */
  key: string;

  /**
   * Not supported in `@arcjet/guard`.
   *
   * Rules are passed per `.guard()` call, not at launch time.
   * See {@link GuardOptions.rules}.
   *
   * @deprecated
   */
  rules?: never;

  /**
   * Not supported in `@arcjet/guard`.
   *
   * `@arcjet/guard` does not have the `characteristics` concept from
   * `@arcjet/node`. Use the `key` field on each rule input instead.
   *
   * @deprecated
   */
  characteristics?: never;

  /**
   * Override the default API base URL (`https://decide.arcjet.com`).
   * @internal
   */
  baseUrl?: string;
}

/** An Arcjet guard client. */
export interface ArcjetGuard {
  /** Evaluate a set of guard rules and return a decision. */
  guard(opts: GuardOptions): Promise<Decision>;
}

/**
 * Create an Arcjet guard client with an explicit Connect transport.
 *
 * @internal Used by `node.ts` and `fetch.ts` to bind the correct transport.
 */
export function launchArcjetWithTransport(
  options: LaunchOptions & { transport: Transport },
): ArcjetGuard {
  const client = createGuardClient({
    key: options.key,
    transport: options.transport,
  });

  return {
    guard(opts: GuardOptions): Promise<Decision> {
      return client.guard(opts);
    },
  };
}

/**
 * Create an Arcjet guard client using a user-supplied transport factory.
 *
 * @internal Used by `node.ts` and `web.ts` to bind the correct transport.
 */
export function _launchWithTransportFactory(
  createTransport: (baseUrl: string) => Transport,
  options: LaunchOptions,
): ArcjetGuard {
  const baseUrl = options.baseUrl ?? "https://decide.arcjet.com";
  const transport = createTransport(baseUrl);
  return launchArcjetWithTransport({ ...options, transport });
}
