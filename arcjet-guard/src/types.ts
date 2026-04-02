/**
 * Public SDK types for `@arcjet/guard`.
 *
 * Concrete per-rule discriminated unions. No generics. Each rule kind
 * gets its own `RuleWithConfig*` and `RuleWithInput*` type with a
 * `type` discriminant for narrowing.
 *
 * @packageDocumentation
 */

/** The outcome of a guard decision — only `"ALLOW"` or `"DENY"`. */
export type Conclusion = "ALLOW" | "DENY";

/** Broad reason category for a decision or rule result. */
export type Reason =
  | "RATE_LIMIT"
  | "PROMPT_INJECTION"
  | "SENSITIVE_INFO"
  | "CUSTOM"
  | "ERROR"
  | "NOT_RUN"
  | "UNKNOWN";

/** Rule evaluation mode. */
export type Mode = "LIVE" | "DRY_RUN";

/**
 * Built-in sensitive information entity types supported by the WASM
 * analyzer. Custom entity types are not supported in `@arcjet/guard` —
 * use a custom rule instead.
 *
 * - `"EMAIL"` — Email addresses
 * - `"PHONE_NUMBER"` — Phone numbers
 * - `"IP_ADDRESS"` — IPv4 and IPv6 addresses
 * - `"CREDIT_CARD_NUMBER"` — Credit/debit card numbers
 */
export type SensitiveInfoEntityType =
  | "EMAIL"
  | "PHONE_NUMBER"
  | "IP_ADDRESS"
  | "CREDIT_CARD_NUMBER";

/** Result from a token bucket rate limit evaluation. */
export type RuleResultTokenBucket = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"RATE_LIMIT"` for token bucket rules. */
  readonly reason: "RATE_LIMIT";
  /** Discriminant — always `"TOKEN_BUCKET"`. */
  readonly type: "TOKEN_BUCKET";
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
};

/** Result from a sensitive information detection evaluation. */
export type RuleResultSensitiveInfo = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"SENSITIVE_INFO"` for this rule. */
  readonly reason: "SENSITIVE_INFO";
  /** Discriminant — always `"SENSITIVE_INFO"`. */
  readonly type: "SENSITIVE_INFO";
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
export type RuleResultCustom = {
  /** Whether the request was allowed or denied by this rule. */
  readonly conclusion: "ALLOW" | "DENY";
  /** The reason category — always `"CUSTOM"` for custom rules. */
  readonly reason: "CUSTOM";
  /** Discriminant — always `"CUSTOM"`. */
  readonly type: "CUSTOM";
  /** Arbitrary key-value data returned by the custom rule's `evaluate` function. */
  readonly data: Readonly<Record<string, string>>;
};

/** Result for a rule that was not evaluated. */
export type RuleResultNotRun = {
  /** Always `"ALLOW"` — unevaluated rules never deny. */
  readonly conclusion: "ALLOW";
  /** The reason category — always `"NOT_RUN"` for skipped rules. */
  readonly reason: "NOT_RUN";
  /** Discriminant — always `"NOT_RUN"`. */
  readonly type: "NOT_RUN";
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
};

/** Union of all possible rule result types. */
export type RuleResult =
  | RuleResultTokenBucket
  | RuleResultFixedWindow
  | RuleResultSlidingWindow
  | RuleResultPromptInjection
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
  /** True if any rule errored during evaluation (layer 2 helper). */
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
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
   *
   * @example `"chat.prompt-injection"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
   *
   * @example `"user.profile.form"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
   *
   * @example `"user.profile.form"`
   */
  label?: string;
  /**
   * Key-value metadata attached to this rule for analytics.
   *
   * Constraints:
   * - Max 20 key-value pairs per rule submission (combined config + input).
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
    };

/** Result returned by a custom rule's `evaluate` function. */
export interface CustomEvaluateResult {
  /** Whether the rule allows or denies. */
  conclusion: "ALLOW" | "DENY";
  /** Optional arbitrary key-value data to include in the result. */
  data?: Record<string, string>;
}

/**
 * Signature for a custom rule's local evaluation function.
 *
 * Receives the config data and the per-request input data.
 * Can be synchronous or asynchronous.
 */
