import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { deniedReason, unavailableReason } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import type { ArcjetMetadata, Decision, DecisionDeny, RuleWithInput } from "../../types.ts";
import type { ClaudeManagedAgentsContext } from "./context.ts";
import { runGate } from "./gate.ts";
import type { EventSendBody, ManagedAgentsEventParams } from "./types.ts";
import { inboundTextFromEvents, isUserMessageEvent } from "./types.ts";

/**
 * Inbound screen applied to `user.message` events (including those sent as
 * `sessions.create({ initial_events })`) before `sessions.events.send`.
 */
export interface GuardEventsInbound {
  /** Guard label and capture action. Defaults to `"message.received"`. */
  action?: string;
  /**
   * Rules to evaluate. Omitting this, or returning `[]`, still submits a
   * guard call. The factory receives the concatenated `user.message` text.
   */
  rules?:
    | RuleWithInput[]
    | ((input: { text: string; events: readonly ManagedAgentsEventParams[] }) => RuleWithInput[]);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
}

/**
 * Policy for `guardEvents()` — gate outbound `user.message` / `initial_events`
 * before the caller invokes `sessions.events.send` (or `sessions.create`).
 *
 * Generic over the event array so a caller who passes
 * `EventSendParams["events"]` gets that type back on `send`.
 */
export interface GuardEventsPolicy<TEvent extends ManagedAgentsEventParams = ManagedAgentsEventParams> {
  /** Events that would be sent if the gate allows. */
  events: readonly TEvent[];
  inbound: GuardEventsInbound;
  /**
   * Caller-owned correlation from `claudeManagedAgentsContext`. Never an
   * Anthropic session or event id.
   */
  context?: ClaudeManagedAgentsContext;
  /** Metadata merged over the context's. */
  metadata?: ArcjetMetadata;
}

/**
 * Verdict from `guardEvents()`. `allowed: true` means `send` already ran.
 */
export type GuardEventsResult<T> =
  | { allowed: true; sent: T }
  | {
      allowed: false;
      outcome: "DENY" | "UNAVAILABLE";
      message: string;
      decision?: Decision;
    };

/**
 * Gate `user.message` / `initial_events` **before** `sessions.events.send`.
 *
 * Anthropic runs the hosted tool loop. There is no PreToolUse. This helper
 * screens the text the app is about to send; on DENY (or a fail-closed
 * outage) `user.message` events are not sent.
 *
 * Events that are not `user.message` (interrupt, custom_tool_result, …)
 * pass through without an inbound screen — they are not a user turn.
 * A mixed batch that includes a `user.message` still forwards those
 * non-message events when the turn is denied, so a batched
 * `user.custom_tool_result` does not leave the session idle.
 *
 * Default `always_allow` on Anthropic-cloud bash/read/write **cannot** be
 * gated here. `web_search` / `web_fetch` always run on Anthropic.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection } from "@arcjet/guard";
 * import {
 *   claudeManagedAgentsContext,
 *   guardEvents,
 * } from "@arcjet/guard/claude-managed-agents/v0";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const events = [
 *   { type: "user.message" as const, content: [{ type: "text" as const, text }] },
 * ];
 *
 * const verdict = await guardEvents(
 *   arcjet,
 *   {
 *     events,
 *     inbound: {
 *       action: "message.received",
 *       rules: ({ text }) => [detectPromptInjection()(text)],
 *     },
 *     context: claudeManagedAgentsContext({ correlationId: conversationId }),
 *   },
 *   (body) => client.beta.sessions.events.send(session.id, body),
 * );
 *
 * if (!verdict.allowed) {
 *   return verdict.message;
 * }
 * ```
 */
export async function guardEvents<
  T,
  TEvent extends ManagedAgentsEventParams = ManagedAgentsEventParams,
>(
  client: ArcjetAgentClient,
  policy: GuardEventsPolicy<TEvent>,
  send: (body: EventSendBody<TEvent>) => Promise<T>,
): Promise<GuardEventsResult<T>> {
  const events: TEvent[] = [...policy.events];
  const remainder = events.filter((event) => !isUserMessageEvent(event));
  const hasUserMessage = remainder.length !== events.length;

  if (!hasUserMessage) {
    const sent = await send({ events });
    return { allowed: true, sent };
  }

  const text = inboundTextFromEvents(events);
  const action = policy.inbound.action ?? "message.received";

  let rules: RuleWithInput[] | undefined;
  try {
    rules =
      typeof policy.inbound.rules === "function"
        ? policy.inbound.rules({ text, events })
        : policy.inbound.rules;
  } catch (error) {
    if (shouldWarn()) {
      console.warn(
        '@arcjet/guard: policy factory for "%s" threw; treating as a guard error:',
        action,
        error,
      );
    }
    if (policy.inbound.onGuardError === "allow") {
      const sent = await send({ events });
      return { allowed: true, sent };
    }
    await sendRemainder(send, remainder);
    return {
      allowed: false,
      outcome: "UNAVAILABLE",
      message: unavailableReason(),
    };
  }

  const metadata: ArcjetMetadata = {
    "claude.managed-agents.phase": "inbound",
    ...policy.context?.metadata,
    ...policy.metadata,
  };

  type Permit =
    | { allowed: true }
    | {
        allowed: false;
        outcome: "DENY" | "UNAVAILABLE";
        message: string;
        decision?: Decision;
      };

  const verdict = await runGate<Permit>(client, {
    action,
    rules,
    correlationId: policy.context?.correlationId,
    metadata,
    onAllow: (): Permit => ({ allowed: true }),
    onDeny: (decision: DecisionDeny): Permit => ({
      allowed: false,
      outcome: "DENY",
      message: deniedReason(decision),
      decision,
    }),
    onUnavailable: (): Permit => ({
      allowed: false,
      outcome: "UNAVAILABLE",
      message: unavailableReason(),
    }),
    onGuardError: policy.inbound.onGuardError ?? "deny",
  });

  if (!verdict.allowed) {
    await sendRemainder(send, remainder);
    return verdict;
  }

  const sent = await send({ events });
  return { allowed: true, sent };
}

async function sendRemainder<T, TEvent extends ManagedAgentsEventParams>(
  send: (body: EventSendBody<TEvent>) => Promise<T>,
  remainder: TEvent[],
): Promise<void> {
  if (remainder.length === 0) {
    return;
  }
  await send({ events: remainder });
}
