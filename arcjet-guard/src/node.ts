/**
 * `@arcjet/guard/node` — Node.js entrypoint.
 *
 * Uses HTTP/2 via `@connectrpc/connect-node` for optimal performance
 * with long-lived connections and optimistic pre-connect.
 *
 * **Lifecycle:** Create the client once at module scope and reuse it.
 * The underlying HTTP/2 transport maintains a persistent connection;
 * creating a new client per request wastes that connection.
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
  defineCustomRule,

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
 * Connect to the Arcjet MCP server at `https://api.arcjet.com/mcp` to manage
 * sites, retrieve SDK keys, and more. Learn more at
 * {@link https://docs.arcjet.com/mcp-server}.
 *
 * **Create once, reuse everywhere.** The returned client holds a
 * persistent HTTP/2 connection that is optimistically pre-connected.
 * Wrapping this in a function that creates a new client per request
 * defeats connection reuse and adds latency.
 *
 * Three lifetimes to keep in mind:
 * 1. **Client** (`launchArcjet`) — create once at module scope.
 * 2. **Rule config** (`tokenBucket(...)`) — create once at module scope (recommended).
 * 3. **Rule input** (`limitRule({ key })`) — create per request / tool call.
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
 */
export function launchArcjet(options: LaunchOptions): ArcjetGuard {
  return _launchWithTransportFactory(createTransport, options);
}

export { createTransport } from "./transport-node.ts";
