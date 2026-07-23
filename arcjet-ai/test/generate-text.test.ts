import assert from "node:assert/strict";
import { test } from "node:test";

import type { Decision, DecisionDeny, RuleWithInput } from "@arcjet/guard";
import { generateText, stepCountIs, tool, jsonSchema } from "ai";
import { MockLanguageModelV4 } from "ai/test";

import {
  protectTool,
  createAiContext,
  aiToolsContext,
  type ArcjetAiClient,
  type ArcjetDenialResult,
} from "../dist/index.js";

/**
 * Factory for stub guard clients with in-memory decision and capture tracking.
 */
function stubClient(decision: Decision | Error) {
  const guardCalls: unknown[] = [];
  const captureCalls: unknown[] = [];
  return {
    client: {
      async guard(opts: unknown) {
        guardCalls.push(opts);
        if (decision instanceof Error) throw decision;
        return decision;
      },
      experimental_capture(opts: unknown) {
        captureCalls.push(opts);
      },
    } as unknown as ArcjetAiClient,
    guardCalls,
    captureCalls,
  };
}

/**
 * Stub ALLOW decision.
 */
function decisionAllow(): Decision {
  return {
    conclusion: "ALLOW",
    id: "gdec_allow1",
    results: [],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as Decision;
}

/**
 * Stub DENY decision (RATE_LIMIT).
 */
function decisionDenyRateLimit(resetAtUnixSeconds: number): DecisionDeny {
  return {
    conclusion: "DENY",
    reason: "RATE_LIMIT",
    id: "gdec_deny1",
    results: [
      {
        conclusion: "DENY",
        reason: "RATE_LIMIT",
        type: "TOKEN_BUCKET",
        resetAtUnixSeconds,
      },
    ],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as DecisionDeny;
}

/**
 * Fake rule for testing
 */
const fakeRule: RuleWithInput = {
  type: "TEST" as never,
} as RuleWithInput;

test("AC1.5: Context with correlationId flows through to guard call in generateText loop", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const executeCalls: unknown[] = [];

  const sendEmailTool = tool({
    description: "Send an email",
    inputSchema: jsonSchema<{ to: string }>({
      type: "object",
      properties: {
        to: { type: "string" },
      },
      required: ["to"],
    }),
    execute: async (input: { to: string }) => {
      executeCalls.push(input);
      return { success: true, messageId: "msg-123" };
    },
  });

  const protectedSendEmail = protectTool(client, sendEmailTool, {
    action: "email.sent",
    rules: [fakeRule],
  });

  const tools = { sendEmail: protectedSendEmail };

  const ctx = createAiContext({ correlationId: "corr-e2e-1" });

  const result = await generateText({
    model: new MockLanguageModelV4({
      doGenerate: [
        {
          content: [
            {
              type: "tool-call",
              toolCallId: "call-1",
              toolName: "sendEmail",
              input: JSON.stringify({ to: "a@b.co" }),
            },
          ],
          finishReason: { unified: "tool-calls", raw: undefined },
          usage: {
            inputTokens: { total: 10, noCache: undefined, cached: undefined },
            outputTokens: { total: 10 },
          },
          warnings: [],
        },
        {
          content: [{ type: "text", text: "done" }],
          finishReason: { unified: "stop", raw: undefined },
          usage: {
            inputTokens: { total: 10, noCache: undefined, cached: undefined },
            outputTokens: { total: 10 },
          },
          warnings: [],
        },
      ],
    }),
    tools,
    toolsContext: aiToolsContext(ctx, tools),
    stopWhen: stepCountIs(3),
    prompt: "Send an email and then respond",
  });

  assert.ok(result, "generateText should complete");
  assert.equal(guardCalls.length, 1, "guard should be called once");
  const guardCall = guardCalls[0] as Record<string, unknown>;
  assert.equal(
    guardCall.correlationId,
    "corr-e2e-1",
    "guard call should receive context correlationId",
  );
  assert.equal(executeCalls.length, 1, "tool execute should be called once");
});

test("AC1.6: Without toolsContext, tool execute runs uncorrelated with warning", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const executeCalls: unknown[] = [];

  const sendEmailTool = tool({
    description: "Send an email",
    inputSchema: jsonSchema<{ to: string }>({
      type: "object",
      properties: {
        to: { type: "string" },
      },
      required: ["to"],
    }),
    execute: async (input: { to: string }) => {
      executeCalls.push(input);
      return { success: true, messageId: "msg-456" };
    },
  });

  const protectedSendEmail = protectTool(client, sendEmailTool, {
    action: "email.sent",
    rules: [fakeRule],
  });

  const tools = { sendEmail: protectedSendEmail };

  // Note: we do NOT pass toolsContext here
  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  process.env.ARCJET_LOG_LEVEL = "warn";
  try {
    const result = await generateText({
      model: new MockLanguageModelV4({
        doGenerate: [
          {
            content: [
              {
                type: "tool-call",
                toolCallId: "call-1",
                toolName: "sendEmail",
                input: JSON.stringify({ to: "b@c.co" }),
              },
            ],
            finishReason: { unified: "tool-calls", raw: undefined },
            usage: {
              inputTokens: { total: 10, noCache: undefined, cached: undefined },
              outputTokens: { total: 10 },
            },
            warnings: [],
          },
          {
            content: [{ type: "text", text: "done" }],
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: { total: 10, noCache: undefined, cached: undefined },
              outputTokens: { total: 10 },
            },
            warnings: [],
          },
        ],
      }),
      tools,
      stopWhen: stepCountIs(3),
      prompt: "Send an email and then respond",
    });

    assert.ok(result, "generateText should complete");
    assert.equal(guardCalls.length, 1, "guard should be called once");
    const guardCall = guardCalls[0] as Record<string, unknown>;
    assert.strictEqual(
      guardCall.correlationId,
      undefined,
      "guard call should have undefined correlationId when no context",
    );
    assert.equal(executeCalls.length, 1, "tool execute should still run");
    assert.ok(
      warnCalls.some((call) => JSON.stringify(call).includes("no ArcjetAiContext")),
      "warning should mention missing context",
    );
  } finally {
    console.warn = originalWarn;
    delete process.env.ARCJET_LOG_LEVEL;
  }
});

