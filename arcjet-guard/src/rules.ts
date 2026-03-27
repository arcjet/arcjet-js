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
 * Returns a configured rule that can be called with per-request input
 * (key + optional requested token count) to produce a `RuleWithInput`
 * ready for `.guard()`.
 *
 * @example
 * ```ts
 * const limit = tokenBucket({ refillRate: 10, intervalSeconds: 60, maxTokens: 100 });
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
      };
    },
    {
      type: "TOKEN_BUCKET" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultTokenBucket[] {
        return findResults<RuleResultTokenBucket>(decision, configId);
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
 * Returns a configured rule that can be called with per-request input
 * (key + optional requested count) to produce a `RuleWithInput`
 * ready for `.guard()`.
 *
 * @example
 * ```ts
 * const limit = fixedWindow({ maxRequests: 1000, windowSeconds: 3600 });
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
      };
    },
    {
      type: "FIXED_WINDOW" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultFixedWindow[] {
        return findResults<RuleResultFixedWindow>(decision, configId);
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
 * Returns a configured rule that can be called with per-request input
 * (key + optional requested count) to produce a `RuleWithInput`
 * ready for `.guard()`.
 *
 * @example
 * ```ts
 * const limit = slidingWindow({ maxRequests: 500, intervalSeconds: 60 });
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
      };
    },
    {
      type: "SLIDING_WINDOW" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultSlidingWindow[] {
        return findResults<RuleResultSlidingWindow>(decision, configId);
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
 * Returns a configured rule that can be called with user-supplied text
 * to produce a `RuleWithInput` ready for `.guard()`. The text is sent
 * to the Arcjet API for analysis.
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
      };
    },
    {
      type: "PROMPT_INJECTION" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultPromptInjection[] {
        return findResults<RuleResultPromptInjection>(decision, configId);
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
 * Returns a configured rule that can be called with user-supplied text
 * to produce a `RuleWithInput` ready for `.guard()`. The text is
 * hashed (SHA-256) before being sent to the Arcjet API — only the
 * hash is transmitted, never the raw content.
 *
 * Use `allow` / `deny` in the config to filter which entity types
 * trigger a denial (e.g. `{ deny: ["SSN", "CREDIT_CARD"] }`).
 *
 * @example
 * ```ts
 * const si = localDetectSensitiveInfo({ deny: ["SSN"] });
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
      };
    },
    {
      type: "SENSITIVE_INFO" as const,
      config,
      [symbolArcjetInternal]: { configId },
      results(decision: Decision): RuleResultSensitiveInfo[] {
        return findResults<RuleResultSensitiveInfo>(decision, configId);
      },
      deniedResult(decision: Decision): RuleResultSensitiveInfo | null {
        return findDeniedResult<RuleResultSensitiveInfo>(decision, configId);
      },
    },
  );

  return rule;
}

/**
 * Create a custom rule with user-defined data.
 *
 * Returns a configured rule that can be called with arbitrary
 * key-value input data to produce a `RuleWithInput` ready for
 * `.guard()`. Both config and input data are forwarded to the
 * Arcjet API as string maps.
 *
 * @example
 * ```ts
 * const custom = localCustom({ data: { threshold: "0.5" } });
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
        [symbolArcjetInternal]: { configId, inputId },
        result(decision: Decision): RuleResultCustom | null {
          return findResult<RuleResultCustom>(decision, configId, inputId);
        },
        deniedResult(decision: Decision): RuleResultCustom | null {
          const r = findResult<RuleResultCustom>(decision, configId, inputId);
          return r !== null && r.conclusion === "DENY" ? r : null;
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
      deniedResult(decision: Decision): RuleResultCustom | null {
        return findDeniedResult<RuleResultCustom>(decision, configId);
      },
    },
  );

  return rule;
}
