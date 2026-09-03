import { shouldWarn } from "../../agents/capture.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { deniedReason, unavailableReason } from "../../agents/denial.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import { runGuarded } from "../../agents/guarded.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { ArcjetMetadata, DecisionDeny, RuleWithInput } from "../../types.ts";
import type { ClaudeManagedAgentsContext } from "./context.ts";
import type {
  AgentCustomToolUseEvent,
  ManagedAgentsRunnableTool,
  UserCustomToolResultEventParams,
} from "./types.ts";
import { isCustomToolUseEvent } from "./types.ts";

/**
 * Policy for `guardCustomTool()` — how to guard a hosted custom tool or a
 * self-hosted `betaTool({ run })`.
 */
export interface GuardCustomToolPolicy<TInput = { [key: string]: unknown }> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /**
   * Rules to evaluate, static or computed from the tool input. Omitting this,
   * or returning `[]`, still submits a guard call.
   */
  rules?: RuleWithInput[] | ((input: TInput) => RuleWithInput[]);
  /** Metadata merged over the context's (object, or per-call function). */
  metadata?: ArcjetMetadata | ((input: TInput) => ArcjetMetadata);
  /**
   * Caller-owned correlation from `claudeManagedAgentsContext`. Never an
   * Anthropic session or event id.
   */
  context?: ClaudeManagedAgentsContext;
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
}

export interface GuardCustomToolCall<TOutput> {
  event: AgentCustomToolUseEvent;
  execute: (input: { [key: string]: unknown }) => Promise<TOutput>;
  /**
   * Sends a `user.custom_tool_result` via the real events API
   * (`sessions.events.send`). Called on deny / fail-closed so the session
   * does not idle forever. The allow path leaves sending the success result
   * to the caller after `execute` returns.
   */
  send: (result: UserCustomToolResultEventParams) => Promise<unknown>;
}

export type GuardCustomToolResult<TOutput> =
  | { allowed: true; output: TOutput }
  | { allowed: false; result: UserCustomToolResultEventParams };

function errorResult(
  event: AgentCustomToolUseEvent,
  message: string,
): UserCustomToolResultEventParams {
  const result: UserCustomToolResultEventParams = {
    type: "user.custom_tool_result",
    custom_tool_use_id: event.id,
    content: [{ type: "text", text: message }],
    is_error: true,
  };
  if (typeof event.session_thread_id === "string" && event.session_thread_id.length > 0) {
    result.session_thread_id = event.session_thread_id;
  }
  return result;
}

async function sendDenied(
  send: (result: UserCustomToolResultEventParams) => Promise<unknown>,
  result: UserCustomToolResultEventParams,
): Promise<GuardCustomToolResult<never>> {
  await send(result);
  return { allowed: false, result };
}

/**
 * Run Guard **before** the app executes a custom tool.
 *
 * Hosted path: on `agent.custom_tool_use`, call this with `execute` + `send`.
 * On DENY the tool does not run and `send` is invoked with a real
 * `user.custom_tool_result` (`is_error: true`, error text). Anthropic has
 * already chosen the tool; this is the customer-side gate for tools **you**
 * execute. Built-in bash/read/write under default `always_allow` cannot be
 * gated. MCP tools Anthropic hosts cannot be gated here — Guard the MCP
 * servers you host.
 *
 * Self-hosted `EnvironmentWorker`: pass a `betaTool({ run })` (or any tool
 * with `run`) as the second argument to wrap `run` with the same gate. The
 * CLI worker cannot register custom tools.
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import {
 *   claudeManagedAgentsContext,
 *   guardCustomTool,
 * } from "@arcjet/guard/claude-managed-agents/v0";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 * const limit = tokenBucket({
 *   refillRate: 10,
 *   intervalSeconds: 60,
 *   maxTokens: 10,
 * });
 *
 * if (event.type === "agent.custom_tool_use") {
 *   const gated = await guardCustomTool(
 *     arcjet,
 *     {
 *       event,
 *       execute: (input) => lookupOrder(input),
 *       send: (result) =>
 *         client.beta.sessions.events.send(session.id, { events: [result] }),
 *     },
 *     {
 *       action: "order.looked-up",
 *       rules: (input) => [limit({ key: String(input["orderNumber"]), requested: 1 })],
 *       context: claudeManagedAgentsContext({ correlationId: conversationId }),
 *     },
 *   );
 *   if (gated.allowed) {
 *     await client.beta.sessions.events.send(session.id, {
 *       events: [{
 *         type: "user.custom_tool_result",
 *         custom_tool_use_id: event.id,
 *         content: [{ type: "text", text: JSON.stringify(gated.output) }],
 *       }],
 *     });
 *   }
 * }
 * ```
 */
export async function guardCustomTool<TOutput>(
  client: ArcjetAgentClient,
  call: GuardCustomToolCall<TOutput>,
  policy: GuardCustomToolPolicy,
): Promise<GuardCustomToolResult<TOutput>>;
export function guardCustomTool<TTool extends ManagedAgentsRunnableTool<any, any>>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardCustomToolPolicy<Parameters<TTool["run"]>[0]>,
): TTool;
export function guardCustomTool(
  client: ArcjetAgentClient,
  callOrTool: GuardCustomToolCall<unknown> | ManagedAgentsRunnableTool<any, any>,
  policy: GuardCustomToolPolicy,
): Promise<GuardCustomToolResult<unknown>> | ManagedAgentsRunnableTool<any, any> {
  if (isRunnableTool(callOrTool)) {
    return wrapRunnableTool(client, callOrTool, policy);
  }
  return runHostedCustomTool(client, callOrTool, policy);
}

