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

/** Result from a token bucket rate limit evaluation. */
export type RuleResultTokenBucket = {
  readonly conclusion: "ALLOW" | "DENY";
  readonly reason: "RATE_LIMIT";
  readonly type: "TOKEN_BUCKET";
  readonly remainingTokens: number;
  readonly maxTokens: number;
  readonly resetAtUnixSeconds: number;
  readonly refillRate: number;
  readonly refillIntervalSeconds: number;
};

/** Result from a fixed window rate limit evaluation. */
export type RuleResultFixedWindow = {
  readonly conclusion: "ALLOW" | "DENY";
  readonly reason: "RATE_LIMIT";
  readonly type: "FIXED_WINDOW";
  readonly remainingRequests: number;
  readonly maxRequests: number;
  readonly resetAtUnixSeconds: number;
  readonly windowSeconds: number;
};

/** Result from a sliding window rate limit evaluation. */
export type RuleResultSlidingWindow = {
  readonly conclusion: "ALLOW" | "DENY";
  readonly reason: "RATE_LIMIT";
  readonly type: "SLIDING_WINDOW";
  readonly remainingRequests: number;
  readonly maxRequests: number;
  readonly resetAtUnixSeconds: number;
  readonly intervalSeconds: number;
};

/** Result from a prompt injection detection evaluation. */
export type RuleResultPromptInjection = {
  readonly conclusion: "ALLOW" | "DENY";
  readonly reason: "PROMPT_INJECTION";
  readonly type: "PROMPT_INJECTION";
};

/** Result from a sensitive information detection evaluation. */
export type RuleResultSensitiveInfo = {
  readonly conclusion: "ALLOW" | "DENY";
  readonly reason: "SENSITIVE_INFO";
  readonly type: "SENSITIVE_INFO";
  readonly detectedEntityTypes: readonly string[];
};

/** Result from a custom local rule evaluation. */
export type RuleResultCustom = {
  readonly conclusion: "ALLOW" | "DENY";
  readonly reason: "CUSTOM";
  readonly type: "CUSTOM";
  readonly data: Readonly<Record<string, string>>;
};

/** Result for a rule that was not evaluated. */
export type RuleResultNotRun = {
  readonly conclusion: "ALLOW";
  readonly reason: "NOT_RUN";
  readonly type: "NOT_RUN";
};

/**
 * Result for a rule that encountered an error during evaluation.
 * Errors are fail-open: conclusion is always `"ALLOW"`.
 */
export type RuleResultError = {
  readonly conclusion: "ALLOW";
  readonly reason: "ERROR";
  readonly type: "RULE_ERROR";
  readonly message: string;
  readonly code: string;
};

/** Fallback result for unrecognized rule types. */
export type RuleResultUnknown = {
  readonly conclusion: Conclusion;
  readonly reason: "UNKNOWN";
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
  readonly conclusion: "ALLOW";
};

/** The request was denied. */
export type DecisionDeny = DecisionBase & {
  readonly conclusion: "DENY";
  /** Broad reason category for the denial. */
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
  mode?: Mode;
  label?: string;
  metadata?: Record<string, string>;
  refillRate: number;
  intervalSeconds: number;
  maxTokens: number;
}

/** Token bucket rate limiting input. */
export interface TokenBucketInput {
  key: string;
  requested?: number;
}

/** Fixed window rate limiting config. */
export interface FixedWindowConfig {
  mode?: Mode;
  label?: string;
  metadata?: Record<string, string>;
  maxRequests: number;
  windowSeconds: number;
}

/** Fixed window rate limiting input. */
export interface FixedWindowInput {
  key: string;
  requested?: number;
}

/** Sliding window rate limiting config. */
export interface SlidingWindowConfig {
  mode?: Mode;
  label?: string;
  metadata?: Record<string, string>;
  maxRequests: number;
  intervalSeconds: number;
}

/** Sliding window rate limiting input. */
export interface SlidingWindowInput {
  key: string;
  requested?: number;
}

/** Prompt injection detection config. */
export interface DetectPromptInjectionConfig {
  mode?: Mode;
  label?: string;
  metadata?: Record<string, string>;
}

/** Sensitive information detection config. */
export interface LocalDetectSensitiveInfoConfig {
  mode?: Mode;
  label?: string;
  metadata?: Record<string, string>;
  allow?: string[];
  deny?: string[];
}

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
  mode?: Mode;
  label?: string;
  metadata?: Record<string, string>;
  data?: Record<string, string>;
  /** Optional local evaluation function. When provided, the SDK runs it locally and sends the result to the server. */
  evaluate?: CustomEvaluateFn;
}

/** Custom local rule input. */
export interface LocalCustomInput {
  data: Record<string, string>;
}

/** A configured token bucket rule. */
export type RuleWithConfigTokenBucket = {
  readonly type: "TOKEN_BUCKET";
  readonly config: TokenBucketConfig;
  readonly [symbolArcjetInternal]: { readonly configId: string };
  (input: TokenBucketInput): RuleWithInputTokenBucket;
  results(decision: Decision): RuleResultTokenBucket[];
  deniedResult(decision: Decision): RuleResultTokenBucket | null;
};

