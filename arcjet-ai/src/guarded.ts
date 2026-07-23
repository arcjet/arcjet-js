import type { Decision, DecisionDeny, RuleWithInput } from "@arcjet/guard";

import { captureEvent, shouldWarn } from "./client.js";
import type { ArcjetAiClient } from "./client.js";

/**
 * The guard → deny → execute → capture sequence shared by `protectTool()` and
 * `protectAction()`. Callers resolve `rules`, `metadata`, and `correlationId`
 * (including any per-input functions and overrides) and pass the final values;
 * this runs the common flow:
 *
 * 1. When `rules` are present, call `guard()` — failing open on error and
 *    warning when the decision itself failed open.
 * 2. On DENY, capture `outcome: "denied"` and return `onDeny(decision)`.
 * 3. Otherwise run `execute()`, capturing `outcome: "success"` — or, if it
 *    throws, `outcome: "error"` before rethrowing.
 *
 * `onDeny` returns the value the caller hands back on denial (`protectTool`
 * returns an `ArcjetDenialResult`; `protectAction` throws, and its `never`
 * return type is assignable to `T`).
 */
export async function runGuarded<T>(
  client: ArcjetAiClient,
  params: {
    action: string;
    rules: RuleWithInput[] | undefined;
    correlationId: string | undefined;
    metadata: Record<string, string>;
    onDeny: (decision: DecisionDeny) => T;
    execute: () => Promise<T>;
  },
): Promise<T> {
  const { action, rules, correlationId, metadata, onDeny, execute } = params;
  // Spread onto every guard/capture payload so `correlationId` is included
  // when set and omitted otherwise (it is optional under
  // `exactOptionalPropertyTypes`, so assigning `undefined` is a type error).
  const correlation = correlationId === undefined ? {} : { correlationId };

  let decisionId: string | undefined;
  if (rules !== undefined && rules.length > 0) {
    let decision: Decision | undefined;
    try {
      decision = await client.guard({ label: action, rules, ...correlation, metadata });
    } catch (error) {
      // Defense in depth: the guard client itself converts transport failures
      // into ALLOW decisions with hasFailedOpen() === true, so reaching here
      // means something unexpected broke. Fail open.
      if (shouldWarn()) {
        console.warn(`@arcjet/ai: guard check for "${action}" errored; failing open:`, error);
      }
      decision = undefined;
    }
    if (decision !== undefined) {
      decisionId = decision.id;
      if (decision.hasFailedOpen() && shouldWarn()) {
        console.warn(`@arcjet/ai: guard check for "${action}" failed open (API error).`);
      }
      if (decision.conclusion === "DENY") {
        captureEvent(client, {
          action,
          ...correlation,
          ...(decisionId !== undefined && { decisionId }),
          metadata: { ...metadata, outcome: "denied" },
        });
        return onDeny(decision);
      }
    }
  }

  let result: T;
  try {
    result = await execute();
  } catch (error) {
    captureEvent(client, {
      action,
      ...correlation,
      ...(decisionId !== undefined && { decisionId }),
      metadata: { ...metadata, outcome: "error" },
    });
    throw error;
  }
  captureEvent(client, {
    action,
    ...correlation,
    ...(decisionId !== undefined && { decisionId }),
    metadata: { ...metadata, outcome: "success" },
  });
  return result;
}
