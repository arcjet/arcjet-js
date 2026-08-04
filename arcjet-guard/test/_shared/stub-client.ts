/**
 * Stub factories for testing: guard client, and decision builders.
 *
 * These are shared across `@arcjet/guard` test suites for consistent,
 * properly typed stub decisions and capture tracking.
 *
 * The decision builders below assert through `unknown` because they deliberately
 * build only the fields their suites read; the real `Decision` and `RuleWithInput`
 * carry many more.
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
  const client: ArcjetAgentClient = {
    guard(opts: unknown): Promise<Decision> {
      guardCalls.push(opts);
      if (decision instanceof Error) return Promise.reject(decision);
      return Promise.resolve(decision);
    },
    capture(opts: unknown): void {
      captureCalls.push(opts);
    },
  };
  return {
    client,
    guardCalls,
    captureCalls,
  };
}

/**
 * Stub ALLOW decision.
 */
export function decisionAllow(): Decision {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- partial stub of Decision
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
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- partial stub of DecisionDeny
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
 *
 * `id` is empty because that is what the client synthesizes on a fail-open
 * path; a correlatable id cannot occur here.
 */
export function decisionFailOpenAllow(): Decision {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- partial stub of Decision
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
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- partial stub of DecisionDeny
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
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- partial stub of DecisionDeny
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
 * Stub DENY decision whose reason is `ERROR`.
 *
 * The server can issue this: `Reason` includes `"ERROR"`, and a decision's
 * reason is carried through onto a `DENY` conclusion. It is a real denial and
 * must not be mistaken for the guard-unavailable path, which reports the same
 * reason but is reached without a decision at all.
 */
export function decisionDenyError(): DecisionDeny {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- partial stub of DecisionDeny
  return {
    conclusion: "DENY",
    reason: "ERROR",
    id: "gdec_deny_error",
    results: [{ conclusion: "DENY", reason: "ERROR", type: "ERROR" }],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as DecisionDeny;
}

/**
 * Stub fake rule for testing (when actual rule config is not needed).
 */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- partial stub of RuleWithInput
export const fakeRule: RuleWithInput = {
  type: "TEST",
} as unknown as RuleWithInput;