function isRunnableTool(
  value: GuardCustomToolCall<unknown> | ManagedAgentsRunnableTool<any, any>,
): value is ManagedAgentsRunnableTool<any, any> {
  return (
    typeof value === "object" &&
    value !== null &&
    "run" in value &&
    typeof value.run === "function" &&
    !("event" in value && isCustomToolUseEvent(value.event))
  );
}

async function runHostedCustomTool<TOutput>(
  client: ArcjetAgentClient,
  call: GuardCustomToolCall<TOutput>,
  policy: GuardCustomToolPolicy,
): Promise<GuardCustomToolResult<TOutput>> {
  const { event, execute, send } = call;
  if (!isCustomToolUseEvent(event)) {
    throw new Error(
      "@arcjet/guard: guardCustomTool() requires an agent.custom_tool_use event",
    );
  }

  const input = event.input;
  let rules: RuleWithInput[] | undefined;
  let policyMetadata: ArcjetMetadata | undefined;
  try {
    rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;
    policyMetadata = typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata;
  } catch (error) {
    if (shouldWarn()) {
      console.warn(
        '@arcjet/guard: policy factory for "%s" threw; treating as a guard error:',
        policy.action,
        error,
      );
    }
    if (policy.onGuardError === "allow") {
      const output = await execute(input);
      return { allowed: true, output };
    }
    return sendDenied(send, errorResult(event, unavailableReason()));
  }

  const metadata: ArcjetMetadata = {
    "claude.managed-agents.tool": event.name,
    ...policy.context?.metadata,
    ...policyMetadata,
  };

  const gated = await runGuarded<GuardCustomToolResult<TOutput>>(client, {
    action: policy.action,
    rules,
    correlationId: policy.context?.correlationId,
    metadata,
    onDeny: (decision: DecisionDeny): GuardCustomToolResult<TOutput> => ({
      allowed: false,
      result: errorResult(event, deniedReason(decision)),
    }),
    onUnavailable: (): GuardCustomToolResult<TOutput> => ({
      allowed: false,
      result: errorResult(event, unavailableReason()),
    }),
    execute: async () => {
      const output = await execute(input);
      return { allowed: true, output };
    },
    onGuardError: policy.onGuardError ?? "deny",
  });

  if (!gated.allowed) {
    return sendDenied(send, gated.result);
  }
  return gated;
}

function wrapRunnableTool<TTool extends ManagedAgentsRunnableTool<any, any>>(
  client: ArcjetAgentClient,
  tool: TTool,
  policy: GuardCustomToolPolicy<Parameters<TTool["run"]>[0]>,
): TTool {
  if (typeof tool.run !== "function") {
    throw new TypeError("@arcjet/guard: guardCustomTool() requires a tool with a run function");
  }
  if (arcjetProtectedTool in tool) {
    throw new Error(
      "@arcjet/guard: guardCustomTool() cannot wrap a tool that is already guarded",
    );
  }

  const originalRun = tool.run.bind(tool);
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-type-assertion -- Object.getPrototypeOf is typed any
  const proto = Object.getPrototypeOf(tool) as object | null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- copy every own descriptor
  const wrapped = Object.defineProperties(
    Object.create(proto),
    Object.getOwnPropertyDescriptors(tool),
  ) as TTool;

  const newRun = async (
    input: Parameters<TTool["run"]>[0],
    context?: unknown,
  ): Promise<ReturnType<TTool["run"]>> => {
    let rules: RuleWithInput[] | undefined;
    let policyMetadata: ArcjetMetadata | undefined;
    try {
      rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;
      policyMetadata = typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata;
    } catch (error) {
      if (shouldWarn()) {
        console.warn(
          '@arcjet/guard: policy factory for "%s" threw; treating as a guard error:',
          policy.action,
          error,
        );
      }
      if (policy.onGuardError === "allow") {
        // oxlint-disable-next-line typescript/no-unsafe-return -- original run is TTool["run"]
        return await originalRun(input, context);
      }
      throw new Error(unavailableReason(), { cause: error });
    }

    const toolName = typeof tool.name === "string" && tool.name.length > 0 ? tool.name : undefined;
    const metadata: ArcjetMetadata = {
      ...(toolName !== undefined && { "claude.managed-agents.tool": toolName }),
      ...policy.context?.metadata,
      ...policyMetadata,
    };

    // oxlint-disable-next-line typescript/no-unsafe-return -- TTool["run"] is the wrapped tool's output
    return runGuarded<ReturnType<TTool["run"]>>(client, {
      action: policy.action,
      rules,
      correlationId: policy.context?.correlationId,
      metadata,
      onDeny: (decision: DecisionDeny) => {
        throw new Error(deniedReason(decision));
      },
      onUnavailable: () => {
        throw new Error(unavailableReason());
      },
      execute: () => Promise.resolve(originalRun(input, context)),
      onGuardError: policy.onGuardError ?? "deny",
    });
  };

  Object.defineProperty(wrapped, "run", {
    value: newRun,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  Object.defineProperty(wrapped, arcjetProtectedTool, {
    value: true,
    enumerable: false,
    configurable: true,
  });
  return wrapped;
}