test("AC2.9: DENY decision → generateText completes, loop continues with denial result in first step", async () => {
  const { client, guardCalls } = stubClient(
    decisionDenyRateLimit(Math.floor(Date.now() / 1000) + 30),
  );
  const executeCalls: unknown[] = [];

  const sendEmailTool = tool({
    description: "Send an email",
    inputSchema: jsonSchema<{ to: string }>({
      type: "object",
      properties: {
        to: { type: "string" },
      },
      required: ["to"],
    }),
    execute: async (input: { to: string }) => {
      executeCalls.push(input);
      return { success: true, messageId: "msg-789" };
    },
  });

  const protectedSendEmail = protectTool(client, sendEmailTool, {
    action: "email.sent",
    rules: [fakeRule],
  });

  const tools = { sendEmail: protectedSendEmail };

  const mockModel = new MockLanguageModelV4({
    doGenerate: [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "sendEmail",
            input: JSON.stringify({ to: "d@e.co" }),
          },
        ],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage: {
          inputTokens: { total: 10, noCache: undefined, cached: undefined },
          outputTokens: { total: 10 },
        },
        warnings: [],
      },
      {
        content: [{ type: "text", text: "unable to send" }],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 10, noCache: undefined, cached: undefined },
          outputTokens: { total: 10 },
        },
        warnings: [],
      },
    ],
  });

  const ctx = createAiContext({ correlationId: "corr-deny-1" });

  const result = await generateText({
    model: mockModel,
    tools,
    toolsContext: aiToolsContext(ctx, tools),
    stopWhen: stepCountIs(3),
    prompt: "Try to send an email",
  });

  assert.ok(result, "generateText should complete without throwing");
  assert.equal(result.steps.length, 2, "should have 2 steps: tool-call then response");

  // First step should contain the tool-call
  const firstStep = result.steps[0];
  assert.ok(firstStep, "first step should exist");
  assert.ok(Array.isArray(firstStep.content), "first step should have content array");

  // Find the tool-result part in the first step
  const toolResultPart = (firstStep.content as unknown[]).find(
    (part: unknown) =>
      typeof part === "object" &&
      part !== null &&
      (part as Record<string, unknown>).type === "tool-result",
  );
  assert.ok(toolResultPart, "first step should have a tool-result part");

  const output = (toolResultPart as Record<string, unknown>).output as ArcjetDenialResult;
  assert.strictEqual(output.arcjetDenied, true, "output should be an ArcjetDenialResult");
  assert.equal(output.reason, "RATE_LIMIT", "denial reason should be RATE_LIMIT");

  // The model should have received the denial result in its second call
  // Check that the model was called twice (first with initial prompt, second with tool result)
  assert.ok(
    typeof mockModel === "object" && mockModel !== null && "doGenerateCalls" in mockModel,
    "mock model should track doGenerateCalls",
  );
  const doGenerateCalls = (mockModel as Record<string, unknown>).doGenerateCalls as unknown[];
  const secondCall = doGenerateCalls[1];
  assert.ok(secondCall, "mock model should have second call");
  assert.ok(
    JSON.stringify((secondCall as Record<string, unknown>).prompt).includes("arcjetDenied"),
    "second model call should contain the denial result in prompt",
  );

  // The tool execute should never have been called (DENY prevented it)
  assert.equal(executeCalls.length, 0, "original tool execute should not be called on DENY");
});
