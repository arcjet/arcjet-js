/**
 * `@arcjet/guard` — Arcjet Guards SDK for JavaScript/TypeScript.
 *
 * Guards provide rate limiting, prompt injection detection, sensitive
 * information detection, and custom rules for AI tool calls and other
 * backend operations.
 *
 * Import everything from the root specifier — the correct transport
 * is selected automatically via conditional exports (HTTP/2 on Node.js
 * and Bun, fetch-based on Deno, Cloudflare Workers, and browsers).
 *
 * **Lifecycle:** Create the client and rule configs once at module
 * scope. Only rule *inputs* are created per request.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket, detectPromptInjection } from "@arcjet/guard";
 *
 * // Create the client once at module scope
 * const arcjet = launchArcjet({ key: "ajkey_..." });
 *
 * // Configure reusable rules (also at module scope)
 * const limitRule = tokenBucket({ bucket: "user-tokens", refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
 * const piRule = detectPromptInjection();
 *
 * // Per request — create rule inputs each time
 * const rl = limitRule({ key: userId, requested: tokenCount });
 * const decision = await arcjet.guard({
 *   label: "tools.weather",
 *   rules: [rl, piRule(userMessage)],
 * });
 *
 * // Overall decision
 * if (decision.conclusion === "DENY") {
 *   console.log(decision.reason); // "RATE_LIMIT", "PROMPT_INJECTION", etc.
 * }
 *
 * // Check for errors (fail-open — errors don't cause denials)
 * if (decision.hasError()) {
 *   console.warn("At least one rule errored");
 * }
 *
 * // Per-rule results
 * for (const result of decision.results) {
 *   console.log(result.type, result.conclusion);
 * }
 *
 * // From a RuleWithInput — result for this specific submission
 * const r = rl.result(decision);
 * if (r) {
 *   console.log(r.remainingTokens, r.maxTokens);
 * }
 *
 * // From a RuleWithConfig — first denied result across all submissions
 * const denied = limitRule.deniedResult(decision);
 * if (denied) {
 *   console.log(denied.remainingTokens); // 0
 * }
 * ```
 *
 * Unlike some other `@arcjet/*` packages, `@arcjet/guard` never reads
 * environment variables directly. All configuration must be passed
 * explicitly via `launchArcjet()` options, `.guard()`, or rule inputs.
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

/**
 * Options for `launchArcjet()`.
 *
 * The client returned by `launchArcjet()` should be created **once** at
 * module scope and reused across requests. On Node.js it holds a
 * persistent HTTP/2 connection; on fetch runtimes it caches the
 * transport configuration. Creating a new client per request wastes
 * these resources.
 */
export interface LaunchOptions {
  /** Arcjet key (starts with `"ajkey_"`). */
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