/** A configured fixed window rule. */
export type RuleWithConfigFixedWindow = {
  readonly type: "FIXED_WINDOW";
  readonly config: FixedWindowConfig;
  readonly [symbolArcjetInternal]: { readonly configId: string };
  (input: FixedWindowInput): RuleWithInputFixedWindow;
  results(decision: Decision): RuleResultFixedWindow[];
  deniedResult(decision: Decision): RuleResultFixedWindow | null;
};

/** A configured sliding window rule. */
export type RuleWithConfigSlidingWindow = {
  readonly type: "SLIDING_WINDOW";
  readonly config: SlidingWindowConfig;
  readonly [symbolArcjetInternal]: { readonly configId: string };
  (input: SlidingWindowInput): RuleWithInputSlidingWindow;
  results(decision: Decision): RuleResultSlidingWindow[];
  deniedResult(decision: Decision): RuleResultSlidingWindow | null;
};

/** A configured prompt injection detection rule. */
export type RuleWithConfigPromptInjection = {
  readonly type: "PROMPT_INJECTION";
  readonly config: DetectPromptInjectionConfig;
  readonly [symbolArcjetInternal]: { readonly configId: string };
  (input: string): RuleWithInputPromptInjection;
  results(decision: Decision): RuleResultPromptInjection[];
  deniedResult(decision: Decision): RuleResultPromptInjection | null;
};

/** A configured sensitive info detection rule. */
export type RuleWithConfigSensitiveInfo = {
  readonly type: "SENSITIVE_INFO";
  readonly config: LocalDetectSensitiveInfoConfig;
  readonly [symbolArcjetInternal]: { readonly configId: string };
  (input: string): RuleWithInputSensitiveInfo;
  results(decision: Decision): RuleResultSensitiveInfo[];
  deniedResult(decision: Decision): RuleResultSensitiveInfo | null;
};

/** A configured custom rule. */
export type RuleWithConfigCustom = {
  readonly type: "CUSTOM";
  readonly config: LocalCustomConfig;
  readonly [symbolArcjetInternal]: { readonly configId: string };
  (input: LocalCustomInput): RuleWithInputCustom;
  results(decision: Decision): RuleResultCustom[];
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
  readonly type: "TOKEN_BUCKET";
  readonly config: TokenBucketConfig;
  readonly input: TokenBucketInput;
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  result(decision: Decision): RuleResultTokenBucket | null;
  deniedResult(decision: Decision): RuleResultTokenBucket | null;
};

/** A fixed window rule with bound input. */
export type RuleWithInputFixedWindow = {
  readonly type: "FIXED_WINDOW";
  readonly config: FixedWindowConfig;
  readonly input: FixedWindowInput;
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  result(decision: Decision): RuleResultFixedWindow | null;
  deniedResult(decision: Decision): RuleResultFixedWindow | null;
};

/** A sliding window rule with bound input. */
export type RuleWithInputSlidingWindow = {
  readonly type: "SLIDING_WINDOW";
  readonly config: SlidingWindowConfig;
  readonly input: SlidingWindowInput;
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  result(decision: Decision): RuleResultSlidingWindow | null;
  deniedResult(decision: Decision): RuleResultSlidingWindow | null;
};

/** A prompt injection rule with bound input. */
export type RuleWithInputPromptInjection = {
  readonly type: "PROMPT_INJECTION";
  readonly config: DetectPromptInjectionConfig;
  readonly input: string;
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  result(decision: Decision): RuleResultPromptInjection | null;
  deniedResult(decision: Decision): RuleResultPromptInjection | null;
};

/** A sensitive info rule with bound input. */
export type RuleWithInputSensitiveInfo = {
  readonly type: "SENSITIVE_INFO";
  readonly config: LocalDetectSensitiveInfoConfig;
  readonly input: string;
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  result(decision: Decision): RuleResultSensitiveInfo | null;
  deniedResult(decision: Decision): RuleResultSensitiveInfo | null;
};

/** A custom rule with bound input. */
export type RuleWithInputCustom = {
  readonly type: "CUSTOM";
  readonly config: LocalCustomConfig;
  readonly input: LocalCustomInput;
  readonly evaluate?: CustomEvaluateFn;
  readonly [symbolArcjetInternal]: { readonly configId: string; readonly inputId: string };
  result(decision: Decision): RuleResultCustom | null;
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
  /** A label identifying the protection boundary (e.g. `"tools.weather"`). */
  label: string;
  /** The rule submissions to evaluate — at least one is required. */
  rules: RuleWithInput[];
  /** Arbitrary key-value metadata for customer correlation and analytics. */
  metadata?: Record<string, string>;
  /** Maximum seconds to wait for the server response. */
  timeoutSeconds?: number;
  /** Cancellation signal. */
  signal?: AbortSignal;
}
