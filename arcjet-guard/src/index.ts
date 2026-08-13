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
 * // Fail open by default; opt in to fail closed when a rule could not run.
 * if (decision.hasFailedOpen()) {
 *   console.warn("a rule could not be evaluated", decision.errorResults());
 * }
 *
 * // Request diagnostics — the decision is still valid.
 * for (const warning of decision.warnings) {
 *   console.warn(warning.code, warning.message);
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
 * Connect to the Arcjet MCP server at `https://api.arcjet.com/mcp` to manage
 * sites, retrieve SDK keys, and more. Learn more at
 * {@link https://docs.arcjet.com/mcp-server}.
 *
 * @packageDocumentation
 */

import type { Transport } from "@connectrpc/connect";

import { createGuardClient } from "./client.ts";
import {
  symbolArcjetDiagnostics,
  type DiagnosticHandler,
  type DiagnosticLogger,
} from "./diagnostics.ts";
import type { CaptureOptions, Decision, GuardOptions, SensitiveInfoBackend } from "./types.ts";
// The type of `LaunchOptions.logger`, so a consumer can name what they have
// to implement. `ArcjetDiagnostic` is deliberately not exported: it is the
// internal handler payload and appears in no public signature — the logger
// receives `({ code, count? }, message)`.
export type { DiagnosticLogger } from "./diagnostics.ts";
export type {
  ArcjetMetadata,
  Billing,
  Conclusion,
  Reason,
  Mode,
  Warning,
  RuleResult,
  RuleResultTokenBucket,
  RuleResultFixedWindow,
  RuleResultSlidingWindow,
  RuleResultPromptInjection,
  RuleResultModerateContent,
  RuleResultSensitiveInfo,
  RuleResultCustom,
  RuleResultNotRun,
  RuleResultError,
  RuleResultUnknown,
  RuleResultInputConstraint,
  StringMatchOperator,
  PolicyEvaluation,
  PolicyRuleResult,
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
  RuleWithConfigModerateContent,
  RuleWithConfigSensitiveInfo,
  RuleWithConfigCustom,
  RuleWithInputTokenBucket,
  RuleWithInputFixedWindow,
  RuleWithInputSlidingWindow,
  RuleWithInputPromptInjection,
  RuleWithInputModerateContent,
  RuleWithInputSensitiveInfo,
  RuleWithInputCustom,
  TokenBucketConfig,
  TokenBucketInput,
  FixedWindowConfig,
  FixedWindowInput,
  SlidingWindowConfig,
  SlidingWindowInput,
  DetectPromptInjectionConfig,
  DetectPromptInjectionInput,
  ModerateContentConfig,
  ModerateContentInput,
  ExperimentalModerateContentConfig,
  ExperimentalModerateContentInput,
  LocalDetectSensitiveInfoConfig,
  LocalDetectSensitiveInfoInput,
  SensitiveInfoEntityType,
  SensitiveInfoBackend,
  SensitiveInfoBackendContext,
  SensitiveInfoBackendOptions,
  SensitiveInfoBackendLogger,
  LocalCustomConfig,
  LocalCustomInput,
  CustomEvaluateResult,
  CustomEvaluateFn,
  CaptureOptions,
  GuardOptions,
} from "./types.ts";
export { policyInput } from "./policy-input.ts";
export type { PolicyInput, PolicyInputMap } from "./policy-input.ts";

export {
  tokenBucket,
  fixedWindow,
  slidingWindow,
  detectPromptInjection,
  moderateContent,
  localDetectSensitiveInfo,
  defineCustomRule,
} from "./rules.ts";
// oxlint-disable-next-line typescript/no-deprecated -- public deprecated alias
export { experimental_moderateContent } from "./rules.ts";

// Optional registration, and the free calls it enables. Nothing here takes
// effect until an application calls `registerArcjet()` — `launchArcjet()`
// itself touches no global state.
export { registerArcjet, unregisterArcjet, guard, capture, flush } from "./registry.ts";

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

  /**
   * Local sensitive-info backend used to evaluate sensitive-info rules that a
   * remotely configured policy runs on the SDK. Defaults to the built-in
   * detector; supply an alternative (e.g. an on-device model) to change how
   * entities are detected.
   *
   * @example
   * ```ts
   * import { rampart } from "@arcjet/sensitive-info-rampart";
   *
   * const arcjet = launchArcjet({ key, sensitiveInfoBackend: rampart() });
   * ```
   */
  sensitiveInfoBackend?: SensitiveInfoBackend;

  /**
   * Receives every local SDK diagnostic.
   *
   * Without a logger, Arcjet writes one console warning per diagnostic code.
   */
  logger?: DiagnosticLogger;
}

/** An Arcjet guard client. */
export interface ArcjetGuard {
  /** Evaluate a set of guard rules and return a decision. */
  guard(opts: GuardOptions): Promise<Decision>;

  /**
   * Record a fact about what the application did.
   *
   * Capture is best-effort visibility data. This method validates and enqueues
   * synchronously, never throws into application code, and does not imply that
   * the event was durably stored.
   */
  capture(opts: CaptureOptions): void;

  /**
   * Drain buffered capture events within a deadline.
   *
   * The default deadline is one second. Expiry drops and diagnoses the
   * remainder. The client stays usable and repeated calls are safe.
   */
  flush(timeoutMs?: number): Promise<void>;
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
    ...(options.logger === undefined ? {} : { logger: options.logger }),
    ...(options.sensitiveInfoBackend === undefined
      ? {}
      : { sensitiveInfoBackend: options.sensitiveInfoBackend }),
  });

  // The diagnostics channel rides along under a symbol so registration can
  // report a second `registerArcjet()` on the logger this client was launched
  // with. It stays off `ArcjetGuard`, so it is not public API.
  const launched: ArcjetGuard & { [symbolArcjetDiagnostics]: DiagnosticHandler } = {
    guard(opts: GuardOptions): Promise<Decision> {
      return client.guard(opts);
    },
    capture(opts: CaptureOptions): void {
      client.capture(opts);
    },
    flush(timeoutMs?: number): Promise<void> {
      return client.flush(timeoutMs);
    },
    [symbolArcjetDiagnostics]: client[symbolArcjetDiagnostics],
  };

  return launched;
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
