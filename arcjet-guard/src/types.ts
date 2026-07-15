/**
 * Public SDK types for `@arcjet/guard`.
 *
 * Concrete per-rule discriminated unions. No generics. Each rule kind
 * gets its own `RuleWithConfig*` and `RuleWithInput*` type with a
 * `type` discriminant for narrowing.
 *
 * @packageDocumentation
 */

import type {
  DetectSensitiveInfoFunction,
  SensitiveInfoEntities,
  SensitiveInfoResult,
} from "@arcjet/analyze";

/** The outcome of a guard decision — only `"ALLOW"` or `"DENY"`. */
export type Conclusion = "ALLOW" | "DENY";

/** Broad reason category for a decision or rule result. */
export type Reason =
  | "RATE_LIMIT"
  | "PROMPT_INJECTION"
  | "MODERATE_CONTENT"
  | "SENSITIVE_INFO"
  | "CUSTOM"
  | "ERROR"
  | "NOT_RUN"
  | "UNKNOWN";

/** Rule evaluation mode. */
export type Mode = "LIVE" | "DRY_RUN";

/**
 * A warning means the decision (or a single rule result) was processed
 * correctly — the result is trustworthy — but something should be fixed, e.g.
 * an invalid metadata key that was stripped or an invalid label.
 *
 * Contrast with an errored result ({@link RuleResultError}), which means a rule
 * or the decision _could not_ be processed and the security signal is degraded.
 */
export type Warning = {
  /** Machine-readable code (e.g. `"AJ1100"`). */
  readonly code: string;
  /** Human-readable description. */
  readonly message: string;
};

/**
 * Sensitive information entity types.
 *
 * Custom entity types are not supported in `@arcjet/guard` — use a custom rule
 * instead.
 *
 * The default backend (the bundled WASM analyzer) detects these natively:
 *
 * - `"EMAIL"` — Email addresses
 * - `"PHONE_NUMBER"` — Phone numbers
 * - `"IP_ADDRESS"` — IPv4 and IPv6 addresses
 * - `"CREDIT_CARD_NUMBER"` — Credit/debit card numbers
 *
 * The remaining types are detected only when a {@link SensitiveInfoBackend}
 * that supports them is configured via
 * {@link LocalDetectSensitiveInfoConfigAllow.backend | `backend`}, such as
 * `@arcjet/sensitive-info-rampart`:
 *
 * - `"GIVEN_NAME"` — Given (first) names
 * - `"SURNAME"` — Surnames (last names)
 * - `"SSN"` — US Social Security numbers
 * - `"URL"` — URLs
 * - `"TAX_ID"` — Tax identifiers
 * - `"BANK_ACCOUNT"` — Bank account numbers
 * - `"ROUTING_NUMBER"` — Bank routing numbers
 * - `"GOVERNMENT_ID"` — Government identifiers
 * - `"PASSPORT"` — Passport numbers
 * - `"DRIVERS_LICENSE"` — Driver's license numbers
 * - `"BUILDING_NUMBER"` — Street/building numbers
 * - `"STREET_NAME"` — Street names
 * - `"SECONDARY_ADDRESS"` — Secondary address lines (apartment, suite, etc.)
 * - `"CITY"` — Cities
 * - `"STATE"` — States/regions
 * - `"ZIP_CODE"` — Postal/ZIP codes
 */
export type SensitiveInfoEntityType =
  | "EMAIL"
  | "PHONE_NUMBER"
  | "IP_ADDRESS"
  | "CREDIT_CARD_NUMBER"
  | "GIVEN_NAME"
  | "SURNAME"
  | "SSN"
  | "URL"
  | "TAX_ID"
  | "BANK_ACCOUNT"
  | "ROUTING_NUMBER"
  | "GOVERNMENT_ID"
  | "PASSPORT"
  | "DRIVERS_LICENSE"
  | "BUILDING_NUMBER"
  | "STREET_NAME"
  | "SECONDARY_ADDRESS"
  | "CITY"
  | "STATE"
  | "ZIP_CODE";

/**
 * Logger passed to a {@link SensitiveInfoBackend} via
 * {@link SensitiveInfoBackendContext}.
 *
 * Structurally compatible with the `ArcjetLogger` used by the rest of the
 * Arcjet SDK, so a backend written against `arcjet` (such as
 * `@arcjet/sensitive-info-rampart`) works here unchanged.
 */
export interface SensitiveInfoBackendLogger {
  /** Log at debug level. */
  debug(message: string, ...args: unknown[]): void;
  /** Log at debug level with a merging object. */
  debug(fields: Record<string, unknown>, message?: string, ...args: unknown[]): void;
  /** Log at info level. */
  info(message: string, ...args: unknown[]): void;
  /** Log at info level with a merging object. */
  info(fields: Record<string, unknown>, message?: string, ...args: unknown[]): void;
  /** Log at warn level. */
  warn(message: string, ...args: unknown[]): void;
  /** Log at warn level with a merging object. */
  warn(fields: Record<string, unknown>, message?: string, ...args: unknown[]): void;
  /** Log at error level. */
  error(message: string, ...args: unknown[]): void;
  /** Log at error level with a merging object. */
  error(fields: Record<string, unknown>, message?: string, ...args: unknown[]): void;
}

/**
 * Minimal context passed to a {@link SensitiveInfoBackend}.
 */
export interface SensitiveInfoBackendContext {
  /** Logger. */
  log: SensitiveInfoBackendLogger;
}

/**
 * Per-detection options passed to a {@link SensitiveInfoBackend}.
 *
 * These come from the `localDetectSensitiveInfo` rule configuration. A backend
 * reads the ones it understands and ignores the rest, so the interface stays
 * stable as options are added.
 */
export interface SensitiveInfoBackendOptions {
  /** Number of tokens to pass to `detect`. */
  contextWindowSize?: number | undefined;
  /** Custom detection function (optional). */
  detect?: DetectSensitiveInfoFunction | undefined;
}

