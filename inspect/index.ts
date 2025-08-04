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
 * Check for a spoofed bot.
 *
 * You may want to block such requests because they were likely spoofed.
 *
 * ###### Availability
 *
 * Bot protection is available if `detectBot` is used.
 * See [*Bot protection* on
 * `docs.arcjet.com`](https://docs.arcjet.com/bot-protection/quick-start)
 * for more info.
 *
 * Spoofed bot detection is part of advanced bot protection features which
 * are not available on free plans but are available on the starter and
 * business plans.
 * See [*Bot verification* on
 * `docs.arcjet.com`](https://docs.arcjet.com/bot-protection/reference#bot-verification)
 * for more info.
 *
 * @example
 *   ```ts
 *   import { isSpoofedBot } from "@arcjet/inspect";
 *   import arcjet, { detectBot } from "@arcjet/next";
 *   import type { NextApiRequest, NextApiResponse } from "next";
 *
 *   const aj = arcjet({
 *     key: process.env.ARCJET_KEY!,
 *     rules: [
 *       detectBot({
 *         mode: "LIVE",
 *         allow: [
 *           "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *         ],
 *       }),
 *     ],
 *   });
 *
 *   export async function GET(request: NextApiRequest, response: NextApiResponse) {
 *     const decision = await aj.protect(request);
 *
 *     if (decision.isDenied()) {
 *       return response.status(403).json({ message: "Forbidden" });
 *     }
 *
 *     if (decision.results.some(isSpoofedBot)) {
 *       return response
 *         .status(403)
 *         .json({ message: "You are pretending to be a good bot!" });
 *     }
 *
 *     response.status(200).json({ message: "Hello world" });
 *   }
 *   ```
 *
 * @example
 *   ```ts
 *   import http from "node:http";
 *   import { isSpoofedBot } from "@arcjet/inspect";
 *   import arcjet, { detectBot } from "@arcjet/node";
 *
 *   const aj = arcjet({
 *     key: process.env.ARCJET_KEY!,
 *     rules: [
 *       detectBot({
 *         mode: "LIVE",
 *         allow: [
 *           "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *         ],
 *       }),
 *     ],
 *   });
 *
 *   const server = http.createServer(async function (
 *     request: http.IncomingMessage,
 *     response: http.ServerResponse,
 *   ) {
 *     const decision = await aj.protect(request);
 *
 *     if (decision.isDenied()) {
 *       response.writeHead(403, { "Content-Type": "application/json" });
 *       response.end(JSON.stringify({ message: "Forbidden" }));
 *       return;
 *     }
 *
 *     if (decision.results.some(isSpoofedBot)) {
 *       response.writeHead(403, { "Content-Type": "application/json" });
 *       response.end(
 *         JSON.stringify({ message: "You are pretending to be a good bot!" }),
 *       );
 *       return;
 *     }
 *
 *     response.writeHead(200, { "Content-Type": "application/json" });
 *     response.end(JSON.stringify({ message: "Hello world" }));
 *   });
 *
 *   server.listen(8000);
 *   ```
 *
 * @param result
 *   Rule result.
 * @returns
 *   `true` if the bot rule result was `LIVE` and detected a spoofed bot,
 *   `false` if the bot rule result was `LIVE` and did not detect a spoofed bot,
 *   `undefined` if the rule result was non-bot or `DRY_RUN`.
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
 * Check for a verified bot.
 *
 * You may want to ignore other signals for such requests.
 *
 * ###### Availability
 *
 * Bot protection is available if `detectBot` is used.
 * See [*Bot protection* on
 * `docs.arcjet.com`](https://docs.arcjet.com/bot-protection/quick-start)
 * for more info.
 *
 * Verified bot detection is part of advanced bot protection features which
 * are not available on free plans but are available on the starter and
 * business plans.
 * See [*Bot verification* on
 * `docs.arcjet.com`](https://docs.arcjet.com/bot-protection/reference#bot-verification)
 * for more info.
 *
 * @example
 *   ```ts
 *   import { isVerifiedBot } from "@arcjet/inspect";
 *   import arcjet, { detectBot } from "@arcjet/next";
 *   import type { NextApiRequest, NextApiResponse } from "next";
 *
 *   const aj = arcjet({
 *     key: process.env.ARCJET_KEY!,
 *     rules: [
 *       detectBot({
 *         mode: "LIVE",
 *         allow: [
 *           "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *         ],
 *       }),
 *     ],
 *   });
 *
 *   export async function GET(request: NextApiRequest, response: NextApiResponse) {
 *     const decision = await aj.protect(request);
 *
 *     // Ignore all other signals and always allow verified search engine bots
 *     if (decision.results.some(isVerifiedBot)) {
 *       return response.status(200).json({ message: "Hello bot!" });
 *     }
 *
 *     if (decision.isDenied()) {
 *       return response.status(403).json({ message: "Forbidden" });
 *     }
 *
 *     response.status(200).json({ message: "Hello world" });
 *   }
 *   ```
 *
 * @example
 *   ```ts
 *   import http from "node:http";
 *   import { isVerifiedBot } from "@arcjet/inspect";
 *   import arcjet, { detectBot } from "@arcjet/next";
 *
 *   const aj = arcjet({
 *     key: process.env.ARCJET_KEY!,
 *     rules: [
 *       detectBot({
 *         mode: "LIVE",
 *         allow: [
 *           "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *         ],
 *       }),
 *     ],
 *   });
 *
 *   const server = http.createServer(async function (
 *     request: http.IncomingMessage,
 *     response: http.ServerResponse,
 *   ) {
 *     const decision = await aj.protect(request);
 *
 *     // Ignore all other signals and always allow verified search engine bots
 *     if (decision.results.some(isVerifiedBot)) {
 *       response.writeHead(200, { "Content-Type": "application/json" });
 *       response.end(JSON.stringify({ message: "Hello bot!" }));
 *       return;
 *     }
 *
 *     if (decision.isDenied()) {
 *       response.writeHead(403, { "Content-Type": "application/json" });
 *       response.end(JSON.stringify({ message: "Forbidden" }));
 *       return;
 *     }
 *
 *     response.writeHead(200, { "Content-Type": "application/json" });
 *     response.end(JSON.stringify({ message: "Hello world" }));
 *   });
 *
 *   server.listen(8000);
 *   ```
 *
 * @param result
 *   Rule result.
 * @returns
 *   `true` if the bot rule result was `LIVE` and detected a verified bot,
 *   `false` if the bot rule result was `LIVE` and did not detect a verified bot,
 *   `undefined` if the rule result was non-bot or `DRY_RUN`.
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
 * Check for a bot missing a `User-Agent` header.
 *
 * You may want to block such requests because a missing `User-Agent` header is
 * a good indicator of a malicious request since it is recommended by
 * [*HTTP Semantics* from IETF](https://datatracker.ietf.org/doc/html/rfc9110#field.user-agent).
 *
 * ###### Availability
 *
 * Bot protection is available if `detectBot` is used.
 * See [*Bot protection* on
 * `docs.arcjet.com`](https://docs.arcjet.com/bot-protection/quick-start)
 * for more info.
 *
 * Missing `User-Agent` detection is part of all plans including the free plans.
 * See [*Error handling* on
 * `docs.arcjet.com`](https://docs.arcjet.com/bot-protection/reference#error-handling)
 * for more info.
 *
 * @example
 *   ```ts
 *  import { isMissingUserAgent } from "@arcjet/inspect";
 *  import arcjet, { detectBot } from "@arcjet/next";
 *  import type { NextApiRequest, NextApiResponse } from "next";
 *
 *  const aj = arcjet({
 *    key: process.env.ARCJET_KEY!,
 *    rules: [
 *      detectBot({
 *        mode: "LIVE",
 *        allow: [
 *          "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *        ],
 *      }),
 *    ],
 *  });
 *
 *  export async function GET(request: NextApiRequest, response: NextApiResponse) {
 *    const decision = await aj.protect(request);
 *
 *    if (decision.isDenied()) {
 *      return response.status(403).json({ message: "Forbidden" });
 *    }
 *
 *    // We expect all non-bot clients to have the User-Agent header
 *    if (decision.results.some(isMissingUserAgent)) {
 *      return response.status(403).json({ message: "You are a bot!" });
 *    }
 *
 *    response.status(200).json({ message: "Hello world" });
 *  }
 *   ```
 *
 * @example
 *   ```ts
 *   import http from "node:http";
 *   import { isMissingUserAgent } from "@arcjet/inspect";
 *   import arcjet, { detectBot } from "@arcjet/next";
 *
 *   const aj = arcjet({
 *     key: process.env.ARCJET_KEY!,
 *     rules: [
 *       detectBot({
 *         mode: "LIVE",
 *         allow: [
 *           "CATEGORY:SEARCH_ENGINE", // Google, Bing, etc
 *         ],
 *       }),
 *     ],
 *   });
 *
 *   const server = http.createServer(async function (
 *     request: http.IncomingMessage,
 *     response: http.ServerResponse,
 *   ) {
 *     const decision = await aj.protect(request);
 *
 *     if (decision.isDenied()) {
 *       response.writeHead(403, { "Content-Type": "application/json" });
 *       response.end(JSON.stringify({ message: "Forbidden" }));
 *       return;
 *     }
 *
 *     // We expect all non-bot clients to have the User-Agent header
 *     if (decision.results.some(isMissingUserAgent)) {
 *       response.writeHead(403, { "Content-Type": "application/json" });
 *       response.end(JSON.stringify({ message: "You are a bot!" }));
 *       return;
 *     }
 *
 *     response.writeHead(200, { "Content-Type": "application/json" });
 *     response.end(JSON.stringify({ message: "Hello world" }));
 *   });
 *
 *   server.listen(8000);
 *   ```
 *
 * @param result
 *   Rule result.
 * @returns
 *   `true` if the bot rule result was `LIVE` and the request had no `User-Agent` header,
 *   `false` if the bot rule result was `LIVE` and the request had a `User-Agent` header,
 *   `undefined` if the rule result was non-bot or `DRY_RUN`.
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
