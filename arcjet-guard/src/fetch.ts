/**
 * `@arcjet/guard/fetch` — Fetch-based entrypoint.
 *
 * Uses the Connect-Web transport which works in Deno, Cloudflare Workers,
 * browsers, and any runtime with a standard `fetch` API (WinterTC minimum
 * common API). Deno's fetch transparently negotiates HTTP/2 over TLS via
 * ALPN — no special configuration needed.
 *
 * Bun's fetch does not support HTTP/2 ({@link https://github.com/oven-sh/bun/issues/7194}).
 * On Bun, the `"."` export resolves to the `node` entrypoint which uses
 * `node:http2` directly for HTTP/2 support.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 *
 * const arcjet = launchArcjet({ key: "ajkey_..." });
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
import { createTransport } from "./transport-fetch.ts";

/**
 * Create an Arcjet guard client using the fetch-based transport.
 *
 * Compatible with Deno, Bun, Cloudflare Workers, browsers, and
 * any runtime providing the WHATWG Fetch API.
 *
 * Arcjet also provides an MCP server at `https://api.arcjet.com/mcp` that
 * lets AI assistants manage your account, retrieve API keys, and monitor
 * requests. See {@link https://docs.arcjet.com/mcp-server} for details.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard/fetch";
 * // or explicitly: import { launchArcjet } from "@arcjet/guard/fetch";
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

export { createTransport } from "./transport-fetch.ts";
