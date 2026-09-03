/**
 * Structural Claude Managed Agents event shapes.
 *
 * Declared here so the namespace types against the hosted REST+SSE contract
 * (`managed-agents-2026-04-01`) without a runtime import of
 * `@anthropic-ai/sdk`. Names and fields match
 * `BetaManagedAgentsUserMessageEventParams`,
 * `BetaManagedAgentsAgentCustomToolUseEvent`, and
 * `BetaManagedAgentsUserCustomToolResultEventParams` from `@anthropic-ai/sdk`
 * `>=0.86.0` (the first release with `client.beta.agents` / `sessions` /
 * `environments`).
 *
 * `UserCustomToolResultEventParams` includes `is_error` — do not invent extra
 * fields beyond that schema. `session_thread_id` is echoed when the inbound
 * `agent.custom_tool_use` carries it (later SDK releases); it is omitted when
 * absent so a 0.86.0 send body stays valid.
 */

/** Text block on `user.message` / `user.custom_tool_result` content. */
export interface ManagedAgentsTextBlock {
  type: "text";
  text: string;
}

/**
 * Content we construct on `user.message` / `user.custom_tool_result`. Text
 * only — that is assignable to the SDK's wider content unions. A caller who
 * already has image/document/redacted blocks keeps that type by passing the
 * SDK events array through `guardEvents` (the helper is generic).
 */
export type ManagedAgentsContentBlock = ManagedAgentsTextBlock;

/** Parameters for `sessions.events.send` / `sessions.create({ initial_events })`. */
export interface UserMessageEventParams {
  type: "user.message";
  content: ManagedAgentsTextBlock[];
}

/**
 * Inbound SSE event: the agent called a custom tool. The session idles until
 * the client sends `user.custom_tool_result`.
 */
export interface AgentCustomToolUseEvent {
  type: "agent.custom_tool_use";
  id: string;
  name: string;
  input: { [key: string]: unknown };
  processed_at: string;
  session_thread_id?: string | null;
}

/**
 * Parameters for `user.custom_tool_result`. Field set matches
 * `BetaManagedAgentsUserCustomToolResultEventParams` (`custom_tool_use_id`,
 * `type`, `content`, `is_error`). `session_thread_id` is included only when
 * routing a subagent result, as the events API documents.
 */
export interface UserCustomToolResultEventParams {
  type: "user.custom_tool_result";
  custom_tool_use_id: string;
  content?: ManagedAgentsTextBlock[];
  is_error?: boolean | null;
  session_thread_id?: string | null;
}

/** Any event the inbound helper may be asked to send. */
export type ManagedAgentsEventParams =
  | UserMessageEventParams
  | UserCustomToolResultEventParams
  | { type: string };

/** Body passed to `sessions.events.send` after the inbound gate. */
export interface EventSendBody<TEvent extends ManagedAgentsEventParams = ManagedAgentsEventParams> {
  events: TEvent[];
}

/**
 * Structural `betaTool({ run })` / EnvironmentWorker tool. The CLI worker
 * cannot register custom tools; this is the SDK worker factory shape.
 */
export interface ManagedAgentsRunnableTool<TInput = { [key: string]: unknown }, TOutput = unknown> {
  name?: string;
  run: (input: TInput, context?: unknown) => TOutput | Promise<TOutput>;
}

export function isUserMessageEvent(event: ManagedAgentsEventParams): event is UserMessageEventParams {
  return event.type === "user.message" && "content" in event && Array.isArray(event.content);
}

export function isCustomToolUseEvent(value: unknown): value is AgentCustomToolUseEvent {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const event = value as {
    type?: unknown;
    id?: unknown;
    name?: unknown;
    input?: unknown;
    processed_at?: unknown;
  };
  return (
    event.type === "agent.custom_tool_use" &&
    typeof event.id === "string" &&
    typeof event.name === "string" &&
    typeof event.processed_at === "string" &&
    event.input !== null &&
    typeof event.input === "object"
  );
}

/** Concatenate `user.message` text blocks for inbound rules. */
export function inboundTextFromEvents(events: readonly ManagedAgentsEventParams[]): string {
  const parts: string[] = [];
  for (const event of events) {
    if (!isUserMessageEvent(event)) {
      continue;
    }
    for (const block of event.content) {
      if (block.type === "text" && "text" in block && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
  }
  return parts.join("\n");
}
