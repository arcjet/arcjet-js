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
 * Determines if a non-`"DRY_RUN"` bot rule detected a spoofed request. If
 * `true`, the request was likely spoofed and you may want to block it.
 *
 * For `allow` rules, Arcjet verifies the authenticity of detected bots by
 * checking IP data and performing reverse DNS lookups. This helps protect
 * against spoofed bots where malicious clients pretend to be a well-behaving
 * bot.
 *
 * Note that spoofed bot detection is not available on free plans.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the bot rule result was not `"DRY_RUN"` and a spoofed bot
 * was detected, `false` if the bot rule result was not `"DRY_RUN"` and a
 * spoofed bot was not detected, or `undefined` if the rule result was from a
 * `"DRY_RUN"` bot rule or a non-bot rule.
 *
 * @example
 * ```ts
 * import arcjet, { detectBot } from "@arcjet/next";
 * import { isSpoofedBot } from "@arcjet/inspect";
 *
 * const aj = arcjet({
 *  key: process.env.ARCJET_KEY!,
 *  rules: [
 *    detectBot({
 *      mode: "LIVE",
 *      allow: [
 *        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *      ],
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
export function isSpoofedBot(result: ArcjetRuleResult): boolean | undefined {
  // Use `unknown` argument helpers to guard around the wrong data being passed
  if (isActive(result) && isBotReason(result.reason)) {
    return result.reason.isSpoofed();
  }

  // Explicitly return `undefined` when the rule is not a bot because it is
  // another falsey value but more clear that the check didn't apply
  return undefined;
}

/**
 * Determines if a non-`"DRY_RUN"` bot rule detected a request from a verified
 * bot. If `true`, the bot was verified as legitimate and you may want to ignore
 * other signals.
 *
 * For `allow` rules, Arcjet verifies the authenticity of detected bots by
 * checking IP data and performing reverse DNS lookups. A verified bot is a bot
 * that has passed these checks.
 *
 * Note that verified bot detection is not available on free plans.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the bot rule result was not `"DRY_RUN"` and a verified bot
 * was detected, `false` if the bot rule result was not `"DRY_RUN"` and a
 * verified bot was not detected, or `undefined` if the rule result was from a
 * `"DRY_RUN"` bot rule or a non-bot rule.
 *
 * @example
 * ```ts
 * import arcjet, { detectBot } from "@arcjet/next";
 * import { isVerifiedBot } from "@arcjet/inspect";
 *
 * const aj = arcjet({
 *  key: process.env.ARCJET_KEY!,
 *  rules: [
 *    detectBot({
 *      mode: "LIVE",
 *      allow: [
 *        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *      ],
 *    }),
 *  ],
 * });
 *
 * export async function GET(request: Request) {
 *  const decision = await aj.protect(request);
 *
 *  // Ignore all other signals and always allow verified search engine bots
 *  if (decision.results.some(isVerifiedBot)) {
 *    return res.status(200).json({ name: "Hello bot!" });
 *  }
 *
 *  if (decision.isDenied()) {
 *    return res.status(403).json({ error: "Forbidden" });
 *  }
 *
 *  res.status(200).json({ name: "Hello world" });
 * }
 * ```
 *
 * @link https://docs.arcjet.com/bot-protection/reference#bot-verification
 */
export function isVerifiedBot(result: ArcjetRuleResult): boolean | undefined {
  // Use `unknown` argument helpers to guard around the wrong data being passed
  if (isActive(result) && isBotReason(result.reason)) {
    return result.reason.isVerified();
  }

  // Explicitly return `undefined` when the rule is not a bot because it is
  // another falsey value but more clear that the check didn't apply
  return undefined;
}

/**
 * Determines if a non-`"DRY_RUN"` bot rule errored due to a missing User-Agent
 * header on the request. If `true`, you may want to block the request because a
 * missing User-Agent header is a good indicator of a malicious request since
 * it is recommended by
 * {@link https://datatracker.ietf.org/doc/html/rfc9110#field.user-agent}.
 *
 * @param {ArcjetRuleResult} result - The rule result to inspect.
 * @returns `true` if the rule result was not `"DRY_RUN"` and the request was
 * missing a User-Agent header, `false` if the rule result was not `"DRY_RUN"`
 * and the request had a User-Agent header, or `undefined` if the rule result
 * was from a `"DRY_RUN"` bot rule or a non-bot rule.
 *
 * @example
 * ```ts
 * import arcjet, { detectBot } from "@arcjet/next";
 * import { isMissingUserAgent } from "@arcjet/inspect";
 *
 * const aj = arcjet({
 *  key: process.env.ARCJET_KEY!,
 *  rules: [
 *    detectBot({
 *      mode: "LIVE",
 *      allow: [
 *        "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *      ],
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
export function isMissingUserAgent(
  result: ArcjetRuleResult,
): boolean | undefined {
  if (isActive(result) && isErrorReason(result.reason)) {
    return (
      // Error message via server bot rule
      result.reason.message.includes("missing User-Agent header") ||
      // Error message via local validation
      result.reason.message.includes("requires user-agent header")
    );
  }

  // Explicitly return `undefined` when the rule is not a bot because it is
  // another falsey value but more clear that the check didn't apply
  return undefined;
}
