/**
 * Structured tool result returned to the model when a call is denied.
 *
 * OpenAI Agents' idiomatic delivery is to *return* this object from `invoke`.
 * `tool({ execute })` without an `outputSchema` installs a default
 * `errorFunction` that turns a throw into
 * `"An error occurred while running the tool. Please try again. Error: …"`.
 * With an `outputSchema`, or with `errorFunction: null`, the throw is
 * rethrown as `ToolCallError` and the run dies. Neither path is a policy
 * denial the model can inspect. The runner's `getToolCallOutputItem`
 * stringifies a returned object onto a `function_call_result` with
 * `status: "completed"`. The denial is in the payload
 * (`arcjetDenied: true`), not a fabricated envelope.
 *
 * The payload itself is the shared contract in `agents/denial.ts`.
 */
export {
  type ArcjetDenialResult,
  denialResult,
  deniedReason,
  unavailableReason,
  unavailableResult,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
} from "../../agents/denial.ts";
