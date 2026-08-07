import { captureEvent, shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type {
  ArcjetMetadata,
  Decision,
  DecisionAllow,
  DecisionDeny,
  RuleWithInput,
} from "../../types.ts";

/**
 * The guard → capture sequence for a call site that decides whether something
 * may run but does not run it. This is the gate engine shared by all Eve
 * approval enforcement (tools, OpenAPI connections, MCP connections).
 *
 * Unlike `runGuarded`, which also executes and captures execution outcomes:
 * - There is no execute. The allow tail returns immediately. Nothing here can
 *   produce `"success"` or `"error"` — a gate that passed has not done the thing.
 * - The allow outcome is `"allowed"`, not `"success"` — a distinction that
 *   keeps "the tool ran" and "the tool was permitted to run" separate on the
 *   capture stream.
 *
 * Contract:
 *
 * 1. `onGuardError` defaults to `"deny"`.
 * 2. Build `correlation` as `correlationId === undefined ? {} : { correlationId }` —
 *    the field is optional under `exactOptionalPropertyTypes`, so assigning
 *    `undefined` is a type error.
 * 3. Call `client.guard()` inside a `try`. Always call it, including with no rules.
 * 4. On throw: if failing closed, warn, capture with `outcome: "unavailable"`,
 *    return `onUnavailable({ kind: "threw", error })`. If failing open, warn
 *    and fall through to the allow tail.
 * 5. Suppress `decision.id === ""` — a fail-open decision carries an empty id
 *    and `""` is not a correlatable value.
 * 6. If ALLOW with failed-open and failing closed: warn, capture `"unavailable"`,
 *    `onUnavailable({ kind: "failed-open", decision })`. Keep the conjunction
 *    inside the single `if`: TypeScript cannot narrow on a method return.
 * 7. If ALLOW with failed-open and failing open: warn, fall through.
 * 8. If DENY: capture `"denied"`, return `onDeny(decision)`.
 * 9. Allow tail: capture `"allowed"`, return `onAllow()`.
 *
 * Every capture goes through `captureEvent`, which swallows throws.
 */
export async function runGate<T>(
  client: ArcjetAgentClient,
  params: {
    action: string;
    rules: RuleWithInput[] | undefined;
    correlationId: string | undefined;
    metadata: ArcjetMetadata;
    onAllow: () => T;
    onDeny: (decision: DecisionDeny) => T;
    onUnavailable: (
      unavailable:
        | { kind: "threw"; error: unknown }
        | { kind: "failed-open"; decision: DecisionAllow },
    ) => T;
    onGuardError?: "allow" | "deny";
  },
): Promise<T> {
  const {
    action,
    rules,
    correlationId,
    metadata,
    onAllow,
    onDeny,
    onUnavailable,
    onGuardError = "deny",
  } = params;

  // Spread onto every guard/capture payload so `correlationId` is included
  // when set and omitted otherwise (it is optional under
  // `exactOptionalPropertyTypes`, so assigning `undefined` is a type error).
  const correlation = correlationId === undefined ? {} : { correlationId };

  const failClosed = onGuardError === "deny";

  let decisionId: string | undefined;
  let decision: Decision | undefined;
  try {
    // Always called, even with no rules. An empty set is not the same as no
    // call: it still produces a decision, which is what makes this call site
    // reachable by policy configured outside the code, and gives a
    // capture-only call a `decisionId` to correlate against.
    decision = await client.guard({ label: action, rules: rules ?? [], ...correlation, metadata });
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
    // fall through to allow tail
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
      // fall through to allow tail
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

  // Shared allow tail — both `"allow"` paths must reach it.
  captureEvent(client, {
    action,
    ...correlation,
    ...(decisionId !== undefined && { decisionId }),
    metadata: { ...metadata, outcome: "allowed" },
  });
  return onAllow();
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
