import type { SessionContext } from "eve/context";
import type {
  Approval,
  ApprovalConfiguration,
  ApprovalContext,
  ApprovalPolicy,
  ApprovalResponseContext,
  ApprovalResponseDecision,
  ApprovalResponsePolicy,
  ApprovalStatus,
} from "eve/tools";

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
 *
 * Set `response` to also authorize who may approve a parked HITL request. Omitting
 * it keeps the returned value as Eve's function form (`ApprovalPolicy`).
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
  /**
   * Optional response-time policy. When set, `guardApproval` returns Eve's
   * `{ request, response }` form so the same slot can authorize the responder
   * after `onAllow: "user-approval"` parks the call.
   */
  response?: GuardApprovalResponsePolicy<TInput>;
}

/**
 * Policy evaluated against Eve's `ApprovalResponseContext` — who may approve a
 * parked HITL request. A rejection leaves the approval pending; it does not
 * deny the tool.
 */
export interface GuardApprovalResponsePolicy<TInput = Record<string, unknown>> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate, static or computed from the response context. */
  rules?: RuleWithInput[] | ((ctx: ApprovalResponseContext<TInput>) => RuleWithInput[]);
  /** Metadata merged over the session-derived context's. */
  metadata?: ArcjetMetadata | ((ctx: ApprovalResponseContext<TInput>) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
}

/**
 * Gate for Eve tool and connection calls using Arcjet guard policies.
 *
 * Returns an Eve `Approval` assignable to `ToolDefinition.approval`,
 * `OpenAPIConnectionDefinition.approval`, or `McpClientConnectionDefinition.approval`.
 *
 * When `policy.response` is omitted, the return value is Eve's function form
 * (`ApprovalPolicy`). When `response` is set, the return value is
 * `{ request, response }` (`ApprovalConfiguration`).
 *
 * The request-time function:
 * 1. Derives context from the Eve `ApprovalContext`
 * 2. Resolves rules and metadata (each may be a function of ctx)
 * 3. Calls the guard with merged metadata including `eve.phase: "approval"`, `eve.tool`, and `eve.call`
 * 4. On ALLOW (with no failed-open), resolves to `policy.onAllow` or `"not-applicable"`
 * 5. On DENY, resolves to `policy.onDeny(decision)` or a default denial status
 * 6. On unavailable (guard threw or failed open with `onGuardError: "deny"`), resolves to
 *    a denial status or `policy.onAllow` depending on the mode
 * 7. Never throws, for any input
 *
 * The optional response-time function authorizes the responder of a parked
 * HITL request. ALLOW resolves to `{ status: "allowed" }`; DENY or
 * unavailable-with-deny resolves to `{ status: "rejected", reason }` (the
 * approval stays pending). Capture metadata uses `eve.phase: "approval-response"`
 * and the responder as the actor. It also never throws.
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
 * // requires a human after the policy passes. The optional `response` policy
 * // authorizes who may approve the parked request. Eve still allows one
 * // `approval` field per connection; it can be this function or the
 * // `{ request, response }` object `guardApproval` returns when `response` is set.
 * const weather: OpenAPIConnectionDefinition = defineOpenAPIConnection({
 *   description: "Weather API",
 *   spec: "https://api.example.com/openapi.json",
 *   approval: guardApproval(arcjet, {
 *     action: "weather.fetched",
 *     rules: (ctx) => [callLimit({ key: ctx.session.id, requested: 1 })],
 *     onAllow: "user-approval",
 *     response: {
 *       action: "weather.approved",
 *       rules: (ctx) => [callLimit({ key: ctx.responder.principalId, requested: 1 })],
 *     },
 *   }),
 * });
 *
 * export default weather;
 * ```
 */
export function guardApproval<TInput = Record<string, unknown>>(
  client: ArcjetAgentClient,
  policy: GuardApprovalPolicy<TInput> & { response: GuardApprovalResponsePolicy<TInput> },
): ApprovalConfiguration<TInput>;
export function guardApproval<TInput = Record<string, unknown>>(
  client: ArcjetAgentClient,
  policy: GuardApprovalPolicy<TInput>,
): ApprovalPolicy<TInput>;
export function guardApproval<TInput = Record<string, unknown>>(
  client: ArcjetAgentClient,
  policy: GuardApprovalPolicy<TInput>,
): Approval<TInput> {
  const request = createRequestApproval(client, policy);
  if (policy.response === undefined) {
    return request;
  }
  return {
    request,
    response: createResponseApproval(client, policy.response),
  };
}

function createRequestApproval<TInput>(
  client: ArcjetAgentClient,
  policy: GuardApprovalPolicy<TInput>,
): ApprovalPolicy<TInput> {
  return async (ctx: ApprovalContext<TInput>): Promise<ApprovalStatus> => {
    const allowStatus = (): ApprovalStatus => policy.onAllow ?? "not-applicable";

    return evaluateApprovalPolicy(client, policy, ctx, {
      deriveAgentContext: () => eveAgentContext(ctx),
      extraMetadata: () => requestPhaseMetadata(ctx),
      onAllow: allowStatus,
      onDeny: (decision) =>
        policy.onDeny?.(decision) ?? { type: "denied", reason: deniedReason(decision) },
      onUnavailable: () =>
        policy.onGuardError === "allow"
          ? allowStatus()
          : { type: "denied", reason: unavailableReason() },
      warnKind: "approval",
    });
  };
}

