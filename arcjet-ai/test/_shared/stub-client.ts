/**
 * Stub factories for testing: guard client, and decision builders.
 *
 * These are shared across `@arcjet/ai` test suites for consistent,
 * properly typed stub decisions and capture tracking.
 */

import type { Decision, DecisionDeny, RuleWithInput } from "@arcjet/guard";

import type { ArcjetAiClient } from "../../dist/index.js";

/**
 * Factory for stub guard clients with in-memory decision and capture tracking.
 *
 * @param decision - Decision to return from guard(), or Error to throw
 * @returns Tuple of [client, guardCalls, captureCalls]
 */
export function stubClient(decision: Decision | Error) {
  const guardCalls: unknown[] = [];
  const captureCalls: unknown[] = [];
  return {
    client: {
      async guard(opts: unknown) {
        guardCalls.push(opts);
        if (decision instanceof Error) throw decision;
        return decision;
      },
      experimental_capture(opts: unknown) {
        captureCalls.push(opts);
      },
    } as unknown as ArcjetAiClient,
    guardCalls,
    captureCalls,
  };
}

/**
 * Stub ALLOW decision.
 */
export function decisionAllow(): Decision {
  return {
    conclusion: "ALLOW",
    id: "gdec_allow1",
    results: [],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as Decision;
}

/**
 * Stub DENY decision (RATE_LIMIT).
 */
export function decisionDenyRateLimit(resetAtUnixSeconds: number): DecisionDeny {
  return {
    conclusion: "DENY",
    reason: "RATE_LIMIT",
    id: "gdec_deny1",
    results: [
      {
        conclusion: "DENY",
        reason: "RATE_LIMIT",
        type: "TOKEN_BUCKET",
        resetAtUnixSeconds,
      },
    ],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as DecisionDeny;
}

/**
 * Stub fail-open ALLOW decision.
 */
export function decisionFailOpenAllow(): Decision {
  return {
    conclusion: "ALLOW",
    id: "gdec_allow_fo",
    results: [],
    warnings: [],
    hasFailedOpen: () => true,
  } as unknown as Decision;
}

/**
 * Stub DENY decision (non-rate-limit, e.g., PROMPT_INJECTION).
 */
export function decisionDenyPromptInjection(): DecisionDeny {
  return {
    conclusion: "DENY",
    reason: "PROMPT_INJECTION",
    id: "gdec_deny_pi",
    results: [
      {
        conclusion: "DENY",
        reason: "PROMPT_INJECTION",
        type: "PROMPT_INJECTION",
      },
    ],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as DecisionDeny;
}

/**
 * Stub fake rule for testing (when actual rule config is not needed).
 */
export const fakeRule: RuleWithInput = {
  type: "TEST" as never,
} as RuleWithInput;
