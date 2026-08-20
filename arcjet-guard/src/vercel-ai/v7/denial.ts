/**
 * Structured tool result returned to the model when a call is denied.
 *
 * Vercel AI SDK's idiomatic delivery is to *return* this object as the tool
 * result. A throw becomes a tool-error part that does not preserve these
 * fields. The payload itself is the shared contract in `agents/denial.ts`.
 */
export {
  type ArcjetDenialResult,
  denialResult,
  deniedReason,
  unavailableReason,
  unavailableResult,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "../../agents/denial.ts";
