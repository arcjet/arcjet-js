/**
 * Rule factory functions for `@arcjet/guard`.
 *
 * Each exported function creates a concrete `RuleWithConfig*` type.
 * Calling the returned value with input produces the corresponding
 * `RuleWithInput*` ready for `.guard()`.
 *
 * @packageDocumentation
 */

import { symbolArcjetInternal } from "./symbol.ts";
import type {
  Decision,
  InternalDecision,
  InternalResult,
  RuleResult,
  RuleResultCustom,
  RuleResultFixedWindow,
  RuleResultPromptInjection,
  RuleResultSensitiveInfo,
  RuleResultSlidingWindow,
  RuleResultTokenBucket,
  TokenBucketConfig,
  TokenBucketInput,
  FixedWindowConfig,
  FixedWindowInput,
  SlidingWindowConfig,
  SlidingWindowInput,
  DetectPromptInjectionConfig,
  LocalDetectSensitiveInfoConfig,
  LocalCustomConfig,
  LocalCustomInput,
  RuleWithConfigTokenBucket,
  RuleWithInputTokenBucket,
  RuleWithConfigFixedWindow,
  RuleWithInputFixedWindow,
  RuleWithConfigSlidingWindow,
  RuleWithInputSlidingWindow,
  RuleWithConfigPromptInjection,
  RuleWithInputPromptInjection,
  RuleWithConfigSensitiveInfo,
  RuleWithInputSensitiveInfo,
  RuleWithConfigCustom,
  RuleWithInputCustom,
} from "./types.ts";

/** Generate a random opaque identifier. */
function randomId(): string {
  return crypto.randomUUID();
}

/** Type guard for decisions carrying internal correlation data. */
function isInternalDecision(d: Decision): d is InternalDecision {
  return symbolArcjetInternal in d;
}

/** Extract internal results from a decision (empty array if absent). */
function getInternalResults(decision: Decision): readonly InternalResult[] {
  return isInternalDecision(decision) ? decision[symbolArcjetInternal].results : [];
}

/** Find a single result matching the given correlation IDs. */
function findResult<T extends RuleResult>(
  decision: Decision,
  configId: string,
  inputId: string,
): T | null {
  const match = getInternalResults(decision).find(
    (r) =>
      r[symbolArcjetInternal].configId === configId && r[symbolArcjetInternal].inputId === inputId,
  );
  if (!match) return null;
  const result: unknown = match;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- server result matched by correlation IDs
  return result as T;
}

/** Find all results for a given configId. */
function findResults<T extends RuleResult>(decision: Decision, configId: string): T[] {
  return getInternalResults(decision)
    .filter((r) => r[symbolArcjetInternal].configId === configId)
    .map((r): T => {
      const result: unknown = r;
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- server results matched by configId
      return result as T;
    });
}

/** Find the first denied result for a given configId. */
function findDeniedResult<T extends RuleResult>(decision: Decision, configId: string): T | null {
  return findResults<T>(decision, configId).find((r) => r.conclusion === "DENY") ?? null;
}

/**
 * Create a token bucket rate limiting rule.
 *
 * Use this when requests have variable cost — for example, an LLM
 * endpoint where each call consumes a different number of tokens.
 * The bucket refills at a steady rate and allows bursts up to
 * `maxTokens`, so users can spend tokens quickly but are throttled
 * once the bucket drains.
 *
 * Returns a configured rule that can be called with per-request input
 * (key + optional requested token count) to produce a `RuleWithInput`
 * ready for `.guard()`.
 *
 * @example
 * ```ts
 * const limit = tokenBucket({ bucket: "user-tokens", refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
 * const decision = await arcjet.guard({
 *   label: "api.chat",
 *   rules: [limit({ key: userId })],
 * });
 * ```
 */
