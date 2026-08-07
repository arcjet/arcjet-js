import type {
  HookDefinition,
  StreamEventHook,
} from "eve/hooks";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { captureEvent } from "../../agents/capture.ts";
import { eveAgentContext } from "./context.ts";

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
 * Selective capture by family is supported via `options.events`: e.g.
 * `["session", "tool"]` captures only session-related and tool-related events,
 * reducing volume for long conversations that do not need turn-level granularity.
 *
 * @example
 * ```ts
 * import { launchArcjet } from "@arcjet/guard";
 * import { arcjetHooks } from "@arcjet/guard/vercel-eve/v0";
 * import { defineHook } from "eve/hooks";
 *
 * const client = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * export default defineHook(arcjetHooks(client));
 * ```
 *
 * @param client - An `ArcjetAgentClient` with `capture()` support
 * @param options - Optional event family filter (default: all four families)
 * @returns A `HookDefinition` ready to wrap with `defineHook()`
 */
// oxlint-disable typescript/no-unsafe-argument, typescript/no-unsafe-member-access, typescript/no-unsafe-assignment -- hook handlers receive unknown event/ctx shapes
export function arcjetHooks(
  client: ArcjetAgentClient,
  options?: ArcjetHooksOptions,
): HookDefinition {
  // Determine which families to include (default: all)
  const enabledFamilies = new Set(options?.events ?? ["session", "turn", "tool", "subagent"]);

  // Build the events map conditionally
  const events: Record<string, StreamEventHook<any>> = {};

  // Session.started: join record carrying session id and continuation token
  if (enabledFamilies.has("session")) {
    events["session.started"] = (_event: any, ctx: any): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = { ...agentCtx.metadata };

        // Add channel continuation token if present
        if (typeof ctx?.channel?.continuationToken === "string") {
          metadata["eve.continuation-token"] = ctx.channel.continuationToken;
        }

        // Add channel kind if present
        if (typeof ctx?.channel?.kind === "string") {
          metadata["eve.channel"] = ctx.channel.kind;
        }

        // Add agent name if present
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
    };

    // Session.failed: session error
    events["session.failed"] = (event: any, ctx: any): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = {
          ...agentCtx.metadata,
          "eve.outcome": "error",
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
    };
  }

  // Turn events
  if (enabledFamilies.has("turn")) {
    events["turn.started"] = (_event: any, ctx: any): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = { ...agentCtx.metadata };

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.turn-started",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    };

    events["turn.completed"] = (event: any, ctx: any): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = {
          ...agentCtx.metadata,
          "eve.outcome": "success",
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
    };

    events["turn.failed"] = (event: any, ctx: any): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = {
          ...agentCtx.metadata,
          "eve.outcome": "error",
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
    };
  }

  // Tool (action.result): tool call outcome
  if (enabledFamilies.has("tool")) {
    events["action.result"] = (event: any, ctx: any): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = {
          ...agentCtx.metadata,
          "eve.phase": "result",
        };

        // Map status to outcome
        const status = event?.data?.status;
        if (status === "completed") {
          metadata["eve.outcome"] = "success";
        } else if (status === "failed") {
          metadata["eve.outcome"] = "error";
          // Include error code if present
          if (typeof event?.data?.error?.code === "string") {
            metadata["error.code"] = event.data.error.code;
          }
        } else if (status === "rejected") {
          metadata["eve.outcome"] = "denied";
        }
        // For unknown status, we do NOT include outcome

        // Try to read callId defensively (not importing private type)
        if (typeof event?.data?.result === "object" && event.data.result !== null) {
          const result = event.data.result;
          if (typeof result.callId === "string") {
            metadata["eve.call"] = result.callId;
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
    };
  }

  // Subagent events
  if (enabledFamilies.has("subagent")) {
    events["subagent.called"] = (event: any, ctx: any): void => {
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
    };

    events["subagent.completed"] = (event: any, ctx: any): void => {
      try {
        const agentCtx = eveAgentContext(ctx);
        const metadata: Record<string, unknown> = { ...agentCtx.metadata };

        if (typeof event?.data?.callId === "string") {
          metadata["eve.call"] = event.data.callId;
        }

        if (typeof event?.data?.subagentName === "string") {
          metadata["eve.subagent"] = event.data.subagentName;
        }

        // Ensure eve.child-session is NOT present (AC6.4)
        // This is asserted in tests, not checked here

        const metadataArg = Object.keys(metadata).length > 0 ? { metadata } : {};

        captureEvent(client, {
          action: "eve.subagent-completed",
          correlationId: agentCtx.correlationId,
          ...metadataArg,
        });
      } catch {
        // Never throw from a hook
      }
    };
  }

  // Return only { events } — ExactDefinition rejects any other key
  return { events };
}
