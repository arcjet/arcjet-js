import type { PolicyInputMap } from "../policy-input.ts";
import type {
  ArcjetMetadata,
  Decision,
  DecisionAllow,
  DecisionDeny,
  RuleWithInput,
} from "../types.ts";
import { captureEvent, shouldWarn } from "./capture.ts";
import type { ArcjetAgentClient } from "./capture.ts";

/**
 * The guard → deny → execute → capture sequence shared by `guardTool()` and
 * `guardAction()`. Callers resolve `rules`, `metadata`, and `correlationId`
 * (including any per-input functions and overrides) and pass the final values;
 * this runs the common flow:
 *
 * 1. Call `guard()` — always, including when `rules` is omitted or empty, which
 *    is sent as `[]`. Both guard-unavailable signals (threw and failed-open)
 *    are governed by `onGuardError`: with `"deny"` (the default), both trigger
 *    `onUnavailable` without executing; with `"allow"`, both fail open and
 *    proceed to execute.
 * 2. On DENY, capture `outcome: "denied"` and return `onDeny(decision)`.
 * 3. Otherwise run `execute()`, capturing `outcome: "success"` when policy
 *    judged the action, or `outcome: "degraded"` when `"allow"` let it run
 *    unjudged — or, if it throws, `outcome: "error"` before rethrowing.
 *
 * `onDeny` returns the value the caller hands back on denial. Model-facing
 * helpers wrap the shared `ArcjetDenialResult` in a framework-idiomatic
 * envelope; `guardAction` throws `ArcjetDeniedError`. Those are different
 * handlers — they must not be the same function.
 */
export async function runGuarded<T>(
  client: ArcjetAgentClient,
  params: {
    action: string;
    rules: RuleWithInput[] | undefined;
    correlationId: string | undefined;
    metadata: ArcjetMetadata;
    actor?: string;
    inputs?: PolicyInputMap;
    resolvePolicy?: () => Promise<{ actor?: string; inputs?: PolicyInputMap }>;
    onDeny: (decision: DecisionDeny) => T;
    onUnavailable: (
      unavailable:
        | { kind: "threw"; error: unknown }
        | { kind: "failed-open"; decision: DecisionAllow },
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
    actor,
    inputs,
    resolvePolicy,
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

  // Cleared wherever `onGuardError: "allow"` lets the action run without a
  // complete judgement, so the capture at the tail reports what happened
  // rather than claiming a success policy never made.
  let judgedFully = true;

  let decisionId: string | undefined;
  let decision: Decision | undefined;
  try {
    const resolved = resolvePolicy === undefined ? { actor, inputs } : await resolvePolicy();
    // Always called, even with no rules. An empty set is not the same as no
    // call: it still produces a decision, which is what makes this call site
    // reachable by policy configured outside the code, and gives a
    // capture-only call a `decisionId` to correlate against.
    decision = await client.guard({
      label: action,
      rules: rules ?? [],
      ...correlation,
      metadata,
      ...(resolved.actor !== undefined && { actor: resolved.actor }),
      ...(resolved.inputs !== undefined && { inputs: resolved.inputs }),
    });
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
    decision = undefined; // fall through to execute
    judgedFully = false;
  }
  if (decision !== undefined) {
    // Suppress an empty id. Every decision the client synthesizes on a
    // fail-open path carries `id: ""` (client.ts, convert.ts), and "" is not a
    // correlatable id — spreading it would put junk on the event.
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
      // fall through to execute, with nothing judged
      judgedFully = false;
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
    metadata: { ...metadata, outcome: judgedFully ? "success" : "degraded" },
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
  // Constant format string: `action` must not be interpolated into the first argument
  // (Semgrep requirement for actionable log messages).
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
