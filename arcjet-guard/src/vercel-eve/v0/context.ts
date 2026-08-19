import type { SessionContext } from "eve/context";

import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentContext } from "../../agents/context.ts";
import { correlationIdProblem } from "../../agents/context.ts";
import { ulid } from "../../agents/ulid.ts";
import type { ArcjetMetadata } from "../../types.ts";

/**
 * Derive an ArcjetAgentContext from an Eve SessionContext.
 *
 * Reads the session ID and auth principal from Eve's context, validates the
 * session ID without throwing (delegating to a fallback ULID on failure),
 * and packages the result as an ArcjetAgentContext suitable for guard calls.
 *
 * For delegated sessions (when `session.parent` is present), the correlation
 * ID is the **root** session ID, so all decisions in a conversation chain land
 * on the user-facing session's Sequence rather than a Sequence nobody reads.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection } from "@arcjet/guard";
 * import { ArcjetDeniedError, guardAction, eveAgentContext } from "@arcjet/guard/vercel-eve/v0";
 * import type { SessionContext } from "eve/context";
 *
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * export async function modelResponse(
 *   ctx: SessionContext,
 *   userMessage: string,
 *   model: { invoke(message: string): Promise<string> },
 * ): Promise<{ message: string } | { error: string }> {
 *   // Thread Eve's session context into the guard as an ArcjetAgentContext,
 *   // so the decision lands on the conversation's Sequence.
 *   const agentCtx = eveAgentContext(ctx);
 *
 *   try {
 *     const message = await guardAction(
 *       client,
 *       agentCtx,
 *       {
 *         action: "model.responded",
 *         onGuardError: "deny", // default — blocks the call if Arcjet is unreachable
 *         rules: [detectPromptInjection()(userMessage)],
 *       },
 *       () => model.invoke(userMessage),
 *     );
 *     return { message };
 *   } catch (error) {
 *     if (error instanceof ArcjetDeniedError) {
 *       return { error: "Request blocked by security policy" };
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @param ctx - Eve's SessionContext, carrying the session ID, auth principal,
 *   and turn. Accepts `undefined` so a guarded tool invoked outside Eve — with
 *   no execution context — still produces a context rather than throwing.
 * @param init - Optional initialization object with metadata
 * @returns An ArcjetAgentContext suitable for passing to guard
 */
export function eveAgentContext(
  ctx: SessionContext | undefined,
  init?: { metadata?: ArcjetMetadata },
): ArcjetAgentContext {
  // Step 1: Choose correlation ID (root for delegated sessions, self for root)
  let correlationId = ctx?.session?.parent?.rootSessionId ?? ctx?.session?.id;

  // Step 2: Validate without throwing
  if (typeof correlationId === "string") {
    const problem = correlationIdProblem(correlationId);
    if (problem !== undefined) {
      if (shouldWarn()) {
        console.warn(`@arcjet/guard: session id rejected (${problem}), using generated ULID`);
      }
      // Fall back to a generated ULID
      correlationId = ulid();
    }
  } else {
    // correlationId is not a string; generate a new one
    correlationId = ulid();
  }

  // Step 3: Build derived metadata in order so caller wins
  const derivedMetadata: ArcjetMetadata = {};

  // eve.session: always include, even if it was rejected
  const rawSessionId = ctx?.session?.id;
  if (typeof rawSessionId === "string") {
    derivedMetadata["eve.session"] = rawSessionId;
  }

  // eve.turn: session turn id, omitted if absent
  const turnId = ctx?.session?.turn?.id;
  if (typeof turnId === "string" && turnId.length > 0) {
    derivedMetadata["eve.turn"] = turnId;
  }

  // eve.parent-session: only for delegated sessions
  const parentSessionId = ctx?.session?.parent?.sessionId;
  if (typeof parentSessionId === "string") {
    derivedMetadata["eve.parent-session"] = parentSessionId;
  }

  // user: from current principal, omitted if null or not a non-empty string
  const principalId = ctx?.session?.auth?.current?.principalId;
  if (typeof principalId === "string" && principalId.length > 0) {
    derivedMetadata["user"] = principalId;
  }

  // Merge with caller metadata (caller wins)
  const metadata: ArcjetMetadata = { ...derivedMetadata, ...init?.metadata };

  // Step 4: Return context, omitting metadata if empty
  const result: ArcjetAgentContext = { correlationId };

  if (Object.keys(metadata).length > 0) {
    result.metadata = metadata;
  }

  return result;
}
