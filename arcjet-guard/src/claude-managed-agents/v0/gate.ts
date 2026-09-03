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
 * Permit-only gate for inbound Managed Agents events. Shared by `guardEvents`.
 * Does not execute the send — the allow tail means "permitted to send".
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

  const correlation = correlationId === undefined ? {} : { correlationId };
  const failClosed = onGuardError === "deny";

  let decisionId: string | undefined;
  let decision: Decision | undefined;
  try {
    decision = await client.guard({ label: action, rules: rules ?? [], ...correlation, metadata });
  } catch (error) {
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
  }

  if (decision !== undefined) {
    if (decision.id !== "") {
      decisionId = decision.id;
    }
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
