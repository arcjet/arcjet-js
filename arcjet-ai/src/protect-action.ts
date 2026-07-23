import type { DecisionDeny, RuleWithInput } from "@arcjet/guard";

import { captureEvent } from "./client.js";
import type { ArcjetAiClient } from "./client.js";
import type { ArcjetAiContext } from "./context.js";
import { runGuarded } from "./guarded.js";

/**
 * Thrown by `protectAction()` when guard denies the action. Carries the
 * denying decision so callers can branch on `error.decision.reason`,
 * catch-and-skip, or abort the workflow.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { protectAction, ArcjetDeniedError, createAiContext } from "@arcjet/ai";
 *
 * const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
 * const ctx = createAiContext({ correlationId: "workflow-123" });
 *
 * const commentLimit = tokenBucket({
 *   refillRate: 5,
 *   intervalSeconds: 60,
 *   maxTokens: 5,
 * });
 *
 * try {
 *   await protectAction(
 *     arcjet,
 *     ctx,
 *     {
 *       action: "github.pr_commented",
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
 *     return;
 *   }
 *   throw error;
 * }
 * ```
 *
 * **Decision rule:**
 * - Model-invoked actions → `protectTool()` (AI SDK integration)
 * - App-invoked actions → `protectAction()` (non-AI code)
 * - Observe-only (no guard) → `captureAction()` (event capture only)
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
 * Policy for `protectAction()` — how to guard an app-invoked action.
 *
 * Specifies the guard action name, optional rules to evaluate, and additional
 * metadata to merge with the request context. Rules can be rate limits, custom
 * checks, or other guards. Omit `rules` for capture-only instrumentation
 * (record the action without enforcing any checks).
 */
export interface ProtectActionPolicy {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate; omit for capture-only behavior. */
  rules?: RuleWithInput[];
  /** Metadata merged over the context's. */
  metadata?: Record<string, string>;
}

/**
 * Guard an action and run a callback, throwing `ArcjetDeniedError` on denial.
 *
 * **Execution order:**
 * 1. Extract context and policy configuration (including metadata merge)
 * 2. Invoke `guard()` with rules if provided (or skip if rules are empty/omitted)
 * 3. On DENY, throw `ArcjetDeniedError` without running `fn`
 * 4. On ALLOW or when rules are skipped, execute `fn` and capture the outcome
 * 5. Fire capture events throughout (on deny, on error, on success)
 *
 * **Capture-only mode:** When `policy.rules` is omitted or empty,
 * the guard check is skipped entirely and the call proceeds to execution with
 * capture-only instrumentation (no guard decision, no decision ID).
 *
 * **Fail-open posture:** When the guard API errors (transport failure, timeout),
 * `fn` still executes and the failure is observable via a warning (when
 * `ARCJET_LOG_LEVEL` is set).
 *
 * @param client - Guard client with optional `experimental_capture()` method
 * @param ctx - Security context with correlation ID and metadata
 * @param policy - Execution policy: `action` (required), `rules`, `metadata`
 * @param fn - Async function to execute on ALLOW; never called on DENY
 * @returns The return value of `fn` on success; throws `ArcjetDeniedError` on denial
 * @throws {ArcjetDeniedError} When guard denies the action
 * @throws Any error thrown by `fn`
 *
 * @example
 * ```ts
 * import { launchArcjet, fixedWindow } from "@arcjet/guard";
 * import { protectAction, createAiContext } from "@arcjet/ai";
 *
 * const arcjet = launchArcjet({ key: process.env.ARCJET_KEY! });
 * const limit = fixedWindow({ maxRequests: 10, windowSeconds: 60 });
 * const ctx = createAiContext({ correlationId: "workflow-456" });
 *
 * const result = await protectAction(
 *   arcjet,
 *   ctx,
 *   { action: "database.updated", rules: [limit({ key: userId })] },
 *   async () => {
 *     return await db.update({ id: recordId, data });
 *   },
 * );
 * ```
 */
export async function protectAction<T>(
  client: ArcjetAiClient,
  ctx: ArcjetAiContext,
  policy: ProtectActionPolicy,
  fn: () => Promise<T>,
): Promise<T> {
  return runGuarded(client, {
    action: policy.action,
    rules: policy.rules,
    correlationId: ctx.correlationId,
    metadata: { ...ctx.metadata, ...policy.metadata },
    onDeny: (decision) => {
      throw new ArcjetDeniedError(policy.action, decision);
    },
    execute: fn,
  });
}

/** Options for `captureAction()`. */
export interface CaptureActionOptions {
  /** Capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Metadata merged over the context's. */
  metadata?: Record<string, string>;
}

/**
 * Observe-only sugar over `experimental_capture()`: records that the
 * application did something, correlated to the run. Fire-and-forget; never
 * throws.
 *
 * Unlike `protectAction()`, this does not invoke the guard; it records a bare
 * fact about what the application did. No `outcome` metadata is added (that's
 * only for guarded executions).
 *
 * @param client - Guard client with optional `experimental_capture()` method
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
  client: ArcjetAiClient,
  ctx: ArcjetAiContext,
  opts: CaptureActionOptions,
): void {
  captureEvent(client, {
    action: opts.action,
    correlationId: ctx.correlationId,
    metadata: { ...ctx.metadata, ...opts.metadata },
  });
}
