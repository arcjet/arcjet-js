import type { DecisionDeny, RuleWithInput } from "@arcjet/guard";
import { jsonSchema } from "ai";
import type { InferToolInput, InferToolOutput, Tool } from "ai";

import { captureEvent, shouldWarn } from "./client.js";
import type { ArcjetAiClient } from "./client.js";
import type { ArcjetAiContext } from "./context.js";
import { arcjetProtectedTool } from "./internal.js";

/** Structured tool result returned to the model when a call is denied. */
export interface ArcjetDenialResult {
  arcjetDenied: true;
  /** Denial reason, e.g. `"RATE_LIMIT"` or `"PROMPT_INJECTION"`. */
  reason: string;
  /** Human/model-readable explanation of the denial. */
  message: string;
  /** Whether retrying later can succeed (true for rate limits). */
  retryable: boolean;
  /** Seconds until a rate-limited call may be retried. */
  retryAfterSeconds?: number;
}

/** Policy for `protectTool()`. */
export interface ProtectToolPolicy<T extends Tool> {
  /** Guard label and capture action: `"resource.verb"`, past tense. */
  action: string;
  /** Rules to evaluate; omit (or return `[]`) for capture-only wrapping. */
  rules?: RuleWithInput[] | ((input: InferToolInput<T>) => RuleWithInput[]);
  /** Metadata merged over the context's (object, or per-call function of the tool input). */
  metadata?: Record<string, string> | ((input: InferToolInput<T>) => Record<string, string>);
  /** Explicit correlation ID; overrides the context's when set. */
  correlationId?: string;
  /** Reshape the denial payload the model sees. */
  onDeny?: (decision: DecisionDeny) => unknown;
}

const contextSchema = jsonSchema<ArcjetAiContext | undefined>(
  {
    type: "object",
    properties: {
      correlationId: { type: "string" },
      metadata: { type: "object", additionalProperties: { type: "string" } },
    },
    required: ["correlationId"],
  },
  {
    validate(value) {
      if (
        value === undefined ||
        (typeof value === "object" &&
          value !== null &&
          typeof (value as ArcjetAiContext).correlationId === "string")
      ) {
        return { success: true, value: value as ArcjetAiContext | undefined };
      }
      return {
        success: false,
        error: new Error("@arcjet/ai: toolsContext entry is not an ArcjetAiContext"),
      };
    },
  },
);

/**
 * Wraps an AI SDK tool with guard-gated execution and event capture.
 *
 * **Execution order:**
 * 1. Extract context and policy configuration (including metadata merge)
 * 2. Invoke `guard()` with rules if provided (or skip if rules are empty/omitted)
 * 3. On DENY, return `ArcjetDenialResult` without executing the tool
 * 4. On ALLOW or when rules are skipped, execute the tool and capture the outcome
 * 5. Fire capture events throughout (on deny, on error, on success)
 *
 * **Capture-only mode:** When `policy.rules` is omitted or resolves to an empty array,
 * the guard check is skipped entirely and the call proceeds to execution with
 * capture-only instrumentation (no guard decision, no decision ID).
 *
 * **Fail-open posture:** When the guard API errors (transport failure, timeout),
 * the tool still executes and the failure is observable via a warning (when
 * `ARCJET_LOG_LEVEL` is set) and `decision.hasFailedOpen()`.
 *
 * **Context schema injection:** The wrapped tool's `contextSchema` is injected to
 * receive `ArcjetAiContext | undefined` for correlation and metadata propagation.
 * Tools that declare their own `contextSchema` cannot be wrapped.
 *
 * @param client - Guard client with optional `experimental_capture()` method
 * @param tool - The tool to wrap; must have an `execute` function and no `contextSchema`
 * @param policy - Execution policy: `action` (required), `rules`, `metadata`, `correlationId` override, `onDeny` hook
 * @returns A tool with protected `execute`, injected `contextSchema`, and context type `ArcjetAiContext | undefined`
 *
 * @example
 * ```ts
 * import { launchArcjet, tokenBucket } from "@arcjet/guard";
 * import { tool, jsonSchema, generateText } from "ai";
 * import { protectTool, createAiContext, aiToolsContext } from "@arcjet/ai";
 *
 * const arcjetClient = launchArcjet({ key: process.env.ARCJET_KEY! });
 *
 * const sendEmailTool = tool({
 *   description: "Send an email",
 *   inputSchema: jsonSchema<{ to: string; subject: string }>({
 *     type: "object",
 *     properties: { to: { type: "string" }, subject: { type: "string" } },
 *     required: ["to", "subject"],
 *   }),
 *   execute: async (input) => {
 *     // Real email service call
 *     return { success: true, messageId: "msg-123" };
 *   },
 * });
 *
 * const protectedEmail = protectTool(arcjetClient, sendEmailTool, {
 *   action: "email.sent",
 *   rules: [
 *     tokenBucket({
 *       mode: "LIVE",
 *       refillRate: 5,
 *       intervalSeconds: 60,
 *       maxTokens: 5,
 *     }),
 *   ],
 * });
 *
 * const ctx = createAiContext({ correlationId: "req-123" });
 * const result = await generateText({
 *   model: languageModel, // Use a real language model, e.g., from @ai-sdk/openai
 *   tools: { sendEmail: protectedEmail },
 *   toolsContext: aiToolsContext(ctx, { sendEmail: protectedEmail }),
 *   prompt: "Send a confirmation email",
 * });
 * ```
 */
