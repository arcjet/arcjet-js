import type { HookContext, HookDefinition, HookEventMap, StreamEventHook } from "eve/hooks";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { captureEvent } from "../../agents/capture.ts";
import { eveAgentContext } from "./context.ts";

/**
 * The result union carried by `action.result`. Eve does not export this type by
 * name, but it is reachable structurally through the public hook event map.
 */
type RuntimeActionResult = HookEventMap["action.result"]["data"]["result"];

/**
 * Which event families `arcjetHooks` captures.
 *
 * `"session"` → session lifecycle (started, failed).
 * `"turn"` → turn lifecycle (started, completed, failed).
 * `"tool"` → tool call lifecycle (action.result).
 * `"subagent"` → subagent delegation (called, completed).
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
    events["subagent.called"] = ((
      event: HookEventMap["subagent.called"],
      ctx: HookContext,
    ): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = { ...agentCtx.metadata };

        if (typeof event?.data?.childSessionId === "string") {
          metadata["eve.child-session"] = event.data.childSessionId;
        }

        if (typeof event?.data?.name === "string") {
          metadata["eve.subagent"] = event.data.name;
        }

        if (typeof event?.data?.callId === "string") {
          metadata["eve.call"] = event.data.callId;
        }

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.subagent-called",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    }) as StreamEventHook<any>;

    events["subagent.completed"] = ((
      event: HookEventMap["subagent.completed"],
      ctx: HookContext,
    ): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = { ...agentCtx.metadata };

        if (typeof event?.data?.callId === "string") {
          metadata["eve.call"] = event.data.callId;
        }

        if (typeof event?.data?.subagentName === "string") {
          metadata["eve.subagent"] = event.data.subagentName;
        }

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.subagent-completed",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    }) as StreamEventHook<any>;
  }

  // Return only { events } — ExactDefinition rejects any other key
  return { events };
}