/**
 * Experimental: pluggable detection backend for the `localDetectSensitiveInfo`
 * rule.
 *
 * The default backend uses the bundled `@arcjet/analyze` WebAssembly engine,
 * which detects email addresses, phone numbers, IP addresses, and credit card
 * numbers entirely locally. Provide a custom backend — for example
 * `@arcjet/sensitive-info-rampart`, which runs an on-device NER model — to
 * detect additional {@link SensitiveInfoEntityType} values without changing the
 * rest of the rule.
 *
 * This is the same {@link SensitiveInfoBackend} contract used by the
 * `sensitiveInfo` rule in the `arcjet` SDK, so a backend works with both. A
 * backend receives the text to scan together with the configured allow/deny
 * `entities` and must return which detected spans are `allowed` and which are
 * `denied`.
 *
 * Backends may be asynchronous (such as model inference). They run in the
 * request path, so their latency directly affects `.guard()` latency.
 */
export interface SensitiveInfoBackend {
  /**
   * Detect sensitive information in `value`.
   *
   * @param context
   *   Backend context (currently just a logger).
   * @param value
   *   Text to scan.
   * @param entities
   *   Configured allow/deny entities.
   * @param options
   *   Per-detection options from the rule configuration (optional).
   * @returns
   *   Promise for the allowed and denied spans.
   */
  detect(
    context: SensitiveInfoBackendContext,
    value: string,
    entities: SensitiveInfoEntities,
    options?: SensitiveInfoBackendOptions,
  ): Promise<SensitiveInfoResult>;
}

/** Result from a token bucket rate limit evaluation. */
export type RuleResultTokenBucket = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"RATE_LIMIT"` for token bucket rules. */
  readonly reason: "RATE_LIMIT";
  /** Discriminant — always `"TOKEN_BUCKET"`. */
  readonly type: "TOKEN_BUCKET";
  /**
   * Per-rule warnings — this rule was processed correctly (the result is
   * trustworthy) but something about it should be fixed. Informational; never
   * changes the rule's conclusion. Empty until the Decide service emits
   * per-rule diagnostics.
   */
  readonly warnings: readonly Warning[];
  /** Number of tokens remaining in the bucket after this evaluation. */
  readonly remainingTokens: number;
  /** Maximum capacity of the token bucket. */
  readonly maxTokens: number;
  /** Unix timestamp (seconds) when the bucket will next be refilled. */
  readonly resetAtUnixSeconds: number;
  /** Number of tokens added to the bucket each refill interval. */
  readonly refillRate: number;
  /** Duration in seconds between each token refill. */
  readonly refillIntervalSeconds: number;
};

/** Result from a fixed window rate limit evaluation. */
export type RuleResultFixedWindow = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"RATE_LIMIT"` for fixed window rules. */
  readonly reason: "RATE_LIMIT";
  /** Discriminant — always `"FIXED_WINDOW"`. */
  readonly type: "FIXED_WINDOW";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
  /** Number of requests remaining in the current window. */
  readonly remainingRequests: number;
  /** Maximum requests allowed per window. */
  readonly maxRequests: number;
  /** Unix timestamp (seconds) when the current window resets. */
  readonly resetAtUnixSeconds: number;
  /** Duration of each rate limit window in seconds. */
  readonly windowSeconds: number;
};

/** Result from a sliding window rate limit evaluation. */
export type RuleResultSlidingWindow = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"RATE_LIMIT"` for sliding window rules. */
  readonly reason: "RATE_LIMIT";
  /** Discriminant — always `"SLIDING_WINDOW"`. */
  readonly type: "SLIDING_WINDOW";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
  /** Number of requests remaining in the current sliding interval. */
  readonly remainingRequests: number;
  /** Maximum requests allowed per sliding interval. */
  readonly maxRequests: number;
  /** Unix timestamp (seconds) when the sliding interval resets. */
  readonly resetAtUnixSeconds: number;
  /** Duration of the sliding interval in seconds. */
  readonly intervalSeconds: number;
};

/** Result from a prompt injection detection evaluation. */
export type RuleResultPromptInjection = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"PROMPT_INJECTION"` for this rule. */
  readonly reason: "PROMPT_INJECTION";
  /** Discriminant — always `"PROMPT_INJECTION"`. */
  readonly type: "PROMPT_INJECTION";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
};

/**
 * Result from a content moderation evaluation.
 *
 * Experimental — see {@link experimental_moderateContent}.
 */
export type RuleResultModerateContent = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"MODERATE_CONTENT"` for this rule. */
  readonly reason: "MODERATE_CONTENT";
  /** Discriminant — always `"MODERATE_CONTENT"`. */
  readonly type: "MODERATE_CONTENT";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
  /** Whether harmful content was detected in the input text. */
  readonly detected: boolean;
};

/** Result from a sensitive information detection evaluation. */
export type RuleResultSensitiveInfo = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"SENSITIVE_INFO"` for this rule. */
  readonly reason: "SENSITIVE_INFO";
  /** Discriminant — always `"SENSITIVE_INFO"`. */
  readonly type: "SENSITIVE_INFO";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
  /**
   * Entity types detected in the input (e.g. `"EMAIL"`, `"PHONE_NUMBER"`).
   *
   * @example
   * ```ts
   * if (result.detectedEntityTypes.includes("EMAIL")) {
   *   console.log("Email address detected");
   * }
   * ```
   */
  readonly detectedEntityTypes: readonly string[];
};

