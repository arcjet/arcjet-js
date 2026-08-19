// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unsafe-member-access, typescript/no-unsafe-type-assertion, typescript/require-await, eslint/require-await -- test fixtures built from the real SDK types
/**
 * End-to-end behaviour through the real `Runner` / `Agent` / `run()` loop,
 * driven by the SDK's own `ScriptedModel` so no network is involved.
 *
 * `real-tool.test.ts` calls `invoke` directly, which cannot see two things:
 *
 * - Whether the runner actually reaches the guarded tool. `guardTool`
 *   returns a copy, so anything that rebuilt or re-registered tools between
 *   `new Agent({ tools })` and `executeFunctionToolCalls` would run the
 *   unguarded original while a direct-invoke test still passed.
 * - What the model is finally shown. The claim documented on
 *   `ArcjetDenialResult` — that the denial rides in the payload of a
 *   `function_call_result` with `status: "completed"`, rather than an error
 *   envelope — is a property of `getToolCallOutputItem`, not of this
 *   package. Here it is asserted against the item the next model call
 *   actually receives.
 *
 * This file value-imports the optional peer, so it lives outside
 * `src/openai-agents/` — that directory is globbed by the openai-agents-absent
 * CI job and scanned for type-only imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { Agent, Runner, tool } from "@openai/agents";
import { assistantMessage, functionCall, ScriptedModel } from "@openai/agents/testing";

import type { ArcjetDenialResult } from "../../src/openai-agents/v0/denial.ts";
import { guardTool } from "../../src/openai-agents/v0/guard-tool.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

const parameters = {
  type: "object" as const,
  properties: { note: { type: "string" as const } },
  required: ["note"] as Array<"note">,
  additionalProperties: false as const,
};

const CALL_ID = "call-e2e-1";

interface ToolResultItem {
  type: string;
  callId?: string;
  status?: string;
  output?: { type: string; text: string };
}

/**
 * The `function_call_result` the model is shown on its second turn. That is
 * the only place the denial's model-visible shape is observable.
 */
function resultItemFromSecondCall(model: ScriptedModel): ToolResultItem {
  assert.ok(model.calls.length >= 2, "the runner must call the model again after the tool");
  const { input } = model.calls[1].request;
  assert.ok(Array.isArray(input), "the second turn carries history, not a bare string");
  const items = input as ToolResultItem[];
  const resultItem = items.find(
    (item) => item.type === "function_call_result" && item.callId === CALL_ID,
  );
  assert.ok(resultItem, "the model must be shown a function_call_result for the tool call");
  return resultItem;
}

function scriptedRun(guardedTool: ReturnType<typeof tool>) {
  const model = new ScriptedModel([
    [functionCall("lookup_order", { note: "hello" }, { callId: CALL_ID })],
    [assistantMessage("done")],
  ]);
  const agent = new Agent({
    name: "support-agent",
    instructions: "Help the user.",
    tools: [guardedTool],
  });
  // A scripted model plus disabled tracing keeps the loop entirely local.
  const runner = new Runner({ model, tracingDisabled: true });
  return { model, agent, runner };
}

test("DENY through the real run() loop: execute never runs and the model sees the denial", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const guarded = guardTool(
    client,
    tool({
      name: "lookup_order",
      description: "real dependency test tool",
      parameters,
      execute: () => {
        calls += 1;
        return "must not run";
      },
    }),
    { action: "order.looked-up" },
  );

  const { model, agent, runner } = scriptedRun(guarded);
  const result = await runner.run(agent, "look up my order", {
    context: { sessionId: "sess-e2e" },
  });

  assert.equal(calls, 0);
  assert.equal(result.finalOutput, "done");

  const resultItem = resultItemFromSecondCall(model);
  // Not an error envelope: the tool did not throw, so `errorFunction` was
  // never involved and the item completed normally.
  assert.equal(resultItem.status, "completed");
  assert.equal(resultItem.output?.type, "text");

  const denial = JSON.parse(resultItem.output?.text ?? "") as ArcjetDenialResult;
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
  assert.equal(denial.retryable, false);
  assert.match(denial.message, /Do not retry/);
});

test("ALLOW through the real run() loop: execute runs and its own output reaches the model", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let calls = 0;
  const guarded = guardTool(
    client,
    tool({
      name: "lookup_order",
      description: "real dependency test tool",
      parameters,
      execute: (input) => {
        calls += 1;
        const { note } = input as { note: string };
        return `ran:${note}`;
      },
    }),
    { action: "order.looked-up" },
  );

  const { model, agent, runner } = scriptedRun(guarded);
  const result = await runner.run(agent, "look up my order", {
    context: { sessionId: "sess-e2e" },
  });

  assert.equal(calls, 1);
  assert.equal(result.finalOutput, "done");
  assert.equal(guardCalls.length, 1);

  const resultItem = resultItemFromSecondCall(model);
  assert.equal(resultItem.status, "completed");
  assert.equal(resultItem.output?.text, "ran:hello");
});

test("the runner reaches the guarded copy, not the tool passed to guardTool", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const authored = tool({
    name: "lookup_order",
    description: "real dependency test tool",
    parameters,
    execute: () => {
      calls += 1;
      return "must not run";
    },
  });
  const guarded = guardTool(client, authored, { action: "order.looked-up" });

  // The unguarded original is still a working tool. Registering the guarded
  // copy must be what decides whether `execute` runs.
  assert.notStrictEqual(guarded, authored);

  const { model, agent, runner } = scriptedRun(guarded);
  await runner.run(agent, "look up my order", { context: { sessionId: "sess-e2e" } });

  assert.equal(calls, 0);
  const denial = JSON.parse(
    resultItemFromSecondCall(model).output?.text ?? "",
  ) as ArcjetDenialResult;
  assert.equal(denial.arcjetDenied, true);
});
