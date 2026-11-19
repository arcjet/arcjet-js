import type {
  HookContext,
  HookDefinition,
  HookEventMap,
  HookEventType,
  StreamEventHook,
} from "eve/hooks";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { captureEvent } from "../../agents/capture.ts";
import { eveAgentContext } from "../v0/context.ts";

/**
 * Which event families `arcjetHooks` captures.
 *
 * `"session"` → `eve.session-started` (`session.started`) and
 * `eve.session-failed` (`session.ended` with `outcome: "failed"`).
 * `"turn"` → `eve.turn-started` (`turn.started`) and one of
 * `eve.turn-completed`, `eve.turn-failed`, or `eve.turn-cancelled`
 * (`turn.settled`, by its `outcome`).
 * `"tool"` → `eve.action-result` for each call that settles (`call.settled`).
 * `"subagent"` → `eve.subagent-called` for each agent task a call starts
 * (`task.started` with `kind: "agent"`), `eve.agent-started` for each child
 * session (`child.opened`), and `eve.task-ended` for each task that ends
 * (`task.ended`).
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

type Handlers = {
  -readonly [K in HookEventType]?: StreamEventHook<HookEventMap[K], K>;
};

/**
 * Eve hooks for capturing Arcjet lifecycle decisions, for Eve 1.x.
 *
 * Returns a `HookDefinition` carrying handlers for Eve 1.x session facts. The
 * returned object is suitable for wrapping with `defineHook()` at the agent
 * definition site.
 *
 * Eve 1.0 keys hooks on session stream version 27 facts, and its hook loader
 * rejects a hook that names an event key version 27 removed. This is why the
 * Eve 0.x `arcjetHooks` from `@arcjet/guard/vercel-eve/v0`, which listens for
 * `action.result`, `turn.completed`, `session.failed`, and `task.settled`,
 * cannot load on Eve 1.x, and why this namespace exists.
 *
 * Handlers never throw and never block the turn, even if `capture()` fails.
 * Eve fails the turn when a hook handler throws, so a failing hook is a defect.
 *
 * The `session.started` fact is the join point: its record carries both the
 * session ID and (when available) the continuation token and channel kind from
 * the hook context. This record enables a `guardInbound` decision correlated by
 * thread token to be joined with all in-session decisions correlated by
 * session ID. They remain two separate Sequences; this record is what makes
 * each reachable from the other. Note Eve namespaces continuation tokens per
 * channel, so `eve.continuation-token` reads `<channel-name>:<token>` — the
 * inbound correlation id is its suffix, not the whole value.
 *
 * Eve 1.x facts carry less than the Eve 0.x events did, and a hook cannot read
 * one fact from another without importing Eve at runtime:
 * - `call.settled` does not name the tool, so `eve.action-result` carries
 *   `eve.call` but no `eve.tool`. The `guardTool` and `guardApproval` records
 *   for the same call carry both; join on `eve.call`.
 * - `task.ended` carries neither the task's kind nor its name, so
 *   `eve.task-ended` fires for every task, not only subagents. Join it to
 *   `eve.subagent-called` on `eve.task`.
 *
 * Selective capture by family is supported via `options.events`: e.g.
 * `["session", "tool"]` captures only session-related and tool-related events,
 * reducing volume for long conversations that do not need turn-level granularity.
 *
 * @example
 * ```ts
 * import { launchArcjet } from "@arcjet/guard";
 * import { arcjetHooks } from "@arcjet/guard/vercel-eve/v1";
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

  const events: Handlers = {};

  if (enabledFamilies.has("session")) {
    events["session.started"] = neverThrow<"session.started">((_event, ctx) => {
      capture(client, ctx, "eve.session-started", {
        "eve.continuation-token": ctx?.channel?.continuationToken,
        "eve.channel": ctx?.channel?.kind,
        "eve.agent": ctx?.agent?.name,
      });
    });

    events["session.ended"] = neverThrow<"session.ended">((event, ctx) => {
      if (event?.data?.outcome !== "failed") {
        return;
      }
      capture(client, ctx, "eve.session-failed", {
        outcome: "error",
        "error.code": event.data.error?.code,
      });
    });
  }

  if (enabledFamilies.has("turn")) {
    events["turn.started"] = neverThrow<"turn.started">((event, ctx) => {
      capture(client, ctx, "eve.turn-started", { "eve.turn": event?.data?.turnId });
    });

    events["turn.settled"] = neverThrow<"turn.settled">((event, ctx) => {
      const data = event?.data;
      const turn = { "eve.turn": data?.turnId };
      if (data?.outcome === "completed") {
        capture(client, ctx, "eve.turn-completed", { ...turn, outcome: "success" });
      } else if (data?.outcome === "failed") {
        capture(client, ctx, "eve.turn-failed", {
          ...turn,
          outcome: "error",
          "error.code": data.error?.code,
        });
      } else if (data?.outcome === "cancelled") {
        capture(client, ctx, "eve.turn-cancelled", { ...turn, outcome: "cancelled" });
      }
    });
  }

  if (enabledFamilies.has("tool")) {
    events["call.settled"] = neverThrow<"call.settled">((event, ctx) => {
      const data = event?.data;
      const outcome = data?.outcome;
      capture(client, ctx, "eve.action-result", {
        "eve.phase": "result",
        "eve.call": data?.callId,
        "eve.call-outcome": outcome,
        outcome:
          outcome === "completed"
            ? "success"
            : outcome === "failed"
              ? "error"
              : outcome === "rejected"
                ? "denied"
                : undefined,
        "error.code": outcome === "failed" ? data?.error?.code : undefined,
      });
    });
  }

  if (enabledFamilies.has("subagent")) {
    // Only an agent tool's call (`kind: "agent"`) is a subagent call. The
    // child session is not known yet: it arrives on `child.opened`.
    events["task.started"] = neverThrow<"task.started">((event, ctx) => {
      const data = event?.data;
      if (data?.kind !== "agent") {
        return;
      }
      capture(client, ctx, "eve.subagent-called", {
        "eve.subagent": data.name,
        "eve.call": data.startedBy?.callId,
        "eve.task": data.taskId,
      });
    });

    // Fires once per child session rather than once per call; join it to the
    // calls by `eve.task` or `eve.call`.
    events["child.opened"] = neverThrow<"child.opened">((event, ctx) => {
      const data = event?.data;
      const owner: { readonly callId?: unknown; readonly taskId?: unknown } | undefined =
        data?.owner;
      capture(client, ctx, "eve.agent-started", {
        "eve.child-session": data?.sessionId,
        "eve.subagent": data?.name,
        "eve.call": owner?.callId,
        "eve.task": owner?.taskId,
      });
    });

    events["task.ended"] = neverThrow<"task.ended">((event, ctx) => {
      const data = event?.data;
      capture(client, ctx, "eve.task-ended", {
        "eve.task": data?.taskId,
        "eve.task-status": data?.outcome,
        "eve.cancel-reason": data?.reason,
        "error.code": data?.outcome === "failed" ? data.error?.code : undefined,
      });
    });
  }

  // Return only { events } — ExactDefinition rejects any other key
  return { events };
}

/**
 * Wrap a listener so that nothing it throws reaches eve's hook dispatch.
 */
function neverThrow<K extends HookEventType>(
  listener: (event: HookEventMap[K], ctx: HookContext<K>) => void,
): StreamEventHook<HookEventMap[K], K> {
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
 * `eveAgentContext` plus each entry of `fields` whose value is a non-empty
 * string. Entries with any other value, including absent fields, are left out.
 */
function capture(
  client: ArcjetAgentClient,
  ctx: HookContext,
  action: string,
  fields: Readonly<Record<string, unknown>>,
): void {
  const agentCtx = eveAgentContext(ctx);
  const metadata: Record<string, unknown> = { ...agentCtx.metadata };

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.length > 0) {
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
