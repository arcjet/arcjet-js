// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/explicit-function-return-type, eslint/require-await, eslint/no-unnecessary-type-assertion, typescript/no-unnecessary-type-assertion -- test infrastructure and mocks
import assert from "node:assert/strict";
import { test } from "node:test";

import { asDenial, recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { arcjetProtectedTool } from "../../agents/internal.ts";
import type { LangGraphToolResult } from "./denial.ts";
import type { LangGraphToolNodeLike } from "./guard-tool-node.ts";
import { guardToolNode } from "./guard-tool-node.ts";
import type { LangGraphTool } from "./guard-tool.ts";
import { guardTool } from "./guard-tool.ts";

function createTool(
  name: string,
  impl?: (input: unknown, runtime?: unknown) => Promise<unknown>,
): LangGraphTool {
  const func = impl ?? (async () => ({ ok: name }));
  return {
    name,
    description: name,
    func,
    invoke: async (input: unknown, config?: unknown) => func(input, config),
  };
}

function createNode(tools: LangGraphTool[]): LangGraphToolNodeLike {
  const node: LangGraphToolNodeLike = {
    tools,
    invoke: async function (this: LangGraphToolNodeLike, input: unknown, config?: unknown) {
      const results = [];
      for (const tool of this.tools) {
        results.push(await tool.invoke?.(input, config));
      }
      return { messages: results };
    },
  };
  return node;
}

test("wraps a tools array and brands each unwrapped tool", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const raw = createTool("lookup");
  const wrapped = guardToolNode(client, [raw], { action: "tool.invoked" });

  assert.equal(wrapped.length, 1);
  assert.notStrictEqual(wrapped[0], raw);
  assert.equal(arcjetProtectedTool in wrapped[0]!, true);
  await wrapped[0]!.func!({}, { configurable: { thread_id: "t" } });
  assert.equal(guardCalls.length, 1);
});

test("wraps a ToolNode, leaving already-guarded tools unwrapped a second time", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const authored = guardTool(client, createTool("authored"), { action: "order.looked-up" });
  const mcp = createTool("mcp_search");
  const node = createNode([authored, mcp]);

  const wrapped = guardToolNode(client, node, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });

  assert.notStrictEqual(wrapped, node);
  assert.equal(arcjetProtectedTool in wrapped, true);
  assert.equal(wrapped.tools[0], authored);
  assert.notStrictEqual(wrapped.tools[1], mcp);
  assert.equal(arcjetProtectedTool in wrapped.tools[1]!, true);

  await wrapped.tools[0]!.func!({}, { configurable: { thread_id: "t" } });
  await wrapped.tools[1]!.func!({}, { configurable: { thread_id: "t" } });
  assert.equal(guardCalls.length, 2);
  assert.equal(recorded(guardCalls[0])["label"], "order.looked-up");
  assert.equal(recorded(guardCalls[1])["label"], "mcp_search.invoked");
});

test("authored guardTool + ToolNode wrap is one guard call, not two", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const authored = guardTool(client, createTool("authored"), { action: "order.looked-up" });
  const wrapped = guardToolNode(client, createNode([authored]), {
    action: "node.invoked",
  });

  await wrapped.invoke({ orderNumber: "A-1" }, { configurable: { thread_id: "t" } });
  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["label"], "order.looked-up");
});

test("unwrapped tool through ToolNode is denied and does not execute", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const mcp = createTool("mcp_search", async () => {
    calls += 1;
    return { ok: true };
  });
  const wrapped = guardToolNode(client, createNode([mcp]), { action: "mcp.invoked" });
  const result = asDenial<LangGraphToolResult>(
    ((await wrapped.invoke({}, { configurable: { thread_id: "t" } })) as { messages: unknown[] })
      .messages[0],
  );
  assert.equal(calls, 0);
  assert.equal(result.status, "error");
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("throws when wrapping a ToolNode that is already guarded", () => {
  const { client } = stubClient(decisionAllow());
  const wrapped = guardToolNode(client, createNode([createTool("a")]));
  assert.throws(() => guardToolNode(client, wrapped), /already guarded/);
});

test("skips branded tools in a tools array (no second wrap)", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const authored = guardTool(client, createTool("authored"), { action: "order.looked-up" });
  const [again] = guardToolNode(client, [authored], { action: "node.invoked" });
  assert.equal(again, authored);
  await again!.func!({}, { configurable: { thread_id: "t" } });
  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["label"], "order.looked-up");
});

test("invoke re-wraps tools added after the initial wrap", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const node = createNode([]);
  const wrapped = guardToolNode(client, node, { action: "late.invoked" });
  wrapped.tools.push(
    createTool("late", async () => {
      calls += 1;
      return { ok: true };
    }),
  );
  const result = asDenial<LangGraphToolResult>(
    ((await wrapped.invoke({}, { configurable: { thread_id: "t" } })) as { messages: unknown[] })
      .messages[0],
  );
  assert.equal(calls, 0);
  assert.equal(result.status, "error");
  assert.equal(arcjetProtectedTool in wrapped.tools[0]!, true);
});

test("node policy rules receive the tool name and free-text args", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mcp = createTool("mcp_search", async () => ({ ok: true }));
  const wrapped = guardToolNode(client, [mcp], {
    action: ({ toolName }) => `${toolName}.invoked`,
    rules: (call) => {
      assert.equal(call.toolName, "mcp_search");
      assert.equal((call.input as { q: string }).q, "free text");
      return [fakeRule];
    },
  });
  await wrapped[0]!.func!({ q: "free text" }, { configurable: { thread_id: "t" } });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("node-level fail-closed does not execute an unwrapped tool", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const mcp = createTool("mcp_search", async () => {
    calls += 1;
    return { ok: true };
  });
  const wrapped = guardToolNode(client, [mcp], { action: "mcp.invoked" });
  const result = asDenial<LangGraphToolResult>(
    await wrapped[0]!.func!({}, { configurable: { thread_id: "t" } }),
  );
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("throws when the argument is neither a ToolNode nor a tools array", () => {
  const { client } = stubClient(decisionAllow());
  assert.throws(
    () => guardToolNode(client, { name: "not-a-node" } as never),
    /ToolNode or an array/,
  );
});
