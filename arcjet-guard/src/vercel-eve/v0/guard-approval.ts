import type { SessionContext } from "eve/context";
import type { Approval, ApprovalContext, ApprovalStatus } from "eve/tools/approval";

import { captureEvent, shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { deniedReason, unavailableReason } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import { eveAgentContext } from "./context.ts";
import { runGate } from "./gate.ts";

/**
 * Eve 0.34 already exports `eve/tools/approval`, but only `Approval`,
 * `ApprovalContext`, and `ApprovalStatus`. The rest of the public names
 * (`ApprovalPolicy`, `ApprovalConfiguration`, response-time types) moved
 * onto that path in 0.45 when `eve/tools` stopped re-exporting them.
 * Derive them from `Approval` so the peer range `>=0.34.0 <1` stays honest.
 *
 * `Approval` has been `ApprovalPolicy | ApprovalConfiguration` since 0.34,
 * and the `{ request, response? }` shape is unchanged through 0.46.
 */
type ApprovalPolicy<TInput = Record<string, unknown>> = Extract<
  Approval<TInput>,
  (ctx: ApprovalContext<TInput>) => unknown
>;
type ApprovalConfiguration<TInput = Record<string, unknown>> = Exclude<
  Approval<TInput>,
  ApprovalPolicy<TInput>
>;
type ApprovalResponsePolicy<TInput = Record<string, unknown>> = NonNullable<
  ApprovalConfiguration<TInput>["response"]
>;
type ApprovalResponseContext<TInput = Record<string, unknown>> = Parameters<
  ApprovalResponsePolicy<TInput>
>[0];
type ApprovalResponseDecision = Awaited<ReturnType<ApprovalResponsePolicy>>;

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

function allowedResponse(): ApprovalResponseDecision {
  return { status: "allowed" };
}

function rejectedResponse(reason: string): ApprovalResponseDecision {
  return { status: "rejected", reason };
}

function createRequestApproval<TInput>(
  client: ArcjetAgentClient,
  policy: GuardApprovalPolicy<TInput>,
): ApprovalPolicy<TInput> {
  return (ctx: ApprovalContext<TInput>): Promise<ApprovalStatus> => {
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
  return (ctx: ApprovalResponseContext<TInput>): Promise<ApprovalResponseDecision> => {
    return evaluateApprovalPolicy(client, policy, ctx, {
      deriveAgentContext: () => responseAgentContext(ctx),
      extraMetadata: () => responsePhaseMetadata(ctx),
      onAllow: allowedResponse,
      onDeny: (decision) => rejectedResponse(deniedReason(decision)),
      onUnavailable: () =>
        policy.onGuardError === "allow" ? allowedResponse() : rejectedResponse(unavailableReason()),
      warnKind: "approval-response",
    });
  };
}

function requestPhaseMetadata<TInput>(ctx: ApprovalContext<TInput>): ArcjetMetadata {
  return {
    "eve.phase": "approval",
    ...(typeof ctx?.toolName === "string" &&
      ctx.toolName.length > 0 && { "eve.tool": ctx.toolName }),
    ...(typeof ctx?.callId === "string" && ctx.callId.length > 0 && { "eve.call": ctx.callId }),
  };
}

function responsePhaseMetadata<TInput>(ctx: ApprovalResponseContext<TInput>): ArcjetMetadata {
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

function responseSessionId<TInput>(ctx: ApprovalResponseContext<TInput>): string | undefined {
  const id = ctx?.session?.id;
  if (typeof id !== "string" || id === "") {
    return undefined;
  }
  return id;
}

/**
 * Map Eve's response-time context onto the session shape `eveAgentContext`
 * already understands. The responder is `auth.current`, so the existing
 * `user` metadata field and session correlation apply to the person answering
 * the parked request rather than the original caller.
 */
function responseAgentContext<TInput>(
  ctx: ApprovalResponseContext<TInput>,
): ReturnType<typeof eveAgentContext> {
  // ApprovalResponseContext is not a SessionContext. Map the responder onto
  // auth.current so eveAgentContext's existing `user` / session correlation
  // apply to the person answering the parked request.
  //
  // SessionContext requires `id: string`. Keep that shape for the helper, but
  // do not pass a missing or empty id through as `eve.session` / correlation.
  const sessionId = responseSessionId(ctx);
  const session: SessionContext["session"] = {
    id: sessionId ?? "",
    auth: {
      current: ctx?.responder ?? null,
      initiator: ctx?.session?.initiator ?? null,
    },
    turn: ctx?.session?.turn ?? { id: "", sequence: 0 },
    ...(ctx?.session?.parent === undefined ? {} : { parent: ctx.session.parent }),
  };
  // eveAgentContext is expected not to invoke getSandbox / getSkill during
  // metadata derivation. If that helper later starts calling them, this
  // response-time adapter would throw.
  const sessionContext: SessionContext = {
    session,
    getSandbox() {
      return Promise.reject(new Error("@arcjet/guard: approval response context has no sandbox"));
    },
    getSkill() {
      throw new Error("@arcjet/guard: approval response context has no skill");
    },
  };
  return omitBlankSessionCapture(eveAgentContext(sessionContext), sessionId);
}

function omitBlankSessionCapture(
  agent: ReturnType<typeof eveAgentContext>,
  sessionId: string | undefined,
): ReturnType<typeof eveAgentContext> {
  if (sessionId !== undefined) {
    return agent;
  }
  const metadata = agent.metadata;
  if (metadata === undefined || metadata["eve.session"] !== "") {
    return agent;
  }
  const rest: ArcjetMetadata = { ...metadata };
  delete rest["eve.session"];
  return {
    correlationId: agent.correlationId,
    ...(Object.keys(rest).length > 0 ? { metadata: rest } : {}),
  };
}

type ApprovalPolicyOptions<TResult> = {
  deriveAgentContext: () => ReturnType<typeof eveAgentContext>;
  extraMetadata: () => ArcjetMetadata;
  onAllow: () => TResult;
  onDeny: (decision: DecisionDeny) => TResult;
  onUnavailable: () => TResult;
  warnKind: "approval" | "approval-response";
};

type ApprovalPolicyConfig<TCtx> = {
  action: string;
  rules?: RuleWithInput[] | ((ctx: TCtx) => RuleWithInput[]);
  metadata?: ArcjetMetadata | ((ctx: TCtx) => ArcjetMetadata);
  onGuardError?: OnGuardError;
};

type CallbackResolution<TResult> =
  | { status: "resolved"; rules: RuleWithInput[] | undefined; metadata: ArcjetMetadata }
  | { status: "failed"; result: TResult };

function resolveApprovalCallbacks<TCtx, TResult>(
  client: ArcjetAgentClient,
  policy: ApprovalPolicyConfig<TCtx>,
  ctx: TCtx,
  options: ApprovalPolicyOptions<TResult>,
  agentCtx: ReturnType<typeof eveAgentContext>,
  metadata: ArcjetMetadata,
): CallbackResolution<TResult> {
  // Resolve both callbacks independently so a throw in one cannot skip
  // the other. Merge extra metadata only when the metadata callback resolves.
  let ruleResolutionFailed = false;
  let ruleResolutionError: unknown;
  let rules: RuleWithInput[] | undefined;
  try {
    rules = typeof policy.rules === "function" ? policy.rules(ctx) : policy.rules;
  } catch (error) {
    ruleResolutionFailed = true;
    ruleResolutionError = error;
  }

  let metadataResolutionFailed = false;
  let metadataResolutionError: unknown;
  let resolvedMetadata = metadata;
  try {
    const policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(ctx) : policy.metadata;
    resolvedMetadata = { ...metadata, ...policyMetadata };
  } catch (error) {
    metadataResolutionFailed = true;
    metadataResolutionError = error;
  }

  if (ruleResolutionFailed || metadataResolutionFailed) {
    const failClosed = policy.onGuardError !== "allow";
    const correlation =
      agentCtx.correlationId === undefined ? {} : { correlationId: agentCtx.correlationId };
    const error = ruleResolutionFailed ? ruleResolutionError : metadataResolutionError;
    warnCallbackFailure(options.warnKind, policy.action, failClosed, error);
    captureEvent(client, {
      action: policy.action,
      ...correlation,
      metadata: { ...resolvedMetadata, outcome: "unavailable" },
    });
    return {
      status: "failed",
      result: failClosed ? options.onUnavailable() : options.onAllow(),
    };
  }

  return { status: "resolved", rules, metadata: resolvedMetadata };
}

async function evaluateApprovalPolicy<TCtx, TResult>(
  client: ArcjetAgentClient,
  policy: ApprovalPolicyConfig<TCtx>,
  ctx: TCtx,
  options: ApprovalPolicyOptions<TResult>,
): Promise<TResult> {
  try {
    const agentCtx = options.deriveAgentContext();

    // Create base metadata with derived context and eve-specific keys.
    // eve.phase is written by guardApproval, not by runGate (which is shared with guardInbound).
    const metadata: ArcjetMetadata = {
      ...agentCtx.metadata,
      ...options.extraMetadata(),
    };

    const resolved = resolveApprovalCallbacks(client, policy, ctx, options, agentCtx, metadata);
    if (resolved.status === "failed") {
      return resolved.result;
    }

    return await runGate(client, {
      action: policy.action,
      rules: resolved.rules,
      correlationId: agentCtx.correlationId,
      metadata: resolved.metadata,
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