function createResponseApproval<TInput>(
  client: ArcjetAgentClient,
  policy: GuardApprovalResponsePolicy<TInput>,
): ApprovalResponsePolicy<TInput> {
  return async (ctx: ApprovalResponseContext<TInput>): Promise<ApprovalResponseDecision> => {
    const allowStatus = (): ApprovalResponseDecision => ({ status: "allowed" });
    const rejectStatus = (reason: string): ApprovalResponseDecision => ({
      status: "rejected",
      reason,
    });

    return evaluateApprovalPolicy(client, policy, ctx, {
      deriveAgentContext: () => responseAgentContext(ctx),
      extraMetadata: () => responsePhaseMetadata(ctx),
      onAllow: allowStatus,
      onDeny: (decision) => rejectStatus(deniedReason(decision)),
      onUnavailable: () =>
        policy.onGuardError === "allow" ? allowStatus() : rejectStatus(unavailableReason()),
      warnKind: "approval-response",
    });
  };
}

function requestPhaseMetadata(ctx: ApprovalContext): ArcjetMetadata {
  return {
    "eve.phase": "approval",
    ...(typeof ctx?.toolName === "string" &&
      ctx.toolName.length > 0 && { "eve.tool": ctx.toolName }),
    ...(typeof ctx?.callId === "string" && ctx.callId.length > 0 && { "eve.call": ctx.callId }),
  };
}

function responsePhaseMetadata(ctx: ApprovalResponseContext): ArcjetMetadata {
  const request = ctx?.request;
  return {
    "eve.phase": "approval-response",
    ...(typeof request?.toolName === "string" &&
      request.toolName.length > 0 && { "eve.tool": request.toolName }),
    ...(typeof request?.callId === "string" &&
      request.callId.length > 0 && { "eve.call": request.callId }),
    ...(typeof request?.requestId === "string" &&
      request.requestId.length > 0 && { "eve.request": request.requestId }),
  };
}

/**
 * Map Eve's response-time context onto the session shape `eveAgentContext`
 * already understands. The responder is `auth.current`, so the existing
 * `user` metadata field and session correlation apply to the person answering
 * the parked request rather than the original caller.
 */
function responseAgentContext(ctx: ApprovalResponseContext): ReturnType<typeof eveAgentContext> {
  return eveAgentContext({
    session: {
      id: ctx?.session?.id,
      auth: {
        current: ctx?.responder ?? null,
        initiator: ctx?.session?.initiator ?? null,
      },
      turn: ctx?.session?.turn,
      parent: ctx?.session?.parent,
    },
    getSandbox() {
      return Promise.reject(
        new Error("@arcjet/guard: approval response context has no sandbox"),
      );
    },
    getSkill() {
      throw new Error("@arcjet/guard: approval response context has no skill");
    },
  } as SessionContext);
}

async function evaluateApprovalPolicy<TCtx, TResult>(
  client: ArcjetAgentClient,
  policy: {
    action: string;
    rules?: RuleWithInput[] | ((ctx: TCtx) => RuleWithInput[]);
    metadata?: ArcjetMetadata | ((ctx: TCtx) => ArcjetMetadata);
    onGuardError?: OnGuardError;
  },
  ctx: TCtx,
  options: {
    deriveAgentContext: () => ReturnType<typeof eveAgentContext>;
    extraMetadata: () => ArcjetMetadata;
    onAllow: () => TResult;
    onDeny: (decision: DecisionDeny) => TResult;
    onUnavailable: () => TResult;
    warnKind: "approval" | "approval-response";
  },
): Promise<TResult> {
  try {
    const agentCtx = options.deriveAgentContext();

    // Create base metadata with derived context and eve-specific keys.
    // eve.phase is written by guardApproval, not by runGate (which is shared with guardInbound).
    let metadata: ArcjetMetadata = {
      ...agentCtx.metadata,
      ...options.extraMetadata(),
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
      warnCallbackFailure(options.warnKind, policy.action, failClosed, error);
      captureEvent(client, {
        action: policy.action,
        ...correlation,
        metadata: { ...metadata, outcome: "unavailable" },
      });
      return failClosed ? options.onUnavailable() : options.onAllow();
    }

    // Call runGate with the appropriate handlers
    return await runGate(client, {
      action: policy.action,
      rules,
      correlationId: agentCtx.correlationId,
      metadata,
      onAllow: options.onAllow,
      onDeny: options.onDeny,
      onUnavailable: options.onUnavailable,
      onGuardError: policy.onGuardError ?? "deny",
    });
  } catch (error) {
    // Last resort: should never reach here if runGate never throws,
    // but if something unforeseen happens, fail closed by default
    const failClosed = policy.onGuardError !== "allow";
    warnCallbackFailure(options.warnKind, policy.action, failClosed, error);
    return failClosed ? options.onUnavailable() : options.onAllow();
  }
}

function warnCallbackFailure(
  kind: "approval" | "approval-response",
  action: string,
  failClosed: boolean,
  error?: unknown,
): void {
  if (!shouldWarn()) {
    return;
  }
  // Constant format string: `action` must not be interpolated into the first argument
  // (Semgrep requirement for actionable log messages).
  if (kind === "approval-response") {
    if (failClosed) {
      console.warn(
        '@arcjet/guard: approval response policy for "%s" could not be evaluated; failing closed:',
        action,
        error,
      );
    } else {
      console.warn(
        '@arcjet/guard: approval response policy for "%s" could not be evaluated; failing open:',
        action,
        error,
      );
    }
    return;
  }
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
