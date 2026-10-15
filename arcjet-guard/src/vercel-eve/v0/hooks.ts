import type { HookContext, HookDefinition, HookEventMap, StreamEventHook } from "eve/hooks";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { captureEvent } from "../../agents/capture.ts";
import { eveAgentContext } from "./context.ts";

/**
 * The result union carried by `action.result`. Eve does not export this type by
 * name, but it is reachable structurally through the public hook event map.
 */
type RuntimeActionResult = HookEventMap["action.result"]["data"]["result"];

/*
 * The subagent payloads, typed structurally. Each eve version's `HookEventMap`
 * declares only one generation of these events (`subagent.*` before 0.69,
 * `task.*` and `agent.started` from 0.69), so naming them through it would tie
 * this file to one eve version. Every field is optional and `unknown` because
 * a listener must cope with whatever the installed eve sends; `captureSubagent`
 * records only the string values.
 */

/** `subagent.called` (eve 0.34–0.68). */
type SubagentCalledEvent = {
  readonly data?: {
    readonly callId?: unknown;
    readonly childSessionId?: unknown;
    readonly name?: unknown;
  };
};

/** `subagent.completed` (eve 0.34–0.68). */
type SubagentCompletedEvent = {
  readonly data?: { readonly callId?: unknown; readonly subagentName?: unknown };
};

/** `task.started` (eve ≥0.69). `name` is the agent tool's name. */
type TaskStartedEvent = {
  readonly data?: {
    readonly callId?: unknown;
    readonly kind?: unknown;
    readonly name?: unknown;
    readonly taskId?: unknown;
  };
};

/** `task.settled` (eve ≥0.69). `output` and `error.message` are never read. */
type TaskSettledEvent = {
  readonly data?: {
    readonly callId?: unknown;
    readonly cancel?: { readonly reason?: unknown };
    readonly kind?: unknown;
    readonly name?: unknown;
    readonly status?: unknown;
    readonly taskId?: unknown;
  };
};

/** `agent.started` (eve ≥0.69). `sessionId` is the child session's id. */
type AgentStartedEvent = {
  readonly data?: {
    readonly callId?: unknown;
    readonly name?: unknown;
    readonly sessionId?: unknown;
    readonly taskId?: unknown;
  };
};

/**
 * Which event families `arcjetHooks` captures.
 *
 * `"session"` → session lifecycle (started, failed).
 * `"turn"` → turn lifecycle (started, completed, failed).
 * `"tool"` → tool call lifecycle (action.result).
 * `"subagent"` → subagent delegation: `eve.subagent-called` and
 * `eve.subagent-completed` for each agent tool call (from `subagent.called` and
 * `subagent.completed` on eve 0.34–0.68, from `task.started` and `task.settled`
 * with `kind: "agent"` on eve ≥0.69), plus `eve.agent-started` for each child
 * session eve ≥0.69 opens (`agent.started`).
 */
export type ArcjetHookFamily = "session" | "turn" | "tool" | "subagent";

/**
 * Options for `arcjetHooks()`.
 */
export interface ArcjetHooksOptions {
  /**
   * Which event families to capture. Defaults to all four. A long
   * conversation emits one event per tool call plus one per turn, so a chatty
   * agent may want `["session", "tool"]`.
   */
  events?: ReadonlyArray<ArcjetHookFamily>;
}

