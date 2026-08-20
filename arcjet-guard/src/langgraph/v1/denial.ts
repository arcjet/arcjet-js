/**
 * Structured tool result returned to the model when a call is denied.
 *
 * LangGraph's idiomatic delivery is to *return* this plain object. `ToolNode`
 * wraps a non-message return in a real `ToolMessage`. Because the tool does
 * not throw, that message's `status` is `success` — the denial is in the
 * payload (`arcjetDenied: true`), not the envelope.
 *
 * **Why this is not a `ToolMessage`.** `ToolNode` returns a tool's output
 * unchanged when `isBaseMessage(output)` holds, and otherwise wraps it in a
 * real `ToolMessage` carrying the tool call id. Passing that check needs a
 * `_getType` method, and an object that fakes it is then handed to
 * `messagesStateReducer`, which forwards anything `isBaseMessage` accepts and
 * assigns `m.lc_kwargs.id` — throwing on a duck-typed message and taking the
 * graph down. Constructing a genuine `ToolMessage` would need a value import
 * of `@langchain/core`, which this namespace must not have.
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
