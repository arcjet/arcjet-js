import type { PolicyInputMap } from "../policy-input.ts";
import type { ArcjetMetadata, DecisionAllow, DecisionDeny, RuleWithInput } from "../types.ts";
import { captureEvent } from "./capture.ts";
import type { ArcjetAgentClient } from "./capture.ts";
import type { ArcjetAgentContext } from "./context.ts";
import { runGuarded } from "./guarded.ts";

/**
 * Thrown by `guardAction()` when guard denies the action. Carries the
 * denying decision so callers can branch on `error.decision.reason`,
 * catch-and-skip, or abort the workflow.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { guardAction, ArcjetDeniedError, createAgentContext } from "@arcjet/guard/vercel-ai/v7";
 *
 * const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
 * const ctx = createAgentContext({ correlationId: "workflow-123" });
 *
 * const commentLimit = tokenBucket({
 *   refillRate: 5,
 *   intervalSeconds: 60,
 *   maxTokens: 5,
 * });
 *
 * try {
 *   await guardAction(
 *     arcjet,
 *     ctx,
 *     {
 *       action: "github.pr-commented",
 *       rules: [commentLimit({ key: userId })],
 *     },
 *     async () => {
 *       // This function runs only on ALLOW
 *       return await github.createComment({ body: "Review completed" });
 *     },
 *   );
 * } catch (error) {
 *   if (error instanceof ArcjetDeniedError) {
 *     // Handle denial: log, notify, skip this step
 *     console.log(`Rate limited: ${error.decision.reason}`);
 *   } else {
 *     throw error;
 *   }
 * }
 * ```
 */
export class ArcjetDeniedError extends Error {
  readonly decision: DecisionDeny;

  constructor(action: string, decision: DecisionDeny) {
    super(`Arcjet denied action "${action}" (${decision.reason}); decision ${decision.id}`);
    this.name = "ArcjetDeniedError";
    this.decision = decision;
  }
}

/**
 * Thrown by `guardAction()` when the guard policy could not be evaluated due to
 * an unavailable guard service. Carries information about why evaluation failed
 * (either the guard call threw or a decision failed open) so operators can
 * distinguish SDK errors from infrastructure outages.
 *
 * When `onGuardError: "deny"` is set (the default), both guard-unavailable
 * signals are caught and result in this error. This is distinct from
 * `ArcjetDeniedError`, which is thrown when a rule actively denies the action.
 */
// oxlint-disable-next-line eslint/max-classes-per-file -- Paired exception class for unavailable vs denied paths
export class ArcjetGuardUnavailableError extends Error {
  readonly action: string;
  readonly decision?: DecisionAllow;

  constructor(action: string, init: { cause: unknown } | { decision: DecisionAllow }) {
    super(
      `policy for "${action}" could not be evaluated`,
      "cause" in init ? { cause: init.cause } : {},
    );
    this.name = "ArcjetGuardUnavailableError";
    this.action = action;
    if ("decision" in init) {
      this.decision = init.decision;
    }
  }
}

/**
 * Whether to fail open or closed when guard evaluation is unavailable.
 *
 * - `"allow"`: Execute the wrapped action and emit a warning, preserving the
 *   original behavior where SDK/infrastructure outages do not block execution.
 * - `"deny"` (default): Do not execute; throw `ArcjetGuardUnavailableError` and
 *   capture the outcome as `"unavailable"` rather than executing.
 */
export type OnGuardError = "allow" | "deny";

/**
 * Policy for `guardAction()` — how to guard an app-invoked action.
 *
 * Specifies the guard action name, optional rules to evaluate, and additional
 * metadata to merge with the request context. Rules can be rate limits, custom
 * checks, or other guards. Omit `rules` to submit none: the guard call still
 * happens, so the action is recorded and remains reachable by policy
 * configured outside the code, but nothing local is enforced.
 */
export interface GuardActionPolicy {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /**
   * Rules to evaluate. Omitting this, or passing `[]`, submits no rules — it
   * does not skip the guard call, which still costs a round trip and returns a
   * decision.
   */
  rules?: RuleWithInput[];
  /**
   * Opaque identity asserted by trusted application code. Derive this from an
   * authenticated server-side identity; never pass user-controlled input.
   */
  actor?: string;
  /** Explicitly typed remote-policy inputs. */
  inputs?: PolicyInputMap;
  /** Metadata merged over the context's. */
  metadata?: ArcjetMetadata;
  /**
   * How to respond when guard evaluation is unavailable (the default is
   * `"deny"`). With `"allow"`, the wrapped action executes on any guard
   * error or failed-open decision, and a warning is emitted. With `"deny"`,
   * `ArcjetGuardUnavailableError` is thrown instead.
   */
  onGuardError?: OnGuardError;
}