/**
 * Eve hooks for capturing Arcjet lifecycle decisions.
 *
 * Returns a `HookDefinition` carrying handlers for Eve stream events. The
 * returned object is suitable for wrapping with `defineHook()` at the agent
 * definition site.
 *
 * Handlers never throw and never block the turn, even if `capture()` fails.
 * Eve's hooks are documented as observe-only; a failing hook is a defect.
 *
 * The `session.started` event is the critical join point: it carries both the
 * session ID and (when available) the continuation token and channel kind from
 * the hook context. This record enables a `guardInbound` decision correlated
 * by thread token to be joined with all in-session decisions correlated by
 * session ID. They remain two separate Sequences; this record is what makes
 * each reachable from the other. Note Eve namespaces continuation tokens per
 * channel, so `eve.continuation-token` reads `<channel-name>:<token>` — the
 * inbound correlation id is its suffix, not the whole value.
 *
 * That event's `invocation` and `runtime` payloads are deliberately not
 * captured: the lineage identifiers in `invocation` are already reachable
 * through `ctx.session.parent`, and a second source for them could disagree
 * with the first, while `runtime` is deployment identity rather than anything
 * about the decision.
 *
 * Selective capture by family is supported via `options.events`: e.g.
 * `["session", "tool"]` captures only session-related and tool-related events,
 * reducing volume for long conversations that do not need turn-level granularity.
 *
 * @example
 * ```ts
 * import { launchArcjet } from "@arcjet/guard";
 * import { arcjetHooks } from "@arcjet/guard/vercel-eve/v0";
 * import { defineHook } from "eve/hooks";
 * import type { HookDefinition } from "eve/hooks";
 *
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * // Capture only the session join record and tool outcomes; a long
 * // conversation emits one event per tool call plus one per turn.
 * const hooks: HookDefinition = defineHook(
 *   arcjetHooks(client, { events: ["session", "tool"] }),
 * );
 *
 * export default hooks;
 * ```
 *
 * @param client - An `ArcjetAgentClient` with `capture()` support
 * @param options - Optional event family filter (default: all four families)
 * @returns A `HookDefinition` ready to wrap with `defineHook()`
 */
