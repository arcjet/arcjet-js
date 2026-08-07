import type { Approval, ApprovalContext, ApprovalStatus } from "eve/tools";

import { captureEvent, shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { eveAgentContext } from "./context.ts";
import { deniedReason, unavailableReason } from "./denial.ts";
import { runGate } from "./gate.ts";

/**
 * Policy for `guardApproval()` — how to gate a tool call or connection invocation via Eve.
 *
 * Specifies the action label, optional rules, metadata context, and optional handlers
 * for allowing or denying. Rules can be static or computed from the approval context.
 */
export interface GuardApprovalPolicy<TInput = Record<string, unknown>> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate, static or computed from the approval context. */
  rules?: RuleWithInput[] | ((ctx: ApprovalContext<TInput>) => RuleWithInput[]);
  /** Metadata merged over the session-derived context's. */
  metadata?: ArcjetMetadata | ((ctx: ApprovalContext<TInput>) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
  /** Status returned on ALLOW. Default `"not-applicable"`. */
  onAllow?: ApprovalStatus;
  /** Reshape the status returned on DENY. */
  onDeny?: (decision: DecisionDeny) => ApprovalStatus;
}

/**
 * Gate for Eve tool and connection calls using Arcjet guard policies.
 *
 * Returns an `Approval` function assignable to `ToolDefinition.approval`,
 * `OpenAPIConnectionDefinition.approval`, or `McpClientConnectionDefinition.approval`.
 *
 * The returned function:
 * 1. Derives context from the Eve `ApprovalContext`
 * 2. Resolves rules and metadata (each may be a function of ctx)
 * 3. Calls the guard with merged metadata including `eve.phase: "approval"`, `eve.tool`, and `eve.call`
 * 4. On ALLOW (with no failed-open), resolves to `policy.onAllow` or `"not-applicable"`
 * 5. On DENY, resolves to `policy.onDeny(decision)` or a default denial status
 * 6. On unavailable (guard threw or failed open with `onGuardError: "deny"`), resolves to
 *    a denial status or `policy.onAllow` depending on the mode
 * 7. Never throws, for any input
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardApproval } from "@arcjet/guard/vercel-eve/v0";
 * import { defineOpenAPIConnection } from "eve/connections";
 * import type { OpenAPIConnectionDefinition } from "eve/connections";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const callLimit = tokenBucket({ refillRate: 5, intervalSeconds: 60, maxTokens: 5 });
 *
 * // A connection's tools have no local `execute` to wrap, so the approval
 * // gate is the only enforcement point that reaches them. `onAllow` still
 * // requires a human after the policy passes — Eve allows one `approval`
 * // function per connection, so there is nowhere to compose `once()` or
 * // `always()` from `eve/tools/approval` alongside this.
 * const weather: OpenAPIConnectionDefinition = defineOpenAPIConnection({
 *   description: "Weather API",
 *   spec: "https://api.example.com/openapi.json",
 *   approval: guardApproval(arcjet, {
 *     action: "weather.fetched",
 *     rules: (ctx) => [callLimit({ key: ctx.session.id, requested: 1 })],
 *     onAllow: "user-approval",
 *   }),
 * });
 *
 * export default weather;
 * ```
 */
export function guardApproval<TInput = Record<string, unknown>>(
  client: ArcjetAgentClient,
  policy: GuardApprovalPolicy<TInput>,
): Approval<TInput> {
  return async (ctx: ApprovalContext<TInput>): Promise<ApprovalStatus> => {
    const allowStatus = (): ApprovalStatus => policy.onAllow ?? "not-applicable";

    try {
      // Derive context from the Eve SessionContext
      const agentCtx = eveAgentContext(ctx);

      // Create base metadata with derived context and eve-specific keys
      // eve.phase is written by guardApproval, not by runGate (which is shared with guardInbound)
      let metadata: ArcjetMetadata = {
        ...agentCtx.metadata,
        "eve.phase": "approval",
        ...(typeof ctx.toolName === "string" &&
          ctx.toolName.length > 0 && { "eve.tool": ctx.toolName }),
        ...(typeof ctx.callId === "string" && ctx.callId.length > 0 && { "eve.call": ctx.callId }),
      };

      // Resolve rules — may be a function.
      // A throwing rules callback is a caller defect; treat as unavailable.
      let ruleResolutionFailed = false;
      let ruleResolutionError: unknown;
      let rules: RuleWithInput[] | undefined;
      try {
        rules = typeof policy.rules === "function" ? policy.rules(ctx) : policy.rules;
      } catch (error) {
        ruleResolutionFailed = true;
        ruleResolutionError = error;
      }

      // Resolve metadata — may be a function.
      // A throwing metadata callback is a caller defect; treat as unavailable.
      let metadataResolutionFailed = false;
      let metadataResolutionError: unknown;
      try {
        const policyMetadata =
          typeof policy.metadata === "function" ? policy.metadata(ctx) : policy.metadata;
        metadata = { ...metadata, ...policyMetadata };
      } catch (error) {
        metadataResolutionFailed = true;
        metadataResolutionError = error;
      }

      // If a callback threw, treat as unavailable rather than guarding
      if (ruleResolutionFailed || metadataResolutionFailed) {
        const failClosed = policy.onGuardError !== "allow";
        const correlation =
          agentCtx.correlationId === undefined ? {} : { correlationId: agentCtx.correlationId };
        const error = ruleResolutionFailed ? ruleResolutionError : metadataResolutionError;
        warnCallbackFailure(policy.action, failClosed, error);
        captureEvent(client, {
          action: policy.action,
          ...correlation,
          metadata: { ...metadata, outcome: "unavailable" },
        });
        return failClosed ? { type: "denied", reason: unavailableReason() } : allowStatus();
      }

      // Call runGate with the appropriate handlers
      return await runGate(client, {
        action: policy.action,
        rules,
        correlationId: agentCtx.correlationId,
        metadata,
        onAllow: allowStatus,
        onDeny: (decision) =>
          policy.onDeny?.(decision) ?? { type: "denied", reason: deniedReason(decision) },
        onUnavailable: () =>
          policy.onGuardError === "allow"
            ? allowStatus()
            : { type: "denied", reason: unavailableReason() },
        onGuardError: policy.onGuardError ?? "deny",
      });
    } catch (error) {
      // Last resort: should never reach here if runGate never throws,
      // but if something unforeseen happens, fail closed by default
      const failClosed = policy.onGuardError !== "allow";
      warnCallbackFailure(policy.action, failClosed, error);
      return failClosed ? { type: "denied", reason: unavailableReason() } : allowStatus();
    }
  };
}

function warnCallbackFailure(action: string, failClosed: boolean, error?: unknown): void {
  if (!shouldWarn()) {
    return;
  }
  // Constant format string: `action` must not be interpolated into the first argument
  // (Semgrep requirement for actionable log messages).
  if (failClosed) {
    console.warn(
      '@arcjet/guard: approval policy for "%s" could not be evaluated; failing closed:',
      action,
      error,
    );
  } else {
    console.warn(
      '@arcjet/guard: approval policy for "%s" could not be evaluated; failing open:',
      action,
      error,
    );
  }
}