/**
 * Guard an action and run a callback, throwing `ArcjetDeniedError` on denial or
 * `ArcjetGuardUnavailableError` when guard is unavailable (depending on
 * `policy.onGuardError`).
 *
 * Always runs `guard()`, submitting `policy.rules` or none; on DENY it throws
 * `ArcjetDeniedError` without running `fn`. On ALLOW — which is what submitting
 * no rules returns — `fn` runs and the outcome is captured. With the default
 * `onGuardError: "deny"`, guard API errors and failed-open decisions throw
 * `ArcjetGuardUnavailableError` without running `fn`. With `onGuardError:
 * "allow"`, both signals fail open: `fn` still runs, with a warning gated on
 * `ARCJET_LOG_LEVEL`.
 *
 * @param client - Guard client from `launchArcjet()`
 * @param ctx - Security context with correlation ID and metadata
 * @param policy - Execution policy: `action` (required), `rules`, `metadata`, `onGuardError`
 * @param fn - Async function to execute on ALLOW; never called on DENY or (by default) when unavailable
 * @returns The return value of `fn` on success
 * @throws {ArcjetDeniedError} When guard denies the action
 * @throws {ArcjetGuardUnavailableError} When guard is unavailable and `onGuardError: "deny"` (the default)
 * @throws Any error thrown by `fn`
 *
 * @example
 * ```ts
 * import { launchArcjet, fixedWindow } from "@arcjet/guard";
 * import { guardAction, createAgentContext } from "@arcjet/guard/vercel-ai/v7";
 *
 * const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
 * const limit = fixedWindow({ maxRequests: 10, windowSeconds: 60 });
 * const ctx = createAgentContext({ correlationId: "workflow-456" });
 *
 * const result = await guardAction(
 *   arcjet,
 *   ctx,
 *   { action: "database.updated", rules: [limit({ key: userId })] },
 *   async () => {
 *     return await db.update({ id: recordId, data });
 *   },
 * );
 * ```
 */
// oxlint-disable-next-line eslint/require-await -- Async wrapper for runGuarded
export async function guardAction<T>(
  client: ArcjetAgentClient,
  ctx: ArcjetAgentContext,
  policy: GuardActionPolicy,
  fn: () => Promise<T>,
): Promise<T> {
  return runGuarded(client, {
    action: policy.action,
    rules: policy.rules,
    ...(policy.actor !== undefined && { actor: policy.actor }),
    ...(policy.inputs !== undefined && { inputs: policy.inputs }),
    correlationId: ctx.correlationId,
    metadata: { ...ctx.metadata, ...policy.metadata },
    onDeny: (decision) => {
      throw new ArcjetDeniedError(policy.action, decision);
    },
    onUnavailable: (unavailable) => {
      if (unavailable.kind === "threw") {
        throw new ArcjetGuardUnavailableError(policy.action, {
          cause: unavailable.error,
        });
      }
      throw new ArcjetGuardUnavailableError(policy.action, {
        decision: unavailable.decision,
      });
    },
    execute: fn,
    onGuardError: policy.onGuardError ?? "deny",
  });
}

/** Options for `captureAction()`. */
export interface CaptureActionOptions {
  /** Capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Metadata merged over the context's. */
  metadata?: ArcjetMetadata;
}

/**
 * Observe-only sugar over the client's `capture()`: records that the
 * application did something, correlated to the run. Fire-and-forget; never
 * throws.
 *
 * Unlike `guardAction()`, this does not invoke the guard; it records a bare
 * fact about what the application did. No `outcome` metadata is added (that's
 * only for guarded executions).
 *
 * @param client - Guard client from `launchArcjet()`
 * @param ctx - Security context with correlation ID and metadata
 * @param opts - Capture options: `action` (required), `metadata` (optional)
 *
 * @example
 * ```ts
 * captureAction(arcjetClient, ctx, {
 *   action: "notification.sent",
 *   metadata: { channel: "slack", recipient: "user-123" },
 * });
 * ```
 */
export function captureAction(
  client: ArcjetAgentClient,
  ctx: ArcjetAgentContext,
  opts: CaptureActionOptions,
): void {
  captureEvent(client, {
    action: opts.action,
    correlationId: ctx.correlationId,
    metadata: { ...ctx.metadata, ...opts.metadata },
  });
}