/** Result from a custom local rule evaluation. */
export type RuleResultCustom<TData extends Record<string, string> = Record<string, string>> = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"CUSTOM"` for custom rules. */
  readonly reason: "CUSTOM";
  /** Discriminant — always `"CUSTOM"`. */
  readonly type: "CUSTOM";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
  /** Key-value data returned by the custom rule's `evaluate` function. */
  readonly data: Readonly<TData>;
};

/** Result for a rule that was not evaluated. */
export type RuleResultNotRun = {
  /** Always `"ALLOW"` — unevaluated rules never deny. */
  readonly conclusion: "ALLOW";
  /** The reason category — always `"NOT_RUN"` for skipped rules. */
  readonly reason: "NOT_RUN";
  /** Discriminant — always `"NOT_RUN"`. */
  readonly type: "NOT_RUN";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
};

/**
 * Result for a rule that encountered an error during evaluation.
 * Errors are fail-open: conclusion is always `"ALLOW"`.
 */
export type RuleResultError = {
  /** Always `"ALLOW"` — errors are fail-open. */
  readonly conclusion: "ALLOW";
  /** The reason category — always `"ERROR"` for errored rules. */
  readonly reason: "ERROR";
  /** Discriminant — always `"RULE_ERROR"`. */
  readonly type: "RULE_ERROR";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
  /** Human-readable error description. */
  readonly message: string;
  /** Machine-readable error code */
  readonly code: string;
};

/** Fallback result for unrecognized rule types. */
export type RuleResultUnknown = {
  /** Whether the request was allowed or denied. */
  readonly conclusion: Conclusion;
  /** The reason category — always `"UNKNOWN"` for unrecognized rules. */
  readonly reason: "UNKNOWN";
  /** Discriminant — always `"UNKNOWN"`. */
  readonly type: "UNKNOWN";
  /** Per-rule warnings. Informational; never changes the conclusion. */
  readonly warnings: readonly Warning[];
};

/** Union of all possible rule result types. */
export type RuleResult =
  | RuleResultTokenBucket
  | RuleResultFixedWindow
  | RuleResultSlidingWindow
  | RuleResultPromptInjection
  | RuleResultModerateContent
  | RuleResultSensitiveInfo
  | RuleResultCustom
  | RuleResultNotRun
  | RuleResultError
  | RuleResultUnknown;

/** Base shape shared by all decisions. */
export type DecisionBase = {
  /** Per-rule results, one per submission, in submission order. */
  readonly results: readonly RuleResult[];
  /** Server-generated unique identifier (TypeID, prefix `"gdec"`). */
  readonly id: string;
  /**
   * Decision-level warnings — diagnostics from request validation (e.g. an
   * invalid metadata key that was stripped). The decision is still valid; these
   * are informational and never change the conclusion.
   */
  readonly warnings: readonly Warning[];
  /**
   * The results that errored — rules (or the decision itself) that _could not
   * be processed_. Empty when nothing errored. Each entry carries a `code` and
   * `message`; correlate one to a specific rule with `rule.result(decision)`.
   */
  errorResults(): readonly RuleResultError[];
  /**
   * True when this decision returned `ALLOW` only because a rule or the
   * decision could not be processed — i.e. it failed open. Gate a fail-closed
   * policy on this: `if (decision.hasFailedOpen()) return deny()`. "Failed open"
   * describes an outcome of _this decision_, not the policy configuration.
   */
  hasFailedOpen(): boolean;
  /**
   * True if there is any warning or any errored rule (the old conflated union).
   *
   * @deprecated Use {@link DecisionBase.warnings} for request diagnostics and
   *   {@link DecisionBase.errorResults} / {@link DecisionBase.hasFailedOpen} for
   *   errors. Removed in the next major.
   */
  hasError(): boolean;
};

/** The request was allowed. */
export type DecisionAllow = DecisionBase & {
  /** The outcome — always `"ALLOW"`. */
  readonly conclusion: "ALLOW";
  /**
   * Always `undefined` for ALLOW decisions. Present so you can safely
   * access `decision.reason` for logging without narrowing first.
   */
  readonly reason?: undefined;
};

/** The request was denied. */
export type DecisionDeny = DecisionBase & {
  /** The outcome — always `"DENY"`. */
  readonly conclusion: "DENY";
  /** Broad reason category for the denial (e.g. `"RATE_LIMIT"`, `"PROMPT_INJECTION"`). */
  readonly reason: Reason;
};

/** A guard decision — either `"ALLOW"` or `"DENY"`. */
export type Decision = DecisionAllow | DecisionDeny;

import type { symbolArcjetInternal } from "./symbol.ts";

/** @internal */
export type InternalResult = RuleResult & {
  readonly [symbolArcjetInternal]: {
    readonly configId: string;
    readonly inputId: string;
  };
};

/** @internal */
export type InternalDecision = Decision & {
  readonly [symbolArcjetInternal]: {
    readonly results: readonly InternalResult[];
  };
};

/** Token bucket rate limiting config. */
export interface TokenBucketConfig {
  /**
   * Evaluation mode. `"LIVE"` enforces the rule; `"DRY_RUN"` evaluates
   * without blocking.
   *
   * @default "LIVE"
   */
  mode?: Mode;
  /**
   * Optional human-readable label for this rule instance.
   * Used for observability and analytics only — **does not affect
   * rate limit bucket identity**. The bucket is determined by the
   * rule config identity and the `key` passed at call time.
   *
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * @example `"api.chat.token-budget"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Can also be passed at call time via {@link TokenBucketInput.metadata}.
   * If both are provided, input-level values take priority on key conflict.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * tokenBucket({
   *   refillRate: 2_000,
   *   intervalSeconds: 3600,
   *   maxTokens: 5_000,
   *   metadata: { tier: "pro", feature: "chat" },
   * })
   * ```
   */
  metadata?: Record<string, string>;
  /**
   * Number of tokens added to the bucket each interval.
   *
   * @example
   * ```ts
   * // Refill 10 tokens every 60 seconds
   * tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 })
   * ```
   */
  refillRate: number;
  /**
   * Duration in seconds between each token refill.
   *
   * @example
   * ```ts
   * // Refill every 30 seconds
   * tokenBucket({ refillRate: 5, intervalSeconds: 30, maxTokens: 50 })
   * ```
   */
  intervalSeconds: number;
  /**
   * Maximum capacity of the token bucket. Tokens beyond this limit
   * are discarded.
   *
   * @example
   * ```ts
   * // Allow bursts of up to 100 tokens
   * tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 })
   * ```
   */
  maxTokens: number;
  /**
   * Bucket identifier for grouping rate limit counters in the dashboard.
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * Different configs sharing the same bucket name still get independent
   * counters — a config hash is appended server-side.
   *
   * @default "default-token-bucket"
   *
   * @example
   * ```ts
   * tokenBucket({ bucket: "user-tokens", refillRate: 10, intervalSeconds: 60, maxTokens: 100 })
   * ```
   */
  bucket?: string;
}

/** Token bucket rate limiting input. */
export interface TokenBucketInput {
  /**
   * Unique key identifying the rate-limited entity (e.g. user ID, IP address).
   *
   * This value is SHA-256 hashed before being sent to the server — the
   * raw key never leaves the client. If you need to correlate requests
   * server-side, pass identifying information via `metadata`.
   *
   * @example
   * ```ts
   * rule({ key: userId, requested: 5 })
   * ```
   */
  key: string;
  /**
   * Number of tokens to consume for this request.
   *
   * @default 1
   */
  requested?: number;
  /**
   * Per-request metadata. Merged with config-level metadata (input wins
   * on key conflict). This is sent per-rule, separate from
   * {@link GuardOptions.metadata} which is sent at the request level.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * const limit = tokenBucket({ refillRate: 2_000, intervalSeconds: 3600, maxTokens: 5_000 });
   * limit({ key: userId, requested: tokenCount, metadata: { model: "gpt-4o" } })
   * ```
   */
  metadata?: Record<string, string>;
}

