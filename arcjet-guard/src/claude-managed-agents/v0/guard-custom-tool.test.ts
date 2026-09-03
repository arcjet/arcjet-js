// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { claudeManagedAgentsContext } from "./context.ts";
import { guardCustomTool } from "./guard-custom-tool.ts";
import type { AgentCustomToolUseEvent, UserCustomToolResultEventParams } from "./types.ts";

function customToolUse(overrides?: Partial<AgentCustomToolUseEvent>): AgentCustomToolUseEvent {
  return {
    type: "agent.custom_tool_use",
    id: "sevt_tool_1",
    name: "lookup_order",
    input: { orderNumber: "1234" },
    processed_at: "2026-03-15T10:00:00Z",
    ...overrides,
  };
}

function sendRecorder() {
  const calls: UserCustomToolResultEventParams[] = [];
  const send = (result: UserCustomToolResultEventParams) => {
    calls.push(result);
    return Promise.resolve({ data: [result] });
  };
  return { send, calls };
}

test("ALLOW executes the tool and does not send a denial result", async () => {
  const { client } = stubClient(decisionAllow());
  const { send, calls } = sendRecorder();
  let executed = 0;

  const gated = await guardCustomTool(
    client,
    {
      event: customToolUse(),
      execute: (input) => {
        executed += 1;
        return Promise.resolve(`shipped:${String(input["orderNumber"])}`);
      },
      send,
    },
    {
      action: "order.looked-up",
      rules: (input) =>
        typeof input["orderNumber"] === "string" && input["orderNumber"].length > 0
          ? [fakeRule]
          : [],
      context: claudeManagedAgentsContext({ correlationId: "conversation-1" }),
    },
  );

  assert.equal(gated.allowed, true);
  if (gated.allowed) {
    assert.equal(gated.output, "shipped:1234");
  }
  assert.equal(executed, 1);
  assert.equal(calls.length, 0);
});

test("ALLOW records caller correlation and tool metadata", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const { send } = sendRecorder();

  await guardCustomTool(
    client,
    {
      event: customToolUse(),
      execute: () => Promise.resolve("ok"),
      send,
    },
    {
      action: "order.looked-up",
      rules: [fakeRule],
      context: claudeManagedAgentsContext({ correlationId: "conversation-1" }),
    },
  );

  assert.equal(recorded(guardCalls[0])["correlationId"], "conversation-1");
  assert.equal(
    recorded(recorded(guardCalls[0])["metadata"])["claude.managed-agents.tool"],
    "lookup_order",
  );
});

test("DENY does not execute and sends user.custom_tool_result with is_error", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const { send, calls } = sendRecorder();
  let executed = 0;

  const gated = await guardCustomTool(
    client,
    {
      event: customToolUse(),
      execute: () => {
        executed += 1;
        return Promise.resolve("should-not-run");
      },
      send,
    },
    { action: "order.looked-up", rules: [fakeRule] },
  );

  assert.equal(gated.allowed, false);
  assert.equal(executed, 0);
  assert.equal(calls.length, 1);
  const result = calls[0];
  assert.notEqual(result, undefined);
  assert.equal(result.type, "user.custom_tool_result");
  assert.equal(result.custom_tool_use_id, "sevt_tool_1");
  assert.equal(result.is_error, true);
  assert.equal(result.content?.[0]?.type, "text");
  if (result.content?.[0]?.type === "text") {
    assert.match(result.content[0].text, /PROMPT_INJECTION|denied/i);
  }
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
  if (!gated.allowed) {
    assert.deepEqual(gated.result, result);
  }
});

test("fail-closed: guard throw does not execute and sends an error result", async () => {
  const { client } = stubClient(new Error("unreachable"));
  const { send, calls } = sendRecorder();
  let executed = 0;

  const gated = await guardCustomTool(
    client,
    {
      event: customToolUse(),
      execute: () => {
        executed += 1;
        return Promise.resolve("nope");
      },
      send,
    },
    { action: "order.looked-up" },
  );

  assert.equal(gated.allowed, false);
  assert.equal(executed, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.type, "user.custom_tool_result");
  assert.equal(calls[0]?.is_error, true);
  assert.equal(calls[0]?.custom_tool_use_id, "sevt_tool_1");
});

test("fail-closed: failed-open ALLOW does not execute", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const { send, calls } = sendRecorder();
  let executed = 0;

  const gated = await guardCustomTool(
    client,
    {
      event: customToolUse(),
      execute: () => {
        executed += 1;
        return Promise.resolve("nope");
      },
      send,
    },
    { action: "order.looked-up" },
  );

  assert.equal(gated.allowed, false);
  assert.equal(executed, 0);
  assert.equal(calls[0]?.is_error, true);
});

test("echoes session_thread_id when the use event has one", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const { send, calls } = sendRecorder();

  await guardCustomTool(
    client,
    {
      event: customToolUse({ session_thread_id: "thread_sub" }),
      execute: () => Promise.resolve("nope"),
      send,
    },
    { action: "order.looked-up" },
  );

  assert.equal(calls[0]?.session_thread_id, "thread_sub");
});