export function tokenBucket(config: TokenBucketConfig): RuleWithConfigTokenBucket {
  const configId = randomId();

  const rule = Object.assign(
    (input: TokenBucketInput): RuleWithInputTokenBucket => {
      const inputId = randomId();
      return {
        type: "TOKEN_BUCKET" as const,
        config,
        input,
        [symbolArcjetInternal]: { configId, inputId },
        result(decision: Decision): RuleResultTokenBucket | null {
          return findResult<RuleResultTokenBucket>(decision, configId, inputId);
        },
        deniedResult(decision: Decision): RuleResultTokenBucket | null {
          const r = findResult<RuleResultTokenBucket>(decision, configId, inputId);
          return r !== null && r.conclusion === "DENY" ? r : null;
        },
        results(decision: Decision): RuleResultTokenBucket[] {
          const r = findResult<RuleResultTokenBucket>(decision, configId, inputId);
          return r === null ? [] : [r];
        },
      };
    },
    {
      type: "TOKEN_BUCKET" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultTokenBucket[] {
        return findResults<RuleResultTokenBucket>(decision, configId);
      },
      result(decision: Decision): RuleResultTokenBucket | null {
        return findResults<RuleResultTokenBucket>(decision, configId)[0] ?? null;
      },
      deniedResult(decision: Decision): RuleResultTokenBucket | null {
        return findDeniedResult<RuleResultTokenBucket>(decision, configId);
      },
    },
  );

  return rule;
}

/**
 * Create a fixed window rate limiting rule.
 *
 * Use this when you need a hard cap per time period — for example,
 * "100 requests per hour". The counter resets to zero at the end of
 * each window. Simple to reason about, but allows bursts at window
 * boundaries (a user could make 100 requests at 11:59 and 100 more
 * at 12:00). If that matters, use {@link slidingWindow} instead.
 *
 * Returns a configured rule that can be called with per-request input
 * (key + optional requested count) to produce a `RuleWithInput`
 * ready for `.guard()`.
 *
 * @example
 * ```ts
 * const limit = fixedWindow({ bucket: "page-views", maxRequests: 1000, windowSeconds: 3600 });
 * const decision = await arcjet.guard({
 *   label: "api.search",
 *   rules: [limit({ key: teamId })],
 * });
 * ```
 */
export function fixedWindow(config: FixedWindowConfig): RuleWithConfigFixedWindow {
  const configId = randomId();

  const rule = Object.assign(
    (input: FixedWindowInput): RuleWithInputFixedWindow => {
      const inputId = randomId();
      return {
        type: "FIXED_WINDOW" as const,
        config,
        input,
        [symbolArcjetInternal]: { configId, inputId },
        result(decision: Decision): RuleResultFixedWindow | null {
          return findResult<RuleResultFixedWindow>(decision, configId, inputId);
        },
        deniedResult(decision: Decision): RuleResultFixedWindow | null {
          const r = findResult<RuleResultFixedWindow>(decision, configId, inputId);
          return r !== null && r.conclusion === "DENY" ? r : null;
        },
        results(decision: Decision): RuleResultFixedWindow[] {
          const r = findResult<RuleResultFixedWindow>(decision, configId, inputId);
          return r === null ? [] : [r];
        },
      };
    },
    {
      type: "FIXED_WINDOW" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultFixedWindow[] {
        return findResults<RuleResultFixedWindow>(decision, configId);
      },
      result(decision: Decision): RuleResultFixedWindow | null {
        return findResults<RuleResultFixedWindow>(decision, configId)[0] ?? null;
      },
      deniedResult(decision: Decision): RuleResultFixedWindow | null {
        return findDeniedResult<RuleResultFixedWindow>(decision, configId);
      },
    },
  );

  return rule;
}

/**
 * Create a sliding window rate limiting rule.
 *
 * Use this when you need smooth rate limiting without the burst-at-boundary
 * problem of fixed windows. The server interpolates between the previous
 * and current window, so "100 requests per hour" is enforced across
 * any rolling 60-minute span. Good default choice for API rate limits.
 *
 * Returns a configured rule that can be called with per-request input
 * (key + optional requested count) to produce a `RuleWithInput`
 * ready for `.guard()`.
 *
 * @example
 * ```ts
 * const limit = slidingWindow({ bucket: "event-writes", maxRequests: 500, intervalSeconds: 60 });
 * const decision = await arcjet.guard({
 *   label: "api.events",
 *   rules: [limit({ key: userId })],
 * });
 * ```
 */
