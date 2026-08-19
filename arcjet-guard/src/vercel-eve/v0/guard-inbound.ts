import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import type { ArcjetMetadata, Decision, DecisionDeny, RuleWithInput } from "../../types.ts";
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
 * - `{ allowed: false, outcome: "DENY", decision, message }` when a rule denied
 * - `{ allowed: false, outcome: "UNAVAILABLE", message }` when the guard could
 *   not be evaluated and is configured to fail closed
 *
 * `outcome` separates a policy denial from an Arcjet outage. It is deliberately
 * not called `reason`: everywhere else in the SDK `reason` is the rule category
 * that fired (`"PROMPT_INJECTION"`, `"RATE_LIMIT"`, …), and a channel that
 * echoed this field to its caller reported `"DENY"` where the rule category was
 * expected. Read the category from `decision.reason` instead.
 */
export type InboundVerdict =
  | { allowed: true }
  | {
      allowed: false;
      /** Whether a rule denied, or the guard could not be evaluated. */
      outcome: "DENY" | "UNAVAILABLE";
      /**
       * Same value as {@link outcome}.
       *
       * @deprecated Use `outcome` for denial-vs-outage, or `decision.reason`
       *   for the rule category that fired. Removed in the next major.
       */
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
 * import {
 *   launchArcjet,
 *   detectPromptInjection,
 *   localDetectSensitiveInfo,
 * } from "@arcjet/guard";
 * import { guardInbound } from "@arcjet/guard/vercel-eve/v0";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * // A channel handler runs before Eve creates the session, so the identity it
 * // passes is the one the channel already has — here a Slack thread timestamp.
 * // `arcjetHooks` emits a join record at `session.started` tying it to the
 * // session id.
 * export async function onInboundMessage(
 *   text: string,
 *   threadTs: string,
 * ): Promise<string | undefined> {
 *   // Build rules from the text and pass the same text; the helper never
 *   // inspects it, and it is deliberately kept out of metadata.
 *   const verdict = await guardInbound(arcjet, text, {
 *     rules: [detectPromptInjection()(text), localDetectSensitiveInfo()(text)],
 *     correlationId: threadTs,
 *   });
 *
 *   if (!verdict.allowed) {
 *     // `verdict.outcome` distinguishes a policy denial from an Arcjet outage.
 *     // The rule category that fired is `verdict.decision?.reason`
 *     // ("PROMPT_INJECTION", "SENSITIVE_INFO", …), and on a DENY
 *     // `verdict.decision` is the real decision, so a rule's own `results()`
 *     // can classify it further.
 *     return `Your message was not processed: ${verdict.message}`;
 *   }
 *
 *   // Screening passed; hand the turn to the agent.
 *   return undefined;
 * }
 * ```
 *
 * @param client - Arcjet guard client
 * @param text - Inbound text to screen (not placed in metadata)
 * @param options - Screening policy
 * @returns A verdict: `{ allowed: true }` or `{ allowed: false, reason, message, decision? }`
 */
export async function guardInbound(
  client: ArcjetAgentClient,
  text: string,
  options: GuardInboundOptions,
): Promise<InboundVerdict> {
  // The caller builds the rules from this text and passes the same text; the
  // helper never inspects it, and deliberately keeps it out of metadata.
  void text;
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
        outcome: "DENY",
        reason: "DENY",
        decision,
        message: deniedReason(decision),
      }),
      onUnavailable: (): InboundVerdict => ({
        allowed: false,
        outcome: "UNAVAILABLE",
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
          outcome: "UNAVAILABLE",
          reason: "UNAVAILABLE",
          message: unavailableReason(),
        }
      : { allowed: true };
  }
}