/** Fixed window rate limiting config. */
export interface FixedWindowConfig {
  /**
   * Evaluation mode. `"LIVE"` enforces the rule; `"DRY_RUN"` evaluates
   * without blocking.
   *
   * @default "LIVE"
   */
  mode?: Mode;
  /**
   * Optional human-readable label for this rule instance.
   * Used for observability and analytics only — **does not affect
   * rate limit bucket identity**. The bucket is determined by the
   * rule config identity and the `key` passed at call time.
   *
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * @example `"api.search.rate-limit"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Can also be passed at call time via {@link FixedWindowInput.metadata}.
   * If both are provided, input-level values take priority on key conflict.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * fixedWindow({
   *   maxRequests: 100,
   *   windowSeconds: 60,
   *   metadata: { plan: "free", route: "/api/search" },
   * })
   * ```
   */
  metadata?: Record<string, string>;
  /**
   * Maximum number of requests allowed per window.
   *
   * @example
   * ```ts
   * // Allow 100 requests per 60-second window
   * fixedWindow({ maxRequests: 100, windowSeconds: 60 })
   * ```
   */
  maxRequests: number;
  /**
   * Duration of each rate limit window in seconds.
   *
   * @example
   * ```ts
   * // 60-second windows
   * fixedWindow({ maxRequests: 100, windowSeconds: 60 })
   * ```
   */
  windowSeconds: number;
  /**
   * Bucket identifier for grouping rate limit counters in the dashboard.
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * Different configs sharing the same bucket name still get independent
   * counters — a config hash is appended server-side.
   *
   * @default "default-fixed-window"
   *
   * @example
   * ```ts
   * fixedWindow({ bucket: "page-views", maxRequests: 100, windowSeconds: 60 })
   * ```
   */
  bucket?: string;
}

/** Fixed window rate limiting input. */
export interface FixedWindowInput {
  /**
   * Unique key identifying the rate-limited entity (e.g. user ID, IP address).
   *
   * This value is SHA-256 hashed before being sent to the server — the
   * raw key never leaves the client. If you need to correlate requests
   * server-side, pass identifying information via `metadata`.
   *
   * @example
   * ```ts
   * rule({ key: userId, requested: 1 })
   * ```
   */
  key: string;
  /**
   * Number of requests to consume for this call.
   *
   * @default 1
   */
  requested?: number;
  /**
   * Per-request metadata. Merged with config-level metadata (input wins
   * on key conflict). This is sent per-rule, separate from
   * {@link GuardOptions.metadata} which is sent at the request level.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * const limit = fixedWindow({ maxRequests: 100, windowSeconds: 60 });
   * limit({ key: apiKey, metadata: { client_ip: ip } })
   * ```
   */
  metadata?: Record<string, string>;
}

/** Sliding window rate limiting config. */
export interface SlidingWindowConfig {
  /**
   * Evaluation mode. `"LIVE"` enforces the rule; `"DRY_RUN"` evaluates
   * without blocking.
   *
   * @default "LIVE"
   */
  mode?: Mode;
  /**
   * Optional human-readable label for this rule instance.
   * Used for observability and analytics only — **does not affect
   * rate limit bucket identity**. The bucket is determined by the
   * rule config identity and the `key` passed at call time.
   *
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * @example `"api.list.rate-limit"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Can also be passed at call time via {@link SlidingWindowInput.metadata}.
   * If both are provided, input-level values take priority on key conflict.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * slidingWindow({
   *   maxRequests: 1_000,
   *   intervalSeconds: 3600,
   *   metadata: { service: "api", region: "us-east" },
   * })
   * ```
   */
  metadata?: Record<string, string>;
  /**
   * Maximum number of requests allowed per sliding interval.
   *
   * @example
   * ```ts
   * // Allow 100 requests per sliding 60-second interval
   * slidingWindow({ maxRequests: 100, intervalSeconds: 60 })
   * ```
   */
  maxRequests: number;
  /**
   * Duration of the sliding interval in seconds.
   *
   * @example
   * ```ts
   * // 60-second sliding interval
   * slidingWindow({ maxRequests: 100, intervalSeconds: 60 })
   * ```
   */
  intervalSeconds: number;
  /**
   * Bucket identifier for grouping rate limit counters in the dashboard.
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * Different configs sharing the same bucket name still get independent
   * counters — a config hash is appended server-side.
   *
   * @default "default-sliding-window"
   *
   * @example
   * ```ts
   * slidingWindow({ bucket: "event-writes", maxRequests: 1_000, intervalSeconds: 3600 })
   * ```
   */
  bucket?: string;
}

/** Sliding window rate limiting input. */
export interface SlidingWindowInput {
  /**
   * Unique key identifying the rate-limited entity (e.g. user ID, IP address).
   *
   * This value is SHA-256 hashed before being sent to the server — the
   * raw key never leaves the client. If you need to correlate requests
   * server-side, pass identifying information via `metadata`.
   *
   * @example
   * ```ts
   * rule({ key: userId, requested: 1 })
   * ```
   */
  key: string;
  /**
   * Number of requests to consume for this call.
   *
   * @default 1
   */
  requested?: number;
  /**
   * Per-request metadata. Merged with config-level metadata (input wins
   * on key conflict). This is sent per-rule, separate from
   * {@link GuardOptions.metadata} which is sent at the request level.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * const limit = slidingWindow({ maxRequests: 1_000, intervalSeconds: 3600 });
   * limit({ key: userId, metadata: { path: "/api/list" } })
   * ```
   */
  metadata?: Record<string, string>;
}

