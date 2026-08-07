import type { ArcjetMetadata, Decision, DecisionDeny, RuleWithInput } from "../../types.ts";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { deniedReason, unavailableReason } from "./denial.ts";
import { runGate } from "./gate.ts";

/**
 * Policy for `guardInbound()` — how to screen inbound text at the channel boundary.
 *
 * Specifies required rules, optional action label, optional correlation ID,
 * metadata context, and optional guard-error handling.
 *
 * **Note on `rules`:** Unlike other guard helpers, `rules` is **required** here.
 * A channel screen with no rules is a round trip that can only return
 * `{ allowed: true }`, and requiring rules is what stops a screen that screens
 * nothing from looking installed. The channel boundary is the one place where
 * it is OK to require the guard call to happen.
 */
export interface GuardInboundOptions {
  /** Rules to evaluate against the inbound text. */
  rules: RuleWithInput[];
  /**
   * Guard label and capture action. Defaults to `"message.received"`.
   */
  action?: string;
  /**
   * Correlation id for this screening. A channel handler runs before Eve
   * creates the session, so there is no session id to derive from — pass the
   * identity the channel has (a thread timestamp, a continuation token, a
   * delivery id). `arcjetHooks` emits a join record at `session.started` that
   * ties this id to the session id.
   *
   * With it omitted, **no** id is generated and neither the guard nor capture
   * payload carries the key — an id nobody else knows looks like a correlation
   * and joins to nothing.
   */
  correlationId?: string;
  /**
   * Metadata merged over the defaults.
   *
   * Note: the `text` parameter is not inspected by this helper and must not
   * be included in metadata. It is user content; `localDetectSensitiveInfo`
   * exists precisely to keep it out of places it should not go.
   */
  metadata?: ArcjetMetadata;
  /** Default `"deny"`. */
  onGuardError?: OnGuardError;
}

/**
 * Verdict returned by `guardInbound()` — whether inbound text passed screening.
 *
 * - `{ allowed: true }` when all rules passed
 * - `{ allowed: false, reason: "DENY", decision, message }` when a rule denied
 * - `{ allowed: false, reason: "UNAVAILABLE", message }` when the guard could not
 *   be evaluated and is configured to fail closed
 */
export type InboundVerdict =
  | { allowed: true }
  | {
      allowed: false;
      reason: "DENY" | "UNAVAILABLE";
      message: string;
      decision?: Decision;
    };

/**
 * Screen inbound text at the channel boundary using Arcjet guard policies.
 *
 * Returns a verdict indicating whether the text passed screening. Never throws,
 * even if the guard call fails, a rule throws, or capture fails — returns an
 * appropriate verdict based on `onGuardError`.
 *
 * The channel boundary runs before Eve creates the session, so:
 * - There is no session id to derive from: pass the identity the channel has
 * - The verdict is a simple pass/fail, not tied to a user-facing approval flow
 * - `correlationId` must be provided by the caller if correlation is needed
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection, localDetectSensitiveInfo } from "@arcjet/guard";
 * import { guardInbound } from "@arcjet/guard/vercel-eve/v0";
 * import type { ChannelHandler } from "eve/channels";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * export const slackChannelHandler: ChannelHandler = async (
 *   incomingMessage,
 * ): Promise<ChannelMessage[]> => {
 *   // A slack message has a thread timestamp that identifies the conversation;
 *   // that is what a session will later join to.
 *   const threadTs = incomingMessage.thread_ts || incomingMessage.ts;
 *
 *   // Build rules from the text and pass the text; the helper does not inspect it.
 *   const verdict = await guardInbound(arcjet, incomingMessage.text, {
 *     rules: [
 *       detectPromptInjection()(incomingMessage.text),
 *       localDetectSensitiveInfo()(incomingMessage.text),
 *     ],
 *     correlationId: threadTs,
 *   });
 *
 *   if (!verdict.allowed) {
 *     return [
 *       {
 *         text: `Your message was not processed: ${verdict.message}`,
 *         thread_ts: threadTs,
 *       },
 *     ];
 *   }
 *
 *   // Message passed screening; proceed to invoke the agent
 *   return invokeAgent(incomingMessage);
 * };
 * ```
 *
 * @param client - Arcjet guard client
 * @param text - Inbound text to screen (not placed in metadata)
 * @param options - Screening policy
 * @returns A verdict: `{ allowed: true }` or `{ allowed: false, reason, message, decision? }`
 */
export async function guardInbound(
  client: ArcjetAgentClient,
  _text: string,
  options: GuardInboundOptions,
): Promise<InboundVerdict> {
  const action = options.action ?? "message.received";

  try {
    // Build metadata with eve.phase: "inbound" merged under caller's
    // (so caller wins if they provide it)
    const metadata: ArcjetMetadata = {
      "eve.phase": "inbound",
      ...options.metadata,
    };

    return await runGate(client, {
      action,
      rules: options.rules,
      correlationId: options.correlationId,
      metadata,
      onAllow: (): InboundVerdict => ({ allowed: true }),
      onDeny: (decision: DecisionDeny): InboundVerdict => ({
        allowed: false,
        reason: "DENY",
        decision,
        message: deniedReason(decision),
      }),
      onUnavailable: (): InboundVerdict => ({
        allowed: false,
        reason: "UNAVAILABLE",
        message: unavailableReason(),
      }),
      onGuardError: options.onGuardError ?? "deny",
    });
  } catch {
    // Last-resort catch: should never reach here if runGate never throws,
    // but if something unforeseen happens, return appropriate verdict
    const failClosed = options.onGuardError !== "allow";
    return failClosed
      ? {
          allowed: false,
          reason: "UNAVAILABLE",
          message: unavailableReason(),
        }
      : { allowed: true };
  }
}
