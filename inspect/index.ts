import type {
  ArcjetRuleResult,
  ArcjetRuleState,
  ArcjetBotReason,
  ArcjetErrorReason,
} from "@arcjet/protocol";

function isBotReason(reason: unknown): reason is ArcjetBotReason {
  return (
    typeof reason === "object" &&
    reason !== null &&
    "isBot" in reason &&
    typeof reason.isBot === "function" &&
    reason.isBot() &&
    "isSpoofed" in reason &&
    typeof reason.isSpoofed === "function" &&
    "isVerified" in reason &&
    typeof reason.isVerified === "function"
  );
}

function isErrorReason(reason: unknown): reason is ArcjetErrorReason {
  return (
    typeof reason === "object" &&
    reason !== null &&
    "isError" in reason &&
    typeof reason.isError === "function" &&
    reason.isError() &&
    "message" in reason &&
    typeof reason.message === "string"
  );
}

function isActive(
  result: unknown,
): result is ArcjetRuleResult & { state: Exclude<ArcjetRuleState, "DRY_RUN"> } {
  return (
    typeof result === "object" &&
    result !== null &&
    "state" in result &&
    typeof result.state === "string" &&
    result.state !== "DRY_RUN"
  );
}

/**
 * Determines if a rule result is an active bot rule that was detected as a
 * spoofed request.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the rule result was active and detected as spoofed or
 * `false` otherwise.
 */
export function isSpoofedBot(result: ArcjetRuleResult): boolean {
  // Use `unknown` argument helpers to guard around the wrong data being passed
  if (isActive(result) && isBotReason(result.reason)) {
    return result.reason.isSpoofed();
  }

  return false;
}

/**
 * Determines if a rule result is an active bot rule that was detected as a
 * verified request.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the rule result was active and detected as verified or
 * `false` otherwise.
 */
export function isVerifiedBot(result: ArcjetRuleResult): boolean {
  // Use `unknown` argument helpers to guard around the wrong data being passed
  if (isActive(result) && isBotReason(result.reason)) {
    return result.reason.isVerified();
  }

  return false;
}

/**
 * Determines if a rule result is an active bot rule that failed due to a
 * missing User-Agent header on the request.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the rule result was active and missing the User-Agent
 * header or `false` otherwise.
 */
export function isMissingUserAgent(result: ArcjetRuleResult): boolean {
  if (isActive(result) && isErrorReason(result.reason)) {
    return (
      // Error message via server bot rule
      result.reason.message.includes("missing User-Agent header") ||
      // Error message via local validation
      result.reason.message.includes("requires user-agent header")
    );
  }

  return false;
}