/** Prompt injection detection config. */
export interface DetectPromptInjectionConfig {
  /**
   * Evaluation mode. `"LIVE"` enforces the rule; `"DRY_RUN"` evaluates
   * without blocking.
   *
   * @default "LIVE"
   */
  mode?: Mode;
  /**
   * Optional human-readable label for this rule instance.
   *
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * @example `"chat.prompt-injection"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * detectPromptInjection({
   *   metadata: { assistant_id: "asst_abc", channel: "slack" },
   * })
   * ```
   */
  metadata?: Record<string, string>;
}

/**
 * Content moderation config.
 *
 * Experimental — see {@link experimental_moderateContent}.
 */
export interface ExperimentalModerateContentConfig {
  /**
   * Evaluation mode. `"LIVE"` enforces the rule; `"DRY_RUN"` evaluates
   * without blocking.
   *
   * @default "LIVE"
   */
  mode?: Mode;
  /**
   * Optional human-readable label for this rule instance.
   *
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
   *
   * @example `"chat.moderate-content"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   */
  metadata?: Record<string, string>;
}

/**
 * Prompt injection detection input.
 *
 * Bind it by passing the object to the configured rule. A bare string is
 * accepted as shorthand for `{ inputText }`.
 */
export interface DetectPromptInjectionInput {
  /** The user prompt text to evaluate for prompt injection. */
  inputText: string;
  /**
   * Per-request metadata. Merged with config-level metadata (input wins
   * on key conflict). This is rule-level metadata, distinct from
   * {@link GuardOptions.metadata} which is sent at the request level.
   *
   * Service-side constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * pi({ inputText: userPrompt, metadata: { source: "tool_result" } })
   * ```
   */
  metadata?: Record<string, string>;
}

/**
 * Content moderation input (experimental).
 *
 * Bind it by passing the object to the configured rule. A bare string is
 * accepted as shorthand for `{ inputText }`.
 */
export interface ExperimentalModerateContentInput {
  /** The text to moderate. */
  inputText: string;
  /**
   * Per-request metadata. Merged with config-level metadata (input wins
   * on key conflict). This is rule-level metadata, distinct from
   * {@link GuardOptions.metadata} which is sent at the request level.
   *
   * Service-side constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * moderate({ inputText: userMessage, metadata: { expectedResponse: "pass" } })
   * ```
   */
  metadata?: Record<string, string>;
}

/**
 * Sensitive info detection input.
 *
 * Bind it by passing the object to the configured rule. A bare string is
 * accepted as shorthand for `{ inputText }`.
 */
export interface LocalDetectSensitiveInfoInput {
  /** The input text to scan for sensitive information. */
  inputText: string;
  /**
   * Per-request metadata. Merged with config-level metadata (input wins
   * on key conflict). This is rule-level metadata, distinct from
   * {@link GuardOptions.metadata} which is sent at the request level.
   *
   * Service-side constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * si({ inputText: text, metadata: { destination: "openai" } })
   * ```
   */
  metadata?: Record<string, string>;
}

/**
 * Sensitive info config: allowlist mode.
 *
 * Only the listed entity types are allowed through — everything else
 * detected triggers a denial.
 *
 * @example
 * ```ts
 * // Let emails through, deny everything else
 * localDetectSensitiveInfo({ allow: ["EMAIL"] })
 * ```
 */
export interface LocalDetectSensitiveInfoConfigAllow {
  /**
   * Evaluation mode. `"LIVE"` enforces the rule; `"DRY_RUN"` evaluates
   * without blocking.
   *
   * @default "LIVE"
   */
  mode?: Mode;
  /**
   * Optional human-readable label for this rule instance.
   *
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * @example `"user.profile.form"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * localDetectSensitiveInfo({
   *   allow: ["EMAIL"],
   *   metadata: { form: "contact", step: "submit" },
   * })
   * ```
   */
  metadata?: Record<string, string>;
  /**
   * Entity types to allow through even when detected (allowlist).
   * When set, everything **except** these types triggers a denial.
   *
   * Only built-in entity types are supported. For custom entity
   * detection, use a custom rule instead.
   */
  allow: SensitiveInfoEntityType[];
  deny?: never;
  /**
   * Experimental: detection backend to use (default: bundled WebAssembly
   * engine).
   *
   * Provide an alternative backend such as `@arcjet/sensitive-info-rampart` to
   * detect sensitive information with an on-device model instead of the
   * built-in pattern matching. Types beyond `"EMAIL"`, `"PHONE_NUMBER"`,
   * `"IP_ADDRESS"`, and `"CREDIT_CARD_NUMBER"` are only detected when a backend
   * that supports them is configured. See {@link SensitiveInfoBackend}.
   */
  backend?: SensitiveInfoBackend;
}

/**
 * Sensitive info config: denylist mode.
 *
 * Only the listed entity types trigger a denial — everything else
 * is allowed through.
 *
 * @example
 * ```ts
 * // Only deny credit card numbers
 * localDetectSensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"] })
 * ```
 */
export interface LocalDetectSensitiveInfoConfigDeny {
  /**
   * Evaluation mode. `"LIVE"` enforces the rule; `"DRY_RUN"` evaluates
   * without blocking.
   *
   * @default "LIVE"
   */
  mode?: Mode;
  /**
   * Optional human-readable label for this rule instance.
   *
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * @example `"user.profile.form"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * localDetectSensitiveInfo({
   *   deny: ["CREDIT_CARD_NUMBER"],
   *   metadata: { form: "checkout", step: "payment" },
   * })
   * ```
   */
  metadata?: Record<string, string>;
  allow?: never;
  /**
   * Entity types to explicitly deny when detected (denylist).
   * When set, **only** these entity types trigger a denial.
   *
   * Only built-in entity types are supported. For custom entity
   * detection, use a custom rule instead.
   */
  deny: SensitiveInfoEntityType[];
  /**
   * Experimental: detection backend to use (default: bundled WebAssembly
   * engine).
   *
   * Provide an alternative backend such as `@arcjet/sensitive-info-rampart` to
   * detect sensitive information with an on-device model instead of the
   * built-in pattern matching. Types beyond `"EMAIL"`, `"PHONE_NUMBER"`,
   * `"IP_ADDRESS"`, and `"CREDIT_CARD_NUMBER"` are only detected when a backend
   * that supports them is configured. See {@link SensitiveInfoBackend}.
   */
  backend?: SensitiveInfoBackend;
}