export type CustomEvaluateFn = (
  config: Readonly<Record<string, string>>,
  input: Readonly<Record<string, string>>,
) => CustomEvaluateResult | Promise<CustomEvaluateResult>;

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
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * localCustom({
   *   evaluate: myHandler,
   *   metadata: { rule_version: "2", team: "trust-safety" },
   * })
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
   * - Values: max 512 bytes.
   *
   * @example
   * ```ts
   * const rule = localCustom({ evaluate: myHandler });
   * rule({ data: { user_input: text }, metadata: { trace_id: traceId } })
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
  /** Return the first denied token bucket result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultTokenBucket | null;
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
  /** Return the first denied fixed window result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultFixedWindow | null;
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
  /** Return the first denied sliding window result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultSlidingWindow | null;
};

/** A configured prompt injection detection rule. */
export type RuleWithConfigPromptInjection = {
  /** Discriminant — always `"PROMPT_INJECTION"`. */
  readonly type: "PROMPT_INJECTION";
  /** The prompt injection detection configuration for this rule instance. */
  readonly config: DetectPromptInjectionConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /** Bind the user prompt text to produce a `RuleWithInputPromptInjection`. */
  (input: string): RuleWithInputPromptInjection;
  /** Extract all prompt injection results from a decision. */
  results(decision: Decision): RuleResultPromptInjection[];
  /** Return the first denied prompt injection result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultPromptInjection | null;
};

/** A configured sensitive info detection rule. */
export type RuleWithConfigSensitiveInfo = {
  /** Discriminant — always `"SENSITIVE_INFO"`. */
  readonly type: "SENSITIVE_INFO";
  /** The sensitive info detection configuration for this rule instance. */
  readonly config: LocalDetectSensitiveInfoConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /** Bind the input text to produce a `RuleWithInputSensitiveInfo`. */
  (input: string): RuleWithInputSensitiveInfo;
  /** Extract all sensitive info results from a decision. */
  results(decision: Decision): RuleResultSensitiveInfo[];
  /** Return the first denied sensitive info result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultSensitiveInfo | null;
};

/** A configured custom rule. */
export type RuleWithConfigCustom = {
  /** Discriminant — always `"CUSTOM"`. */
  readonly type: "CUSTOM";
  /** The custom rule configuration for this rule instance. */
  readonly config: LocalCustomConfig;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string };
  /** Bind per-request input to produce a `RuleWithInputCustom`. */
  (input: LocalCustomInput): RuleWithInputCustom;
  /** Extract all custom rule results from a decision. */
  results(decision: Decision): RuleResultCustom[];
  /** Return the first denied custom rule result, or `null` if none. */
  deniedResult(decision: Decision): RuleResultCustom | null;
};

/** Union of all configured rule types. */
export type RuleWithConfig =
  | RuleWithConfigTokenBucket
  | RuleWithConfigFixedWindow
  | RuleWithConfigSlidingWindow
  | RuleWithConfigPromptInjection
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
  /** Find this rule's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultTokenBucket | null;
  /** Find this rule's denied result in a decision, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultTokenBucket | null;
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
  /** Find this rule's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultFixedWindow | null;
  /** Find this rule's denied result in a decision, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultFixedWindow | null;
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
  /** Find this rule's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultSlidingWindow | null;
  /** Find this rule's denied result in a decision, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultSlidingWindow | null;
};

/** A prompt injection rule with bound input. */
export type RuleWithInputPromptInjection = {
  /** Discriminant — always `"PROMPT_INJECTION"`. */
  readonly type: "PROMPT_INJECTION";
  /** The prompt injection detection configuration for this rule instance. */
  readonly config: DetectPromptInjectionConfig;
  /** The bound user prompt text. */
  readonly input: string;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this rule's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultPromptInjection | null;
  /** Find this rule's denied result in a decision, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultPromptInjection | null;
};

/** A sensitive info rule with bound input. */
export type RuleWithInputSensitiveInfo = {
  /** Discriminant — always `"SENSITIVE_INFO"`. */
  readonly type: "SENSITIVE_INFO";
  /** The sensitive info detection configuration for this rule instance. */
  readonly config: LocalDetectSensitiveInfoConfig;
  /** The bound input text to scan. */
  readonly input: string;
  /** @internal */
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  /** Find this rule's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultSensitiveInfo | null;
  /** Find this rule's denied result in a decision, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultSensitiveInfo | null;
};

/** A custom rule with bound input. */
export type RuleWithInputCustom = {
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
  /** Find this rule's result in a decision, or `null` if not present. */
  result(decision: Decision): RuleResultCustom | null;
  /** Find this rule's denied result in a decision, or `null` if not denied. */
  deniedResult(decision: Decision): RuleResultCustom | null;
};

/** Union of all rule-with-input types. */
export type RuleWithInput =
  | RuleWithInputTokenBucket
  | RuleWithInputFixedWindow
  | RuleWithInputSlidingWindow
  | RuleWithInputPromptInjection
  | RuleWithInputSensitiveInfo
  | RuleWithInputCustom;

/** Options for a `.guard()` call. */
export interface GuardOptions {
  /**
   * A label identifying the protection boundary (e.g. `"tools.weather"`).
   *
   * Must contain only ASCII letters, digits, hyphens, underscores,
   * dots, and forward slashes. Maximum 256 characters.
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
   * - Keys: 1–64 bytes, lowercase letters/digits/dash/dot/underscore,
   *   must start with a lowercase letter or digit.
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
  /** Maximum seconds to wait for the server response. */
  timeoutSeconds?: number;
  /** Cancellation signal. */
  signal?: AbortSignal;
}