export function arcjetHooks(
  client: ArcjetAgentClient,
  options?: ArcjetHooksOptions,
): HookDefinition {
  const enabledFamilies = new Set(options?.events ?? ["session", "turn", "tool", "subagent"]);

  const events: Record<string, StreamEventHook<any>> = {};

  if (enabledFamilies.has("session")) {
    events["session.started"] = ((
      _event: HookEventMap["session.started"],
      ctx: HookContext,
    ): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = { ...agentCtx.metadata };

        if (typeof ctx?.channel?.continuationToken === "string") {
          metadata["eve.continuation-token"] = ctx.channel.continuationToken;
        }

        if (typeof ctx?.channel?.kind === "string") {
          metadata["eve.channel"] = ctx.channel.kind;
        }

        if (typeof ctx?.agent?.name === "string") {
          metadata["eve.agent"] = ctx.agent.name;
        }

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.session-started",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    }) as StreamEventHook<any>;

    events["session.failed"] = ((event: HookEventMap["session.failed"], ctx: HookContext): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = {
          ...agentCtx.metadata,
          outcome: "error",
        };

        if (typeof event?.data?.code === "string") {
          metadata["error.code"] = event.data.code;
        }

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.session-failed",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    }) as StreamEventHook<any>;
  }

  if (enabledFamilies.has("turn")) {
    events["turn.started"] = ((event: HookEventMap["turn.started"], ctx: HookContext): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = { ...agentCtx.metadata };

        if (typeof event?.data?.turnId === "string") {
          metadata["eve.turn"] = event.data.turnId;
        }

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.turn-started",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    }) as StreamEventHook<any>;

    events["turn.completed"] = ((event: HookEventMap["turn.completed"], ctx: HookContext): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = {
          ...agentCtx.metadata,
          outcome: "success",
        };

        if (typeof event?.data?.turnId === "string") {
          metadata["eve.turn"] = event.data.turnId;
        }

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.turn-completed",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    }) as StreamEventHook<any>;

    events["turn.failed"] = ((event: HookEventMap["turn.failed"], ctx: HookContext): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = {
          ...agentCtx.metadata,
          outcome: "error",
        };

        if (typeof event?.data?.turnId === "string") {
          metadata["eve.turn"] = event.data.turnId;
        }

        if (typeof event?.data?.code === "string") {
          metadata["error.code"] = event.data.code;
        }

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.turn-failed",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    }) as StreamEventHook<any>;
  }

  if (enabledFamilies.has("tool")) {
    events["action.result"] = ((event: HookEventMap["action.result"], ctx: HookContext): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = {
          ...agentCtx.metadata,
          "eve.phase": "result",
        };

        const status = event?.data?.status;
        if (status === "completed") {
          metadata["outcome"] = "success";
        } else if (status === "failed") {
          metadata["outcome"] = "error";
          if (typeof event?.data?.error?.code === "string") {
            metadata["error.code"] = event.data.error.code;
          }
        } else if (status === "rejected") {
          metadata["outcome"] = "denied";
        }

        // Every RuntimeActionResult variant carries `callId`; only the
        // tool-result variant names the tool.
        const result: RuntimeActionResult | undefined = event?.data?.result;
        if (result !== undefined && result !== null) {
          if (typeof result.callId === "string") {
            metadata["eve.call"] = result.callId;
          }
          if (result.kind === "tool-result" && typeof result.toolName === "string") {
            metadata["eve.tool"] = result.toolName;
          }
        }

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.action-result",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    }) as StreamEventHook<any>;
  }

  if (enabledFamilies.has("subagent")) {
    // eve 0.34–0.68: a subagent call opened its child session. eve 0.69
    // replaced `subagent.called` with `task.started` and `agent.started`.
    events["subagent.called"] = neverThrow((event: SubagentCalledEvent, ctx: HookContext) => {
      captureSubagent(client, ctx, "eve.subagent-called", {
        "eve.child-session": event.data?.childSessionId,
        "eve.subagent": event.data?.name,
        "eve.call": event.data?.callId,
      });
    });

    // eve 0.34–0.68: a subagent call finished. eve 0.69 replaced
    // `subagent.completed` with `task.settled`.
    events["subagent.completed"] = neverThrow((event: SubagentCompletedEvent, ctx: HookContext) => {
      captureSubagent(client, ctx, "eve.subagent-completed", {
        "eve.call": event.data?.callId,
        "eve.subagent": event.data?.subagentName,
      });
    });

    // eve ≥0.69: a call started a task; replaces `subagent.called`. Only an
    // agent tool's call (`kind: "agent"`) is a subagent call. The child
    // session is not known yet: it arrives on `agent.started`.
    events["task.started"] = neverThrow((event: TaskStartedEvent, ctx: HookContext) => {
      if (event.data?.kind !== "agent") {
        return;
      }
      captureSubagent(client, ctx, "eve.subagent-called", {
        "eve.subagent": event.data.name,
        "eve.call": event.data.callId,
        "eve.task": event.data.taskId,
      });
    });

    // eve ≥0.69: a call's task settled; replaces `subagent.completed`. Fires
    // once per call, so a call that continues an agent task by its `taskId`
    // records its own completion.
    events["task.settled"] = neverThrow((event: TaskSettledEvent, ctx: HookContext) => {
      if (event.data?.kind !== "agent") {
        return;
      }
      captureSubagent(client, ctx, "eve.subagent-completed", {
        "eve.call": event.data.callId,
        "eve.subagent": event.data.name,
        "eve.task": event.data.taskId,
        "eve.task-status": event.data.status,
        "eve.cancel-reason": event.data.cancel?.reason,
      });
    });

    // eve ≥0.69: a run opened a child session with `ctx.agent`; together with
    // `task.started` it replaces `subagent.called`, which carried the child
    // session id. It fires once per child session rather than once per call,
    // and carries no `kind`, so it is its own record; join it to the calls by
    // `eve.task` or `eve.call`.
    events["agent.started"] = neverThrow((event: AgentStartedEvent, ctx: HookContext) => {
      captureSubagent(client, ctx, "eve.agent-started", {
        "eve.child-session": event.data?.sessionId,
        "eve.subagent": event.data?.name,
        "eve.call": event.data?.callId,
        "eve.task": event.data?.taskId,
      });
    });
  }

  // Return only { events } — ExactDefinition rejects any other key
  return { events };
}

/**
 * Wrap a listener so that nothing it throws reaches eve's hook dispatch.
 */
function neverThrow<TEvent>(
  listener: (event: TEvent, ctx: HookContext) => void,
): (event: TEvent, ctx: HookContext) => void {
  return (event, ctx) => {
    try {
      listener(event, ctx);
    } catch {
      // Never throw from a hook
    }
  };
}

/**
 * Capture `action` for the session in `ctx`, with the session's metadata from
 * `eveAgentContext` plus each entry of `fields` whose value is a string.
 * Entries with any other value, including absent fields, are left out.
 */
function captureSubagent(
  client: ArcjetAgentClient,
  ctx: HookContext,
  action: string,
  fields: Readonly<Record<string, unknown>>,
): void {
  const agentCtx = eveAgentContext(ctx);
  const metadata: Record<string, unknown> = { ...agentCtx.metadata };

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string") {
      metadata[key] = value;
    }
  }

  const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

  captureEvent(client, {
    action,
    correlationId: agentCtx.correlationId,
    ...metadataArg,
  });
}