/**
 * Sensitive information detection config.
 *
 * Pass **either** `allow` (allowlist — deny everything except these)
 * **or** `deny` (denylist — allow everything except these), but not
 * both. Omitting both defaults to denying all detected entity types.
 *
 * @example
 * ```ts
 * // Allowlist: let emails through, deny everything else
 * localDetectSensitiveInfo({ allow: ["EMAIL"] })
 *
 * // Denylist: only deny credit card numbers
 * localDetectSensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"] })
 *
 * // Default: deny all detected entity types
 * localDetectSensitiveInfo()
 * ```
 */
export type LocalDetectSensitiveInfoConfig =
  | LocalDetectSensitiveInfoConfigAllow
  | LocalDetectSensitiveInfoConfigDeny
  | {
      mode?: Mode;
      label?: string;
      metadata?: Record<string, string>;
      allow?: never;
      deny?: never;
      /**
       * Experimental: detection backend to use (default: bundled WebAssembly
       * engine).
       *
       * Provide an alternative backend such as `@arcjet/sensitive-info-rampart`
       * to detect sensitive information with an on-device model instead of the
       * built-in pattern matching. See {@link SensitiveInfoBackend}.
       */
      backend?: SensitiveInfoBackend;
    };

/** Result returned by a custom rule's `evaluate` function. */
export interface CustomEvaluateResult<
  TData extends Record<string, string> = Record<string, string>,
> {
  /** Whether the rule allows or denies. */
  conclusion: "ALLOW" | "DENY";
  /** Optional key-value data to include in the result. */
  data?: TData;
}

/**
 * Signature for a custom rule's local evaluation function.
 *
 * Receives the config data and the per-request input data.
 * Can be synchronous or asynchronous.
 */
export type CustomEvaluateFn<
  TConfig extends Record<string, string> = Record<string, string>,
  TInput extends Record<string, string> = Record<string, string>,
  TData extends Record<string, string> = Record<string, string>,
> = (
  config: Readonly<TConfig>,
  input: Readonly<TInput>,
  options: { signal?: AbortSignal },
) => CustomEvaluateResult<TData> | Promise<CustomEvaluateResult<TData>>;

/** Custom local rule config. */
export interface LocalCustomConfig {
  /**
   * Evaluation mode. `"LIVE"` enforces the rule; `"DRY_RUN"` evaluates
   * without blocking.
   *
   * @default "LIVE"
   */
  mode?: Mode;
  /**
   * Optional human-readable label for this rule instance.
   *
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   *
   * @example `"custom.abuse-check"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Can also be passed at call time via {@link LocalCustomInput.metadata}.
   * If both are provided, input-level values take priority on key conflict.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * defineCustomRule({
   *   evaluate: myHandler,
   * })({ data: { ... }, metadata: { ruleVersion: "2", team: "trust-safety" } })
   * ```
   */
  metadata?: Record<string, string>;
  /** Static key-value data passed to the server alongside the rule. */
  data?: Record<string, string>;
  /** Optional local evaluation function. When provided, the SDK runs it locally and sends the result to the server. */
  evaluate?: CustomEvaluateFn;
}

/** Custom local rule input. */
export interface LocalCustomInput {
  /** Key-value data passed to the custom rule's `evaluate` function. */
  data: Record<string, string>;
  /**
   * Per-request metadata. Merged with config-level metadata (input wins
   * on key conflict). This is sent per-rule, separate from
   * {@link GuardOptions.metadata} which is sent at the request level.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * const rule = defineCustomRule({ evaluate: myHandler })({ data: {} });
   * rule({ data: { userInput: text }, metadata: { traceId: traceId } })
   * ```
   */
  metadata?: Record<string, string>;
}

