import type {
  ProcessInputArgs,
  ProcessInputResult,
  ProcessInputStepArgs,
  ProcessInputStepResult,
  ProcessOutputResultArgs,
  Processor,
} from "@mastra/core/processors";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { OnGuardError } from "../../agents/guard-action.ts";
import type { ArcjetMetadata, RuleWithInput } from "../../types.ts";
import { mastraAgentContext } from "./context.ts";
import type { MastraRequestContextLike } from "./context.ts";
import { deniedReason, unavailableReason } from "./denial.ts";
import { runGate } from "./gate.ts";

/**
 * Text and context passed to `rules` / `metadata` callbacks on `guardProcessor`.
 */
export interface GuardProcessorInput {
  /** Concatenated text from the messages being screened. */
  text: string;
  /** The processor-stage messages (user/assistant, not system). */
  messages: unknown[];
  requestContext?: MastraRequestContextLike;
}

/**
 * Policy for `guardProcessor()` — a Mastra `Processor` for `inputProcessors`
 * and `outputProcessors`.
 */
export interface GuardProcessorPolicy {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /**
   * Processor `id`. Defaults to `"arcjet-guard"`. Required by Mastra's
   * `Processor` interface.
   */
  id?: string;
  /** Optional display name. Defaults to `"Arcjet Guard"`. */
  name?: string;
  /**
   * Rules to evaluate, static or computed from the extracted text. Omitting
   * this still performs the guard call.
   */
  rules?: RuleWithInput[] | ((input: GuardProcessorInput) => RuleWithInput[]);
  /** Metadata merged over the derived Mastra context. */
  metadata?: ArcjetMetadata | ((input: GuardProcessorInput) => ArcjetMetadata);
  /** How to respond when guard evaluation is unavailable. Default `"deny"`. */
  onGuardError?: OnGuardError;
}

function isRequestContextLike(value: unknown): value is MastraRequestContextLike {
  return (
    value !== null &&
    typeof value === "object" &&
    "get" in value &&
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- structural `get` check without importing Mastra
    typeof (value as { get?: unknown }).get === "function"
  );
}

/** Module-scoped so it cannot collide with a Mastra-owned string key or leak if `state` is serialised. */
const inputScreened = Symbol("arcjet.inputScreened");

function textFromPart(part: unknown): string {
  if (typeof part !== "object" || part === null) {
    return "";
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- message parts are untyped Mastra content
  const typed = part as { type?: unknown; text?: unknown };
  if (typed.type === "text" && typeof typed.text === "string") {
    return typed.text;
  }
  return "";
}

function textFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return "";
  }
  let text = "";
  for (const part of parts) {
    text += textFromPart(part);
  }
  return text;
}

