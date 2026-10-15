import type { Approval, ApprovalContext, ApprovalStatus } from "eve/tools/approval";

export type { Approval, ApprovalContext, ApprovalStatus };

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
export type ApprovalPolicy<TInput = Record<string, unknown>> = Extract<
  Approval<TInput>,
  (ctx: ApprovalContext<TInput>) => unknown
>;
export type ApprovalConfiguration<TInput = Record<string, unknown>> = Exclude<
  Approval<TInput>,
  ApprovalPolicy<TInput>
>;
export type ApprovalResponsePolicy<TInput = Record<string, unknown>> = NonNullable<
  ApprovalConfiguration<TInput>["response"]
>;
export type ApprovalResponseContext<TInput = Record<string, unknown>> = Parameters<
  ApprovalResponsePolicy<TInput>
>[0];
export type ApprovalResponseDecision = Awaited<ReturnType<ApprovalResponsePolicy>>;