/** A configured token bucket rule. */
export type RuleWithConfigTokenBucket = {
  /** Discriminant — always `"TOKEN_BUCKET"`. */
  readonly type: "TOKEN_BUCKET";
  /** The token bucket configuration for this rule instance. */
  readonly config: TokenBucketConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /** Bind per-request input to produce a `RuleWithInputTokenBucket`. */
  (input: TokenBucketInput): RuleWithInputTokenBucket;
  /** Extract all token bucket results from a decision. */
  results(decision: Decision): RuleResultTokenBucket[];
  /** Return the first token bucket result regardless of conclusion, or `null` if none. */
  result(decision: Decision): RuleResultTokenBucket | null;
  /** Return the first denied token bucket result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultTokenBucket | null;
  /**
   * Return the first errored result for this rule, or `null` if none errored.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A configured fixed window rule. */
export type RuleWithConfigFixedWindow = {
  /** Discriminant — always `"FIXED_WINDOW"`. */
  readonly type: "FIXED_WINDOW";
  /** The fixed window configuration for this rule instance. */
  readonly config: FixedWindowConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /** Bind per-request input to produce a `RuleWithInputFixedWindow`. */
  (input: FixedWindowInput): RuleWithInputFixedWindow;
  /** Extract all fixed window results from a decision. */
  results(decision: Decision): RuleResultFixedWindow[];
  /** Return the first fixed window result regardless of conclusion, or `null` if none. */
  result(decision: Decision): RuleResultFixedWindow | null;
  /** Return the first denied fixed window result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultFixedWindow | null;
  /**
   * Return the first errored result for this rule, or `null` if none errored.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A configured sliding window rule. */
export type RuleWithConfigSlidingWindow = {
  /** Discriminant — always `"SLIDING_WINDOW"`. */
  readonly type: "SLIDING_WINDOW";
  /** The sliding window configuration for this rule instance. */
  readonly config: SlidingWindowConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /** Bind per-request input to produce a `RuleWithInputSlidingWindow`. */
  (input: SlidingWindowInput): RuleWithInputSlidingWindow;
  /** Extract all sliding window results from a decision. */
  results(decision: Decision): RuleResultSlidingWindow[];
  /** Return the first sliding window result regardless of conclusion, or `null` if none. */
  result(decision: Decision): RuleResultSlidingWindow | null;
  /** Return the first denied sliding window result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultSlidingWindow | null;
  /**
   * Return the first errored result for this rule, or `null` if none errored.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A configured prompt injection detection rule. */
export type RuleWithConfigPromptInjection = {
  /** Discriminant — always `"PROMPT_INJECTION"`. */
  readonly type: "PROMPT_INJECTION";
  /** The prompt injection detection configuration for this rule instance. */
  readonly config: DetectPromptInjectionConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /**
   * Bind the prompt injection input to produce a
   * `RuleWithInputPromptInjection`. A bare string is shorthand for
   * `{ inputText }`; pass an object to also attach per-request metadata.
   */
  (input: string | DetectPromptInjectionInput): RuleWithInputPromptInjection;
  /** Extract all prompt injection results from a decision. */
  results(decision: Decision): RuleResultPromptInjection[];
  /** Return the first prompt injection result regardless of conclusion, or `null` if none. */
  result(decision: Decision): RuleResultPromptInjection | null;
  /** Return the first denied prompt injection result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultPromptInjection | null;
  /**
   * Return the first errored result for this rule, or `null` if none errored.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/**
 * A configured content moderation rule.
 *
 * Experimental — see {@link experimental_moderateContent}.
 */
export type RuleWithConfigModerateContent = {
  /** Discriminant — always `"MODERATE_CONTENT"`. */
  readonly type: "MODERATE_CONTENT";
  /** The content moderation configuration for this rule instance. */
  readonly config: ExperimentalModerateContentConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /**
   * Bind the content moderation input to produce a
   * `RuleWithInputModerateContent`. A bare string is shorthand for
   * `{ inputText }`; pass an object to also attach per-request metadata.
   */
  (input: string | ExperimentalModerateContentInput): RuleWithInputModerateContent;
  /** Extract all content moderation results from a decision. */
  results(decision: Decision): RuleResultModerateContent[];
  /** Return the first content moderation result regardless of conclusion, or `null` if none. */
  result(decision: Decision): RuleResultModerateContent | null;
  /** Return the first denied content moderation result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultModerateContent | null;
  /**
   * Return the first errored result for this rule, or `null` if none errored.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A configured sensitive info detection rule. */
export type RuleWithConfigSensitiveInfo = {
  /** Discriminant — always `"SENSITIVE_INFO"`. */
  readonly type: "SENSITIVE_INFO";
  /** The sensitive info detection configuration for this rule instance. */
  readonly config: LocalDetectSensitiveInfoConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /**
   * Bind the sensitive info input to produce a
   * `RuleWithInputSensitiveInfo`. A bare string is shorthand for
   * `{ inputText }`; pass an object to also attach per-request metadata.
   */
  (input: string | LocalDetectSensitiveInfoInput): RuleWithInputSensitiveInfo;
  /** Extract all sensitive info results from a decision. */
  results(decision: Decision): RuleResultSensitiveInfo[];
  /** Return the first sensitive info result regardless of conclusion, or `null` if none. */
  result(decision: Decision): RuleResultSensitiveInfo | null;
  /** Return the first denied sensitive info result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultSensitiveInfo | null;
  /**
   * Return the first errored result for this rule, or `null` if none errored.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A configured custom rule. */
export type RuleWithConfigCustom<
  TData extends Record<string, string> = Record<string, string>,
  TInput extends Record<string, string> = Record<string, string>,
> = {
  /** Discriminant — always `"CUSTOM"`. */
  readonly type: "CUSTOM";
  /** The custom rule configuration for this rule instance. */
  readonly config: LocalCustomConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /** Bind per-request input to produce a `RuleWithInputCustom`. */
  (input: { data: TInput; metadata?: Record<string, string> }): RuleWithInputCustom<TData>;
  /** Extract all custom rule results from a decision. */
  results(decision: Decision): RuleResultCustom<TData>[];
  /** Return the first custom rule result regardless of conclusion, or `null` if none. */
  result(decision: Decision): RuleResultCustom<TData> | null;
  /** Return the first denied custom rule result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultCustom<TData> | null;
  /**
   * Return the first errored result for this rule, or `null` if none errored.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** Union of all configured rule types. */
export type RuleWithConfig =
  | RuleWithConfigTokenBucket
  | RuleWithConfigFixedWindow
  | RuleWithConfigSlidingWindow
  | RuleWithConfigPromptInjection
  | RuleWithConfigModerateContent
  | RuleWithConfigSensitiveInfo
  | RuleWithConfigCustom;

/** A token bucket rule with bound input. */
export type RuleWithInputTokenBucket = {
  /** Discriminant — always `"TOKEN_BUCKET"`. */
  readonly type: "TOKEN_BUCKET";
  /** The token bucket configuration for this rule instance. */
  readonly config: TokenBucketConfig;
  /** The bound per-request input. */
  readonly input: TokenBucketInput;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this submission's results as an array (empty or single-element). */
  results(decision: Decision): RuleResultTokenBucket[];
  /** Find this submission's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultTokenBucket | null;
  /** Find this submission's denied result, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultTokenBucket | null;
  /**
   * Find this submission's errored result, or `null` if it didn't error.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A fixed window rule with bound input. */
export type RuleWithInputFixedWindow = {
  /** Discriminant — always `"FIXED_WINDOW"`. */
  readonly type: "FIXED_WINDOW";
  /** The fixed window configuration for this rule instance. */
  readonly config: FixedWindowConfig;
  /** The bound per-request input. */
  readonly input: FixedWindowInput;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this submission's results as an array (empty or single-element). */
  results(decision: Decision): RuleResultFixedWindow[];
  /** Find this submission's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultFixedWindow | null;
  /** Find this submission's denied result, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultFixedWindow | null;
  /**
   * Find this submission's errored result, or `null` if it didn't error.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A sliding window rule with bound input. */
export type RuleWithInputSlidingWindow = {
  /** Discriminant — always `"SLIDING_WINDOW"`. */
  readonly type: "SLIDING_WINDOW";
  /** The sliding window configuration for this rule instance. */
  readonly config: SlidingWindowConfig;
  /** The bound per-request input. */
  readonly input: SlidingWindowInput;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this submission's results as an array (empty or single-element). */
  results(decision: Decision): RuleResultSlidingWindow[];
  /** Find this submission's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultSlidingWindow | null;
  /** Find this submission's denied result, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultSlidingWindow | null;
  /**
   * Find this submission's errored result, or `null` if it didn't error.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A prompt injection rule with bound input. */
export type RuleWithInputPromptInjection = {
  /** Discriminant — always `"PROMPT_INJECTION"`. */
  readonly type: "PROMPT_INJECTION";
  /** The prompt injection detection configuration for this rule instance. */
  readonly config: DetectPromptInjectionConfig;
  /** The bound prompt injection input. */
  readonly input: DetectPromptInjectionInput;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this submission's results as an array (empty or single-element). */
  results(decision: Decision): RuleResultPromptInjection[];
  /** Find this submission's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultPromptInjection | null;
  /** Find this submission's denied result, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultPromptInjection | null;
  /**
   * Find this submission's errored result, or `null` if it didn't error.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/**
 * A content moderation rule with bound input.
 *
 * Experimental — see {@link experimental_moderateContent}.
 */
export type RuleWithInputModerateContent = {
  /** Discriminant — always `"MODERATE_CONTENT"`. */
  readonly type: "MODERATE_CONTENT";
  /** The content moderation configuration for this rule instance. */
  readonly config: ExperimentalModerateContentConfig;
  /** The bound content moderation input. */
  readonly input: ExperimentalModerateContentInput;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this submission's results as an array (empty or single-element). */
  results(decision: Decision): RuleResultModerateContent[];
  /** Find this submission's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultModerateContent | null;
  /** Find this submission's denied result, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultModerateContent | null;
  /**
   * Find this submission's errored result, or `null` if it didn't error.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A sensitive info rule with bound input. */
export type RuleWithInputSensitiveInfo = {
  /** Discriminant — always `"SENSITIVE_INFO"`. */
  readonly type: "SENSITIVE_INFO";
  /** The sensitive info detection configuration for this rule instance. */
  readonly config: LocalDetectSensitiveInfoConfig;
  /** The bound sensitive info input. */
  readonly input: LocalDetectSensitiveInfoInput;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this submission's results as an array (empty or single-element). */
  results(decision: Decision): RuleResultSensitiveInfo[];
  /** Find this submission's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultSensitiveInfo | null;
  /** Find this submission's denied result, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultSensitiveInfo | null;
  /**
   * Find this submission's errored result, or `null` if it didn't error.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** A custom rule with bound input. */
export type RuleWithInputCustom<TData extends Record<string, string> = Record<string, string>> = {
  /** Discriminant — always `"CUSTOM"`. */
  readonly type: "CUSTOM";
  /** The custom rule configuration for this rule instance. */
  readonly config: LocalCustomConfig;
  /** The bound per-request input data. */
  readonly input: LocalCustomInput;
  /** Optional local evaluation function copied from the config. */
  readonly evaluate?: CustomEvaluateFn;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this submission's results as an array (empty or single-element). */
  results(decision: Decision): RuleResultCustom<TData>[];
  /** Find this submission's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultCustom<TData> | null;
  /** Find this submission's denied result, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultCustom<TData> | null;
  /**
   * Find this submission's errored result, or `null` if it didn't error.
   * Errors are excluded from {@link result}/{@link results}/{@link deniedResult};
   * this is the only accessor that returns them.
   */
  errorResult(decision: Decision): RuleResultError | null;
};

/** Union of all rule-with-input types. */
export type RuleWithInput =
  | RuleWithInputTokenBucket
  | RuleWithInputFixedWindow
  | RuleWithInputSlidingWindow
  | RuleWithInputPromptInjection
  | RuleWithInputModerateContent
  | RuleWithInputSensitiveInfo
  | RuleWithInputCustom;

/** Options for a `.guard()` call. */
export interface GuardOptions {
  /**
   * A label identifying the protection boundary (e.g. `"tools.weather"`).
   *
   * Validated server-side as a slug: lowercase letters, digits, dash
   * (`-`), and dot (`.`) only. Must start and end with a lowercase
   * letter or digit. Max 256 bytes.
   */
  label: string;
  /** The rule submissions to evaluate — at least one is required. */
  rules: RuleWithInput[];
  /**
   * Request-level metadata for correlation and analytics. Sent as a
   * separate field from per-rule metadata — there is no merging or
   * conflict between the two.
   *
   * Constraints:
   * - Max 20 key-value pairs.
   * - Keys: 1–64 bytes, ASCII letters/digits/dash/dot/underscore,
   *   must start with a letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * arcjet.guard({
   *   label: "tools.weather",
   *   rules: [input],
   *   metadata: { request_id: reqId, user_agent: ua },
   * })
   * ```
   */
  metadata?: Record<string, string>;
  /**
   * Optional, caller-supplied opaque identifier used to correlate this guard
   * call with other `guard()` and `protect()` calls that belong to the same
   * workflow, agent run, or multi-step task (for example a web request that
   * kicks off a chain of tool calls).
   *
   * Unlike {@link GuardOptions.metadata}, this is a dedicated, indexable field
   * with a stable name. It does not affect the decision; it is stored alongside
   * the recorded decision so a chain of actions can be reconstructed.
   *
   * Bounded server-side to max 256 bytes of printable ASCII; values that exceed
   * this are dropped, not truncated.
   *
   * @example
   * ```ts
   * arcjet.guard({
   *   label: "tools.weather",
   *   rules: [input],
   *   correlationId: requestId,
   * })
   * ```
   */
  correlationId?: string;
  /** Maximum seconds to wait for the server response. */
  timeoutSeconds?: number;
  /** Cancellation signal. */
  signal?: AbortSignal;
}