function messageText(message: unknown): string {
  if (typeof message !== "object" || message === null) {
    return "";
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Mastra messages are structurally typed
  const rec = message as { content?: unknown; parts?: unknown };
  if (typeof rec.content === "string") {
    return rec.content;
  }
  if (Array.isArray(rec.content)) {
    return textFromParts(rec.content);
  }
  const fromTopLevel = textFromParts(rec.parts);
  if (fromTopLevel.length > 0) {
    return fromTopLevel;
  }
  if (typeof rec.content !== "object" || rec.content === null) {
    return "";
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- nested Mastra content envelope
  const nested = rec.content as { parts?: unknown; content?: unknown };
  const fromNested = textFromParts(nested.parts);
  if (fromNested.length > 0) {
    return fromNested;
  }
  if (typeof nested.content === "string") {
    return nested.content;
  }
  return "";
}

function collectText(messages: unknown[], roles?: ReadonlyArray<string>): string {
  const parts: string[] = [];
  for (const message of messages) {
    if (roles !== undefined) {
      const role =
        typeof message === "object" && message !== null
          ? (message as { role?: unknown }).role
          : undefined;
      if (typeof role === "string" && !roles.includes(role)) {
        continue;
      }
    }
    const text = messageText(message);
    if (text.length > 0) {
      parts.push(text);
    }
  }
  return parts.join("\n");
}

function idsFromMessages(messages: unknown[]): {
  threadId?: string;
  resourceId?: string;
} {
  for (const message of messages) {
    if (typeof message !== "object" || message === null) {
      continue;
    }
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- MastraDBMessage carries optional thread/resource
    const rec = message as { threadId?: unknown; resourceId?: unknown };
    const threadId = typeof rec.threadId === "string" ? rec.threadId : undefined;
    const resourceId = typeof rec.resourceId === "string" ? rec.resourceId : undefined;
    if (threadId !== undefined || resourceId !== undefined) {
      return {
        ...(threadId === undefined ? {} : { threadId }),
        ...(resourceId === undefined ? {} : { resourceId }),
      };
    }
  }
  return {};
}

/**
 * Call Mastra's `abort()` and, if a buggy implementation returns, still deny.
 * Returning after a DENY would fail the turn open.
 */
function denyTurn(
  abort: (reason?: string, options?: { retry?: boolean }) => never,
  reason: string,
  options?: { retry?: boolean },
): never {
  abort(reason, options);
  throw new Error("@arcjet/guard: processor abort() returned; denying the turn");
}

/**
 * Mastra `Processor` that screens input (and optionally output) with Arcjet.
 *
 * On DENY, calls `abort(reason)` so Mastra raises a tripwire and the turn
 * stops. Channels already run through `processInput`, so there is no separate
 * `guardInbound`.
 *
 * @example
 * ```ts
 * import { launchArcjet, detectPromptInjection } from "@arcjet/guard";
 * import { guardProcessor } from "@arcjet/guard/mastra/v1";
 * import { Agent } from "@mastra/core/agent";
 *
 * const arcjet = launchArcjet({ key: process.env["ARCJET_KEY"]! });
 *
 * const inbound = guardProcessor(arcjet, {
 *   action: "message.received",
 *   rules: ({ text }) => [detectPromptInjection()(text)],
 * });
 *
 * export const agent = new Agent({
 *   id: "support-agent",
 *   name: "support-agent",
 *   instructions: "Help the user.",
 *   model: "openai/gpt-4o",
 *   inputProcessors: [inbound],
 * });
 * ```
 */
/**
 * Processor returned by `guardProcessor()`. `processInput` and
 * `processOutputResult` are required so the value is assignable to Mastra's
 * `inputProcessors` / `outputProcessors` unions (those require one of the
 * phase methods, which a bare `Processor` does not).
 */
export type GuardProcessor = Processor & {
  readonly id: string;
  processInput: (args: ProcessInputArgs) => Promise<ProcessInputResult>;
  processInputStep: (
    args: ProcessInputStepArgs,
  ) => Promise<ProcessInputStepResult | ProcessInputStepArgs["messages"]>;
  processOutputResult: (
    args: ProcessOutputResultArgs,
  ) => Promise<ProcessOutputResultArgs["messages"]>;
};

export function guardProcessor(
  client: ArcjetAgentClient,
  policy: GuardProcessorPolicy,
): GuardProcessor {
  const processorId = policy.id ?? "arcjet-guard";
  const processorName = policy.name ?? "Arcjet Guard";

  async function screen(
    messages: unknown[],
    abort: (reason?: string, options?: { retry?: boolean }) => never,
    requestContext: unknown,
    phase: "input" | "output",
    extraText?: string,
  ): Promise<void> {
    // Input screens every conversation message. Restricting to `user` would
    // let a hostile client skip the gate by spoofing `role: "assistant"`.
    // System prompts live on `systemMessages`, not `messages`.
    const roles = phase === "input" ? undefined : (["assistant"] as const);
    const fromMessages = collectText(messages, roles);
    const text =
      extraText !== undefined && extraText.length > 0
        ? [fromMessages, extraText].filter((part) => part.length > 0).join("\n")
        : fromMessages;

    const requestCtx = isRequestContextLike(requestContext) ? requestContext : undefined;
    const fromMessagesIds = idsFromMessages(messages);
    const agentCtx = mastraAgentContext({
      ...(requestCtx === undefined ? {} : { requestContext: requestCtx }),
      ...(fromMessagesIds.threadId === undefined && fromMessagesIds.resourceId === undefined
        ? {}
        : { agent: fromMessagesIds }),
    });

    const input: GuardProcessorInput = {
      text,
      messages,
      ...(requestCtx === undefined ? {} : { requestContext: requestCtx }),
    };

    const rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;
    const policyMetadata =
      typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata;
    const metadata: ArcjetMetadata = {
      ...agentCtx.metadata,
      "mastra.phase": phase,
      ...policyMetadata,
    };

    await runGate(client, {
      action: policy.action,
      rules,
      correlationId: agentCtx.correlationId,
      metadata,
      onAllow: () => {
        /* allow the turn to continue */
      },
      onDeny: (decision) =>
        denyTurn(abort, deniedReason(decision), { retry: decision.reason === "RATE_LIMIT" }),
      onUnavailable: () => denyTurn(abort, unavailableReason()),
      onGuardError: policy.onGuardError ?? "deny",
    });
  }

  const processor: GuardProcessor = {
    id: processorId,
    name: processorName,
    async processInput(args: ProcessInputArgs): Promise<ProcessInputResult> {
      await screen(args.messages, args.abort, args.requestContext, "input");
      if (args.state !== undefined && args.state !== null) {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- module-scoped Symbol marker on Mastra's shared state bag
        (args.state as Record<PropertyKey, unknown>)[inputScreened] = true;
      }
      return args.messages;
    },
    async processInputStep(
      args: ProcessInputStepArgs,
    ): Promise<ProcessInputStepResult | ProcessInputStepArgs["messages"]> {
      // processInput already screened step 0. Later steps (tool continuations)
      // would otherwise skip the inbound gate.
      //
      // Relies on Mastra passing the same `state` object from processInput
      // into processInputStep (Processor contract). A cloned or fresh state
      // re-screens step 0 — fail closed, not open.
      const state =
        args.state === undefined || args.state === null
          ? undefined
          : // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- read the module-scoped Symbol marker
            (args.state as Record<PropertyKey, unknown>);
      if (args.stepNumber === 0 && state?.[inputScreened] === true) {
        return args.messages;
      }
      await screen(args.messages, args.abort, args.requestContext, "input");
      return args.messages;
    },
    async processOutputResult(
      args: ProcessOutputResultArgs,
    ): Promise<ProcessOutputResultArgs["messages"]> {
      const extraText = typeof args.result?.text === "string" ? args.result.text : undefined;
      await screen(args.messages, args.abort, args.requestContext, "output", extraText);
      return args.messages;
    },
  };

  return processor;
}