test("does not invent session_thread_id when the use event has none", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const { send, calls } = sendRecorder();

  await guardCustomTool(
    client,
    {
      event: customToolUse(),
      execute: () => Promise.resolve("nope"),
      send,
    },
    { action: "order.looked-up" },
  );

  assert.equal("session_thread_id" in (calls[0] ?? {}), false);
});

test("wrapped betaTool run is not called on DENY", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let executed = 0;
  const tool = {
    name: "lookup_order",
    run: (input: { orderNumber: string }) => {
      executed += 1;
      return Promise.resolve(input.orderNumber);
    },
  };

  const wrapped = guardCustomTool(client, tool, {
    action: "order.looked-up",
    rules: [fakeRule],
  });

  await assert.rejects(() => wrapped.run({ orderNumber: "1234" }), /denied|PROMPT_INJECTION/i);
  assert.equal(executed, 0);
  assert.notStrictEqual(wrapped, tool);
});

test("wrapped betaTool run executes on ALLOW", async () => {
  const { client } = stubClient(decisionAllow());
  const tool = {
    name: "lookup_order",
    run: (input: { orderNumber: string }) => Promise.resolve(`ok:${input.orderNumber}`),
  };

  const wrapped = guardCustomTool(client, tool, { action: "order.looked-up" });
  assert.equal(await wrapped.run({ orderNumber: "9" }), "ok:9");
});

test("throws when wrapping a tool that is already guarded", () => {
  const { client } = stubClient(decisionAllow());
  const tool = { name: "once", run: () => Promise.resolve("ok") };
  const wrapped = guardCustomTool(client, tool, { action: "once.ran" });
  assert.throws(() => guardCustomTool(client, wrapped, { action: "once.ran" }), /already guarded/);
});

test("hosted onGuardError allow still executes when the guard throws", async () => {
  const { client } = stubClient(new Error("unreachable"));
  const { send, calls } = sendRecorder();
  let executed = 0;

  const gated = await guardCustomTool(
    client,
    {
      event: customToolUse(),
      execute: () => {
        executed += 1;
        return Promise.resolve("ran");
      },
      send,
    },
    { action: "order.looked-up", onGuardError: "allow" },
  );

  assert.equal(gated.allowed, true);
  assert.equal(executed, 1);
  assert.equal(calls.length, 0);
});

test("invalid hosted event with an id sends an error result instead of throwing", async () => {
  const { client } = stubClient(decisionAllow());
  const { send, calls } = sendRecorder();
  let executed = 0;

  const gated = await guardCustomTool(
    client,
    {
      event: { type: "agent.message", id: "sevt_bad" } as never,
      execute: () => {
        executed += 1;
        return Promise.resolve("nope");
      },
      send,
    },
    { action: "order.looked-up" },
  );

  assert.equal(gated.allowed, false);
  assert.equal(executed, 0);
  assert.equal(calls[0]?.type, "user.custom_tool_result");
  assert.equal(calls[0]?.custom_tool_use_id, "sevt_bad");
  assert.equal(calls[0]?.is_error, true);
});

test("use event missing processed_at still gates and can execute", async () => {
  const { client } = stubClient(decisionAllow());
  const { send, calls } = sendRecorder();
  const event = {
    type: "agent.custom_tool_use" as const,
    id: "sevt_no_ts",
    name: "lookup_order",
    input: { orderNumber: "1" },
  };

  const gated = await guardCustomTool(
    client,
    {
      event: event as never,
      execute: () => Promise.resolve("ok"),
      send,
    },
    { action: "order.looked-up" },
  );

  assert.equal(gated.allowed, true);
  if (gated.allowed) {
    assert.equal(gated.output, "ok");
  }
  assert.equal(calls.length, 0);
});

test("send throw on deny still returns the error result", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let executed = 0;

  const gated = await guardCustomTool(
    client,
    {
      event: customToolUse(),
      execute: () => {
        executed += 1;
        return Promise.resolve("nope");
      },
      send: () => Promise.reject(new Error("network")),
    },
    { action: "order.looked-up" },
  );

  assert.equal(gated.allowed, false);
  assert.equal(executed, 0);
  if (!gated.allowed) {
    assert.equal(gated.result.type, "user.custom_tool_result");
    assert.equal(gated.result.is_error, true);
    assert.equal(gated.result.custom_tool_use_id, "sevt_tool_1");
  }
});

test("wrapped betaTool onGuardError allow still runs when the guard throws", async () => {
  const { client } = stubClient(new Error("unreachable"));
  const tool = {
    name: "lookup_order",
    run: (input: { orderNumber: string }) => Promise.resolve(`ok:${input.orderNumber}`),
  };
  const wrapped = guardCustomTool(client, tool, {
    action: "order.looked-up",
    onGuardError: "allow",
  });
  assert.equal(await wrapped.run({ orderNumber: "9" }), "ok:9");
});

test("wrapped betaTool factory throw fail-closes", async () => {
  const { client } = stubClient(decisionAllow());
  const tool = {
    name: "lookup_order",
    run: (_input: { orderNumber: string }) => Promise.resolve("nope"),
  };
  const wrapped = guardCustomTool(client, tool, {
    action: "order.looked-up",
    rules: () => {
      throw new Error("factory");
    },
  });
  await assert.rejects(() => wrapped.run({ orderNumber: "1" }), /could not be completed/i);
});