export function protectTool<T extends Tool>(
  client: ArcjetAiClient,
  tool: T,
  policy: ProtectToolPolicy<T>,
): Tool<InferToolInput<T>, InferToolOutput<T>, ArcjetAiContext | undefined> {
  if (typeof tool.execute !== "function") {
    throw new Error("@arcjet/ai: protectTool() requires a tool with an execute function");
  }
  if (tool.contextSchema !== undefined) {
    throw new Error(
      "@arcjet/ai: protectTool() cannot wrap a tool that declares its own contextSchema (pilot limitation)",
    );
  }
  const originalExecute = tool.execute.bind(tool);

  return {
    ...tool,
    [arcjetProtectedTool]: true,
    contextSchema,
    async execute(input: InferToolInput<T>, options: never) {
      // `options.context` was validated by contextSchema above.
      const opts = options as {
        context?: ArcjetAiContext;
        [key: string]: unknown;
      };
      const ctx = opts.context;
      if (ctx === undefined && shouldWarn()) {
        console.warn(
          `@arcjet/ai: tool call "${policy.action}" has no ArcjetAiContext; ` +
            "guard checks run uncorrelated. Pass toolsContext: aiToolsContext(ctx, tools).",
        );
      }
      const correlationId = policy.correlationId ?? ctx?.correlationId;
      const metadata = {
        ...ctx?.metadata,
        ...(typeof policy.metadata === "function" ? policy.metadata(input) : policy.metadata),
      };
      const rules = typeof policy.rules === "function" ? policy.rules(input) : policy.rules;

      let decisionId: string | undefined;
      if (rules !== undefined && rules.length > 0) {
        let decision;
        try {
          decision = await client.guard({
            label: policy.action,
            rules,
            ...(correlationId !== undefined && { correlationId }),
            metadata,
          });
        } catch (error) {
          // Defense in depth: the guard client itself converts transport
          // failures into ALLOW decisions with hasFailedOpen() === true, so
          // this path means something unexpected broke. Fail open.
          if (shouldWarn()) {
            console.warn(
              `@arcjet/ai: guard check for "${policy.action}" errored; failing open:`,
              error,
            );
          }
          decision = undefined;
        }
        if (decision !== undefined) {
          decisionId = decision.id;
          if (decision.hasFailedOpen() && shouldWarn()) {
            console.warn(`@arcjet/ai: guard check for "${policy.action}" failed open (API error).`);
          }
          if (decision.conclusion === "DENY") {
            captureEvent(client, {
              action: policy.action,
              ...(correlationId !== undefined && { correlationId }),
              ...(decisionId !== undefined && { decisionId }),
              metadata: { ...metadata, outcome: "denied" },
            });
            if (policy.onDeny !== undefined) {
              return policy.onDeny(decision);
            }
            return denialResult(decision);
          }
        }
      }

      let result;
      try {
        result = await originalExecute(input, options);
      } catch (error) {
        captureEvent(client, {
          action: policy.action,
          ...(correlationId !== undefined && { correlationId }),
          ...(decisionId !== undefined && { decisionId }),
          metadata: { ...metadata, outcome: "error" },
        });
        throw error;
      }
      captureEvent(client, {
        action: policy.action,
        ...(correlationId !== undefined && { correlationId }),
        ...(decisionId !== undefined && { decisionId }),
        metadata: { ...metadata, outcome: "success" },
      });
      return result;
    },
  } as unknown as Tool<InferToolInput<T>, InferToolOutput<T>, ArcjetAiContext | undefined>;
}

function denialResult(decision: DecisionDeny): ArcjetDenialResult {
  const retryable = decision.reason === "RATE_LIMIT";
  let retryAfterSeconds: number | undefined;
  for (const result of decision.results) {
    if ("resetAtUnixSeconds" in result && typeof result.resetAtUnixSeconds === "number") {
      retryAfterSeconds = Math.max(0, Math.ceil(result.resetAtUnixSeconds - Date.now() / 1000));
      break;
    }
  }
  return {
    arcjetDenied: true,
    reason: decision.reason,
    message: retryable
      ? `Arcjet denied this tool call (${decision.reason}). It may be retried` +
        (retryAfterSeconds === undefined ? " later." : ` after ${retryAfterSeconds} seconds.`)
      : `Arcjet denied this tool call (${decision.reason}). Do not retry; explain the denial to the user or try a different approach.`,
    retryable,
    ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
  };
}
