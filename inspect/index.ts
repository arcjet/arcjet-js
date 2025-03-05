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
 * Determines if a `LIVE` bot rule detected a spoofed request. If `true`, the
 * request was spoofed and should be denied. `DRY_RUN` rules are ignored.
 *
 * For `allow` rules, Arcjet verifies the authenticity of detected bots by
 * checking IP data and performing reverse DNS lookups. This helps protect
 * against spoofed bots where clients pretend to be someone else.
 *
 * Note that spoofed bot detection is not available on free plans.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the rule result was `LIVE` and detected as a spoofed bot,
 * or `false` otherwise.
 *
 * @example
 * ```ts
 * import arcjet, { detectBot } from "@arcjet/next";
 * import { isSpoofedBot } from "@arcjet/inspect";
 *
 * const aj = arcjet({
 *  key: process.env.ARCJET_KEY,
 *  rules: [
 *    detectBot({
 *      mode: "LIVE",
 *      allow: [],
 *    }),
 *  ],
 * });
 *
 * export async function GET(request: Request) {
 *  const decision = await aj.protect(request);
 *
 *  if (decision.isDenied()) {
 *    return res.status(403).json({ error: "Forbidden" });
 *  }
 *
 *  if (decision.results.some(isSpoofedBot)) {
 *    return res
 *      .status(403)
 *      .json({ error: "You are pretending to be a good bot!" });
 *  }
 *
 *  res.status(200).json({ name: "Hello world" });
 * }
 * ```
 *
 * @link https://docs.arcjet.com/bot-protection/reference#bot-verification
 */
export function isSpoofedBot(result: ArcjetRuleResult): boolean {
  // Use `unknown` argument helpers to guard around the wrong data being passed
  if (isActive(result) && isBotReason(result.reason)) {
    return result.reason.isSpoofed();
  }

  return false;
}

/**
 * Determines if a `LIVE` bot rule detected a request from a verified bot. If
 * `true`, the bot was verified as legitimate. `DRY_RUN` rules are ignored.
 *
 * For `allow` rules, Arcjet verifies the authenticity of detected bots by
 * checking IP data and performing reverse DNS lookups. This helps protect
 * against spoofed bots where clients pretend to be someone else. A verified bot
 * is a bot that has passed these checks.
 *
 * Note that verified bot detection is not available on free plans.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the rule result was `LIVE` and detected as a verified bot,
 * or `false` otherwise.
 *
 * @example
 * ```ts
 * import arcjet, { detectBot } from "@arcjet/next";
 * import { isVerifiedBot } from "@arcjet/inspect";
 *
 * const aj = arcjet({
 *  key: process.env.ARCJET_KEY,
 *  rules: [
 *    detectBot({
 *      mode: "LIVE",
 *      allow: [],
 *    }),
 *  ],
 * });
 *
 * export async function GET(request: Request) {
 *  const decision = await aj.protect(request);
 *
 *  if (decision.isDenied()) {
 *    return res.status(403).json({ error: "Forbidden" });
 *  }
 *
 *  if (!decision.results.some(isVerifiedBot)) {
 *    return res
 *      .status(403)
 *      .json({ error: "You are pretending to be a good bot!" });
 *  }
 *
 *  res.status(200).json({ name: "Hello world" });
 * }
 * ```
 *
 * @link https://docs.arcjet.com/bot-protection/reference#bot-verification
 */
export function isVerifiedBot(result: ArcjetRuleResult): boolean {
  // Use `unknown` argument helpers to guard around the wrong data being passed
  if (isActive(result) && isBotReason(result.reason)) {
    return result.reason.isVerified();
  }

  return false;
}

/**
 * Determines if a `LIVE` bot rule errored due to a missing User-Agent header on
 * the request and should be denied. A missing `User-Agent` header is a good
 * indicator of a malicious request because it is required by the HTTP spec.
 * `DRY_RUN` rules are ignored.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the rule result was `LIVE` and detected as a missing
 * User-Agent, or `false` otherwise.
 *
 * @example
 * ```ts
 * import arcjet, { detectBot } from "@arcjet/next";
 * import { isMissingUserAgent } from "@arcjet/inspect";
 *
 * const aj = arcjet({
 *  key: process.env.ARCJET_KEY,
 *  rules: [
 *    detectBot({
 *      mode: "LIVE",
 *      allow: [],
 *    }),
 *  ],
 * });
 *
 * export async function GET(request: Request) {
 *  const decision = await aj.protect(request);
 *
 *  if (decision.isDenied()) {
 *    return res.status(403).json({ error: "Forbidden" });
 *  }
 *
 *  // We expect all non-bot clients to have the User-Agent header
 *  if (decision.results.some(isMissingUserAgent)) {
 *    return res.status(403).json({ error: "You are a bot!" });
 *  }
 *
 *  res.status(200).json({ name: "Hello world" });
 * }
 * ```
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
