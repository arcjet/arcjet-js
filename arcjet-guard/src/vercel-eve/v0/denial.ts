/**
 * Structured denial payload used when Eve's `guardTool` is asked to resolve
 * (`onDeny: "result"`) instead of throwing.
 *
 * Eve's idiomatic default is to *throw* `ArcjetDeniedError` — Eve projects
 * that as `action.result` with `status: "failed"`. Returning this object is
 * opt-in because a tool that declares `outputSchema` must not silently
 * resolve to a different shape. Prefer `guardApproval` when the model should
 * read a denial status without a throw. The payload itself is the shared
 * contract in `agents/denial.ts`.
 */
export {
  type ArcjetDenialResult,
  denialResult,
  deniedReason,
  unavailableReason,
  unavailableResult,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "../../agents/denial.ts";
