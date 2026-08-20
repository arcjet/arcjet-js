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
import type { ArcjetDenialResult } from "../../agents/denial.ts";
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

/**
 * Stand-in for `ToolNode`. `invoke` reads `this.tools` through a closure
 * captured up front, exactly as the real class does
 * (`func: (input, config) => this.run(input, config)` in its constructor), so
 * this fake cannot report success where the real class would run unguarded
 * tools. `test/langgraph/real-tool-node.test.ts` asserts the same behaviour
 * against the real class.
 */
function createNode(tools: LangGraphTool[]): LangGraphToolNodeLike {
  const node: LangGraphToolNodeLike = {
    tools,
    invoke: async (input: unknown, config?: unknown) => {
      const results = [];
      for (const tool of node.tools) {
        results.push(await tool.invoke?.(input, config));
      }
      return { messages: results };
    },
  };
  return node;
}

function threadConfig(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

async function invokeNode(node: LangGraphToolNodeLike, input: unknown = {}): Promise<unknown[]> {
  const output = await node.invoke?.(input, threadConfig("t"));
  return (output as { messages: unknown[] }).messages;
}

test("wraps a tools array and brands each unwrapped tool", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const raw = createTool("lookup");
  const wrapped = guardToolNode(client, [raw], { action: "tool.invoked" });

  assert.equal(wrapped.length, 1);
  assert.notStrictEqual(wrapped[0], raw, "the array form returns guarded copies");
  assert.equal(arcjetProtectedTool in wrapped[0]!, true);
  assert.equal(arcjetProtectedTool in raw, false, "the input array is left alone");
  await wrapped[0]!.func!({}, threadConfig("t"));
  assert.equal(guardCalls.length, 1);
});

test("guards a node's tools in place and returns the same node", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const authored = guardTool(client, createTool("authored"), { action: "order.looked-up" });
  const mcp = createTool("mcp_search");
  const tools = [authored, mcp];
  const node = createNode(tools);

  const wrapped = guardToolNode(client, node, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });

  // The real ToolNode resolves tools through a closure captured at
  // construction, so the node and its array must be the ones we guarded.
  assert.strictEqual(wrapped, node);
  assert.strictEqual(wrapped.tools, tools);
  assert.equal(arcjetProtectedTool in wrapped, true);
  assert.strictEqual(wrapped.tools[0], authored, "an already-guarded tool is left as-is");
  assert.notStrictEqual(wrapped.tools[1], mcp);
  assert.equal(arcjetProtectedTool in wrapped.tools[1]!, true);

  await wrapped.tools[0]!.func!({}, threadConfig("t"));
  await wrapped.tools[1]!.func!({}, threadConfig("t"));
  assert.equal(guardCalls.length, 2);
  assert.equal(recorded(guardCalls[0])["label"], "order.looked-up");
  assert.equal(recorded(guardCalls[1])["label"], "mcp_search.invoked");
});

test("authored guardTool + node wrap is one guard call, not two", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const authored = guardTool(client, createTool("authored"), { action: "order.looked-up" });
  const wrapped = guardToolNode(client, createNode([authored]), {
    action: "node.invoked",
  });

  await invokeNode(wrapped, { orderNumber: "A-1" });
  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["label"], "order.looked-up");
});

test("unwrapped tool through the node is denied and does not execute", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const mcp = createTool("mcp_search", async () => {
    calls += 1;
    return { ok: true };
  });
  const wrapped = guardToolNode(client, createNode([mcp]), { action: "mcp.invoked" });
  const result = asDenial<ArcjetDenialResult>((await invokeNode(wrapped))[0]);

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
  assert.equal(result.reason, "PROMPT_INJECTION");
});

test("a pre-wrap reference to the node cannot bypass the guard", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  let calls = 0;
  const mcp = createTool("mcp_search", async () => {
    calls += 1;
    return { ok: true };
  });
  const node = createNode([mcp]);
  guardToolNode(client, node, { action: "mcp.invoked" });

  await invokeNode(node);

  assert.equal(calls, 0);
  assert.equal(guardCalls.length, 1);
});

test("throws when wrapping a node that is already guarded", () => {
  const { client } = stubClient(decisionAllow());
  const wrapped = guardToolNode(client, createNode([createTool("a")]));
  assert.throws(() => guardToolNode(client, wrapped), /already guarded/);
});

test("throws rather than silently ungating a frozen tools array", () => {
  const { client } = stubClient(decisionAllow());
  const node = createNode([createTool("a")]);
  Object.freeze(node.tools);
  assert.throws(() => guardToolNode(client, node), /frozen tools array/);
});

test("skips branded tools in a tools array (no second wrap)", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const authored = guardTool(client, createTool("authored"), { action: "order.looked-up" });
  const [again] = guardToolNode(client, [authored], { action: "node.invoked" });
  assert.equal(again, authored);
  await again!.func!({}, threadConfig("t"));
  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["label"], "order.looked-up");
});

test("invoke guards tools added after the initial wrap", async () => {
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
  const result = asDenial<ArcjetDenialResult>((await invokeNode(wrapped))[0]);

  assert.equal(calls, 0);
  assert.equal(result.arcjetDenied, true);
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
  await wrapped[0]!.func!({ q: "free text" }, threadConfig("t"));
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("node metadata policy is merged over the derived context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const mcp = createTool("mcp_search", async () => ({ ok: true }));
  const wrapped = guardToolNode(client, [mcp], {
    action: "mcp.invoked",
    metadata: ({ toolName }) => ({ "app.tool": toolName }),
  });
  await wrapped[0]!.func!({}, threadConfig("thread-node"));
  const metadata = recorded(recorded(guardCalls[0])["metadata"]);
  assert.equal(metadata["app.tool"], "mcp_search");
  assert.equal(metadata["langgraph.thread"], "thread-node");
});

test("node-level fail-closed does not execute an unwrapped tool", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const mcp = createTool("mcp_search", async () => {
    calls += 1;
    return { ok: true };
  });
  const wrapped = guardToolNode(client, [mcp], { action: "mcp.invoked" });
  const result = asDenial<ArcjetDenialResult>(await wrapped[0]!.func!({}, threadConfig("t")));
  assert.equal(calls, 0);
  assert.equal(result.reason, "ERROR");
});

test("node-level onGuardError allow still executes on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  let calls = 0;
  const mcp = createTool("mcp_search", async () => {
    calls += 1;
    return { ok: true };
  });
  const wrapped = guardToolNode(client, [mcp], {
    action: "mcp.invoked",
    onGuardError: "allow",
  });
  const result = await wrapped[0]!.func!({}, threadConfig("t"));
  assert.equal(calls, 1);
  assert.deepEqual(result, { ok: true });
});

test("node-level onDeny reshapes the denial", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const mcp = createTool("mcp_search", async () => ({ ok: true }));
  const wrapped = guardToolNode(client, [mcp], {
    action: "mcp.invoked",
    onDeny: (decision) => ({ blocked: decision.reason }),
  });
  const result = await wrapped[0]!.func!({}, threadConfig("t"));
  assert.deepEqual(result, { blocked: "PROMPT_INJECTION" });
});

test("throws when the argument is neither a node nor a tools array", () => {
  const { client } = stubClient(decisionAllow());
  assert.throws(
    () => guardToolNode(client, { name: "not-a-node" } as never),
    /ToolNode or an array/,
  );
});