export function slidingWindow(config: SlidingWindowConfig): RuleWithConfigSlidingWindow {
  const configId = randomId();

  const rule = Object.assign(
    (input: SlidingWindowInput): RuleWithInputSlidingWindow => {
      const inputId = randomId();
      return {
        type: "SLIDING_WINDOW" as const,
        config,
        input,
        [symbolArcjetInternal]: { configId, inputId },
        result(decision: Decision): RuleResultSlidingWindow | null {
          return findResult<RuleResultSlidingWindow>(decision, configId, inputId);
        },
        deniedResult(decision: Decision): RuleResultSlidingWindow | null {
          const r = findResult<RuleResultSlidingWindow>(decision, configId, inputId);
          return r !== null && r.conclusion === "DENY" ? r : null;
        },
        results(decision: Decision): RuleResultSlidingWindow[] {
          const r = findResult<RuleResultSlidingWindow>(decision, configId, inputId);
          return r === null ? [] : [r];
        },
      };
    },
    {
      type: "SLIDING_WINDOW" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultSlidingWindow[] {
        return findResults<RuleResultSlidingWindow>(decision, configId);
      },
      result(decision: Decision): RuleResultSlidingWindow | null {
        return findResults<RuleResultSlidingWindow>(decision, configId)[0] ?? null;
      },
      deniedResult(decision: Decision): RuleResultSlidingWindow | null {
        return findDeniedResult<RuleResultSlidingWindow>(decision, configId);
      },
    },
  );

  return rule;
}

/**
 * Create a server-side prompt injection detection rule.
 *
 * Use this when your application passes user-supplied text to an LLM
 * and you want to block attempts to override system prompts or
 * extract hidden instructions. Also useful for scanning tool call
 * results that contain untrusted input — for example, a "fetch" tool
 * that loads a webpage which could embed injected instructions.
 *
 * Returns a configured rule that can be called with user-supplied text
 * to produce a `RuleWithInput` ready for `.guard()`. The text is sent
 * to the Arcjet Cloud API for analysis.
 *
 * @example
 * ```ts
 * const pi = detectPromptInjection();
 * const decision = await arcjet.guard({
 *   label: "tools.chat",
 *   rules: [pi(userMessage)],
 * });
 * ```
 */
export function detectPromptInjection(
  config: DetectPromptInjectionConfig = {},
): RuleWithConfigPromptInjection {
  const configId = randomId();

  const rule = Object.assign(
    (input: string): RuleWithInputPromptInjection => {
      const inputId = randomId();
      return {
        type: "PROMPT_INJECTION" as const,
        config,
        input,
        [symbolArcjetInternal]: { configId, inputId },
        result(decision: Decision): RuleResultPromptInjection | null {
          return findResult<RuleResultPromptInjection>(decision, configId, inputId);
        },
        deniedResult(decision: Decision): RuleResultPromptInjection | null {
          const r = findResult<RuleResultPromptInjection>(decision, configId, inputId);
          return r !== null && r.conclusion === "DENY" ? r : null;
        },
        results(decision: Decision): RuleResultPromptInjection[] {
          const r = findResult<RuleResultPromptInjection>(decision, configId, inputId);
          return r === null ? [] : [r];
        },
      };
    },
    {
      type: "PROMPT_INJECTION" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultPromptInjection[] {
        return findResults<RuleResultPromptInjection>(decision, configId);
      },
      result(decision: Decision): RuleResultPromptInjection | null {
        return findResults<RuleResultPromptInjection>(decision, configId)[0] ?? null;
      },
      deniedResult(decision: Decision): RuleResultPromptInjection | null {
        return findDeniedResult<RuleResultPromptInjection>(decision, configId);
      },
    },
  );

  return rule;
}

/**
 * Create a sensitive information detection rule.
 *
 * Use this to prevent PII (emails, phone numbers, credit card numbers)
 * from being sent to third-party services or stored in logs. The
 * detection runs locally via WASM — only a SHA-256 hash of the text
 * is transmitted to the Arcjet Cloud API, never the raw content.
 *
 * Use `allow` / `deny` in the config to control which entity types
 * trigger a denial (e.g. `{ deny: ["CREDIT_CARD_NUMBER", "PHONE_NUMBER"] }`).
 * Omitting both denies all detected entity types.
 *
 * Returns a configured rule that can be called with user-supplied text
 * to produce a `RuleWithInput` ready for `.guard()`.
 *
 * @example
 * ```ts
 * const si = localDetectSensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"] });
 * const decision = await arcjet.guard({
 *   label: "tools.summary",
 *   rules: [si(userMessage)],
 * });
 * ```
 */
