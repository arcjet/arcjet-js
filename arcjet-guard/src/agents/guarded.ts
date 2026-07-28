import type { Decision, DecisionAllow, DecisionDeny, RuleWithInput } from "../types.ts";

import { captureEvent, shouldWarn } from "./capture.ts";
import type { ArcjetAgentClient } from "./capture.ts";

/**
 * The guard → deny → execute → capture sequence shared by `guardTool()` and
 * `guardAction()`. Callers resolve `rules`, `metadata`, and `correlationId`
 * (including any per-input functions and overrides) and pass the final values;
 * this runs the common flow:
 *
 * 1. When `rules` are present, call `guard()` — failing open on error and
 *    warning when the decision itself failed open.
 * 2. On DENY, capture `outcome: "denied"` and return `onDeny(decision)`.
 * 3. Otherwise run `execute()`, capturing `outcome: "success"` — or, if it
 *    throws, `outcome: "error"` before rethrowing.
 *
 * `onDeny` returns the value the caller hands back on denial (`guardTool`
 * returns an `ArcjetDenialResult`; `guardAction` throws, and its `never`
 * return type is assignable to `T`).
 *
 * Both guard-unavailable signals are governed by `onGuardError`. When the
 * `"deny"` mode is active (the default), both signals trigger `onUnavailable`
 * rather than executing the wrapped action.
 */
export async function runGuarded<T>(
  client: ArcjetAgentClient,
  params: {
    action: string;
    rules: RuleWithInput[] | undefined;
    correlationId: string | undefined;
    metadata: Record<string, unknown>;
    onDeny: (decision: DecisionDeny) => T;
    onUnavailable: (
      unavailable:
        | { kind: "threw"; error: unknown }
        | { kind: "failed-open"; decision: DecisionAllow }
    ) => T;
    execute: () => Promise<T>;
    onGuardError?: "allow" | "deny";
  },
): Promise<T> {
  const {
    action,
    rules,
    correlationId,
    metadata,
    onDeny,
    onUnavailable,
    execute,
    onGuardError = "deny",
  } = params;
  // Spread onto every guard/capture payload so `correlationId` is included
  // when set and omitted otherwise (it is optional under
  // `exactOptionalPropertyTypes`, so assigning `undefined` is a type error).
  const correlation = correlationId === undefined ? {} : { correlationId };

  const failClosed = onGuardError === "deny";

  let decisionId: string | undefined;
  if (rules !== undefined && rules.length > 0) {
    let decision: Decision | undefined;
    try {
      decision = await client.guard({ label: action, rules, ...correlation, metadata });
    } catch (error) {
      // Signal (a): the guard call itself threw. Rare — the client converts
      // transport failures into decisions rather than throwing.
      if (failClosed) {
        warnUnavailable(action, "threw", true, error);
        captureEvent(client, {
          action,
          ...correlation,
          metadata: { ...metadata, outcome: "unavailable" },
        });
        return onUnavailable({ kind: "threw", error });
      }
      warnUnavailable(action, "threw", false, error);
      decision = undefined; // fall through to execute, exactly as today
    }
    if (decision !== undefined) {
      // Suppress an empty id. Every decision the client synthesizes on a
      // fail-open path carries `id: ""` (client.ts:216, convert.ts:743), and ""
      // is not a correlatable id — spreading it would put junk on the event.
      if (decision.id !== "") {
        decisionId = decision.id;
      }
      // Signal (b). The `conclusion === "ALLOW"` conjunct must stay INSIDE the
      // `if` for the narrowing to reach `onUnavailable`: TypeScript cannot narrow
      // on a method return, and hoisting the test into a `const failedOpen` makes
      // the `onUnavailable` call fail with "Type 'Decision' is not assignable to
      // type 'DecisionAllow'" (measured). Never reach for a cast here.
      //
      // The mode check is folded into the same condition, and the warnings are
      // extracted into `warnUnavailable` below, to stay within oxlint's
      // `max-depth` of 4 — the nested form trips
      // `eslint(max-depth): Blocks are nested too deeply (5)`.
      if (decision.conclusion === "ALLOW" && decision.hasFailedOpen() && failClosed) {
        warnUnavailable(action, "failed-open", true);
        captureEvent(client, {
          action,
          ...correlation,
          ...(decisionId !== undefined && { decisionId }),
          metadata: { ...metadata, outcome: "unavailable" },
        });
        return onUnavailable({ kind: "failed-open", decision });
      }
      if (decision.conclusion === "ALLOW" && decision.hasFailedOpen()) {
        warnUnavailable(action, "failed-open", false);
        // fall through to execute
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

  // Shared tail — UNCHANGED from today. Both `"allow"` paths must reach it.
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

function warnUnavailable(
  action: string,
  signal: "threw" | "failed-open",
  failClosed: boolean,
  error?: unknown,
): void {
  if (!shouldWarn()) {
    return;
  }
  if (signal === "threw") {
    if (failClosed) {
      console.warn('@arcjet/guard: guard check for "%s" errored; failing closed:', action, error);
    } else {
      console.warn('@arcjet/guard: guard check for "%s" errored; failing open:', action, error);
    }
    return;
  }
  if (failClosed) {
    console.warn('@arcjet/guard: guard check for "%s" was unavailable; failing closed.', action);
  } else {
    console.warn('@arcjet/guard: guard check for "%s" failed open (API error).', action);
  }
}
