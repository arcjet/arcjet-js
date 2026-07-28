/**
 * Stub factories for testing: guard client, and decision builders.
 *
 * These are shared across `@arcjet/guard` test suites for consistent,
 * properly typed stub decisions and capture tracking.
 */

import type { Decision, DecisionDeny, RuleWithInput } from "../../src/types.ts";

import type { ArcjetAgentClient } from "../../src/agents/capture.ts";

/**
 * Factory for stub guard clients with in-memory decision and capture tracking.
 *
 * @param decision - Decision to return from guard(), or Error to throw
 * @returns Tuple of [client, guardCalls, captureCalls]
 */
export function stubClient(decision: Decision | Error): {
  client: ArcjetAgentClient;
  guardCalls: unknown[];
  captureCalls: unknown[];
} {
  const guardCalls: unknown[] = [];
  const captureCalls: unknown[] = [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unnecessary-type-assertion
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unnecessary-type-assertion
    client: {
      guard(opts: unknown): Promise<Decision> {
        guardCalls.push(opts);
        if (decision instanceof Error) return Promise.reject(decision);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unnecessary-type-assertion
        return Promise.resolve(decision as Decision);
      },
      // Stub for experimental_capture. The guard client currently lacks this method,
      // so this structural typing with runtime feature detection is temporary.
      // This collapses into the real ArcjetAgentClient type once capture lands.
      experimental_capture(opts: unknown): void {
        captureCalls.push(opts);
      },
    } as unknown as ArcjetAgentClient,
    guardCalls: guardCalls,
    captureCalls: captureCalls,
  };
}

/**
 * Stub ALLOW decision.
 */
export function decisionAllow(): Decision {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return {
    conclusion: "ALLOW",
    id: "",
    results: [],
    warnings: [],
    hasFailedOpen: () => true,
  } as unknown as Decision;
}

/**
 * Stub DENY decision (non-rate-limit, e.g., PROMPT_INJECTION).
 */
export function decisionDenyPromptInjection(): DecisionDeny {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
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
 * Stub DENY decision whose reason is not RATE_LIMIT (PROMPT_INJECTION) but
 * whose results include a co-occurring rate-limit rule that ALLOWed and still
 * carries `resetAtUnixSeconds`. Exercises denialResult's non-retryable path.
 */
export function decisionDenyPromptInjectionWithReset(resetAtUnixSeconds: number): DecisionDeny {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return {
    conclusion: "DENY",
    reason: "PROMPT_INJECTION",
    id: "gdec_deny_pi_rl",
    results: [
      { conclusion: "ALLOW", reason: "RATE_LIMIT", type: "TOKEN_BUCKET", resetAtUnixSeconds },
      { conclusion: "DENY", reason: "PROMPT_INJECTION", type: "PROMPT_INJECTION" },
    ],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as DecisionDeny;
}

/**
 * Stub fake rule for testing (when actual rule config is not needed).
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
export const fakeRule: RuleWithInput = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  type: "TEST" as never,
} as unknown as RuleWithInput;