export function localDetectSensitiveInfo(
  config: LocalDetectSensitiveInfoConfig = {},
): RuleWithConfigSensitiveInfo {
  const configId = randomId();

  const rule = Object.assign(
    (input: string): RuleWithInputSensitiveInfo => {
      const inputId = randomId();
      return {
        type: "SENSITIVE_INFO" as const,
        config,
        input,
        [symbolArcjetInternal]: { configId, inputId },
        result(decision: Decision): RuleResultSensitiveInfo | null {
          return findResult<RuleResultSensitiveInfo>(decision, configId, inputId);
        },
        deniedResult(decision: Decision): RuleResultSensitiveInfo | null {
          const r = findResult<RuleResultSensitiveInfo>(decision, configId, inputId);
          return r !== null && r.conclusion === "DENY" ? r : null;
        },
        results(decision: Decision): RuleResultSensitiveInfo[] {
          const r = findResult<RuleResultSensitiveInfo>(decision, configId, inputId);
          return r === null ? [] : [r];
        },
      };
    },
    {
      type: "SENSITIVE_INFO" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultSensitiveInfo[] {
        return findResults<RuleResultSensitiveInfo>(decision, configId);
      },
      result(decision: Decision): RuleResultSensitiveInfo | null {
        return findResults<RuleResultSensitiveInfo>(decision, configId)[0] ?? null;
      },
      deniedResult(decision: Decision): RuleResultSensitiveInfo | null {
        return findDeniedResult<RuleResultSensitiveInfo>(decision, configId);
      },
    },
  );

  return rule;
}

/**
 * Create a custom rule with user-defined data and optional local evaluation.
 *
 * Use this when the built-in rules don't cover your use case — for
 * example, scoring requests with your own model, checking feature
 * flags, or integrating an external abuse signal. You supply a local
 * `evaluate` function that runs before the RPC; its result is sent
 * to the server for logging and analytics alongside the config/input
 * data.
 *
 * Returns a configured rule that can be called with arbitrary
 * key-value input data to produce a `RuleWithInput` ready for
 * `.guard()`.
 *
 * When `evaluate` is provided, the SDK calls it locally before
 * sending the request. The function receives `(configData, inputData)`
 * and must return `{ conclusion: "ALLOW" | "DENY", data?: Record<string, string> }`.
 * The local result is sent to the server alongside the config/input data.
 *
 * @example
 * ```ts
 * const custom = localCustom({
 *   data: { threshold: "0.5" },
 *   evaluate: (config, input) => {
 *     const score = parseFloat(input["score"] ?? "0");
 *     const threshold = parseFloat(config["threshold"] ?? "0");
 *     return score > threshold
 *       ? { conclusion: "DENY", data: { reason: "score too high" } }
 *       : { conclusion: "ALLOW" };
 *   },
 * });
 * const decision = await arcjet.guard({
 *   label: "tools.score",
 *   rules: [custom({ data: { score: "0.8" } })],
 * });
 * ```
 */
export function localCustom(config: LocalCustomConfig = {}): RuleWithConfigCustom {
  const configId = randomId();

  const rule = Object.assign(
    (input: LocalCustomInput): RuleWithInputCustom => {
      const inputId = randomId();
      return {
        type: "CUSTOM" as const,
        config,
        input,
        ...(config.evaluate ? { evaluate: config.evaluate } : {}),
        [symbolArcjetInternal]: { configId, inputId },
        result(decision: Decision): RuleResultCustom | null {
          return findResult<RuleResultCustom>(decision, configId, inputId);
        },
        deniedResult(decision: Decision): RuleResultCustom | null {
          const r = findResult<RuleResultCustom>(decision, configId, inputId);
          return r !== null && r.conclusion === "DENY" ? r : null;
        },
        results(decision: Decision): RuleResultCustom[] {
          const r = findResult<RuleResultCustom>(decision, configId, inputId);
          return r === null ? [] : [r];
        },
      };
    },
    {
      type: "CUSTOM" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultCustom[] {
        return findResults<RuleResultCustom>(decision, configId);
      },
      result(decision: Decision): RuleResultCustom | null {
        return findResults<RuleResultCustom>(decision, configId)[0] ?? null;
      },
      deniedResult(decision: Decision): RuleResultCustom | null {
        return findDeniedResult<RuleResultCustom>(decision, configId);
      },
    },
  );

  return rule;
}
