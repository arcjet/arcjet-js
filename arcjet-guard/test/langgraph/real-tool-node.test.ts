// oxlint-disable typescript/explicit-function-return-type, typescript/no-unsafe-assignment, typescript/no-unnecessary-type-assertion, typescript/unbound-method -- test fixtures built from the real SDK types
/**
 * Behaviour against the real `@langchain/langgraph` and `@langchain/core`
 * classes, rather than hand-written fakes.
 *
 * Every assertion here corresponds to a bypass the fakes in
 * `src/langgraph/v1/*.test.ts` could not see:
 *
 * - `ToolNode` resolves its tools through a closure captured in the
 *   constructor (`func: (input, config) => this.run(input, config)`), so a
 *   fake node written with `function` + `this.tools` reported success while
 *   the real class ran the unguarded tools.
 * - `ToolNode.run` fans parallel tool calls out through `Promise.all`, which
 *   a fake invoking one tool at a time never exercises.
 * - `ToolNode` decides whether to pass a tool result through with
 *   `isBaseMessage`, so what the model finally reads is only observable with
 *   the real class.
 *
 * This file value-imports the optional peers, so it lives outside
 * `src/langgraph/` — that directory is globbed by the langgraph-absent CI job
 * and scanned for type-only imports.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { AIMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

import { guardToolNode } from "../../src/langgraph/v1/guard-tool-node.ts";
import { guardTool } from "../../src/langgraph/v1/guard-tool.ts";
import { decisionAllow, decisionDenyPromptInjection, stubClient } from "../_shared/stub-client.ts";

interface ToolRun {
  calls: number;
}

function countingTool(name: string, run: ToolRun) {
  return tool(
    ({ note }: { note: string }) => {
      run.calls += 1;
      return `ran:${note}`;
    },
    {
      name,
      description: "real dependency test tool",
      schema: z.object({ note: z.string() }),
    },
  );
}

function callMessage(name: string, notes: readonly string[]): AIMessage {
  return new AIMessage({
    content: "",
    tool_calls: notes.map((note, index) => ({
      name,
      args: { note },
      id: `call-${index}`,
      type: "tool_call" as const,
    })),
  });
}

interface ToolMessageLike {
  status?: string;
  content?: unknown;
  tool_call_id?: string;
}

async function runNode(node: ToolNode, message: AIMessage): Promise<ToolMessageLike[]> {
  const output = await node.invoke({ messages: [message] });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- ToolNode returns { messages: ToolMessage[] } for a messages-shaped input
  const { messages } = output as { messages: ToolMessageLike[] };
  return messages;
}

function denialFrom(message: ToolMessageLike): Record<string, unknown> {
  // ToolNode JSON-stringifies a non-message tool result into the ToolMessage
  // content, which is how the model reads an Arcjet denial.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- parsed from the content this namespace produced
  return JSON.parse(String(message.content)) as Record<string, unknown>;
}

test("guardTool: DENY through a real ToolNode does not execute the tool", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const run: ToolRun = { calls: 0 };
  const guarded = guardTool(client, countingTool("lookup", run), {
    action: "order.looked-up",
  });
  const node = new ToolNode([guarded]);

  const messages = await runNode(node, callMessage("lookup", ["hello"]));

  assert.equal(run.calls, 0, "the tool must not run on DENY");
  assert.equal(guardCalls.length, 1);
  const denial = denialFrom(messages[0]!);
  assert.equal(denial["arcjetDenied"], true);
  assert.equal(denial["reason"], "PROMPT_INJECTION");
  assert.equal(messages[0]?.tool_call_id, "call-0");
});

test("guardTool: ALLOW through a real ToolNode executes and returns the tool output", async () => {
  const { client } = stubClient(decisionAllow());
  const run: ToolRun = { calls: 0 };
  const guarded = guardTool(client, countingTool("lookup", run), {
    action: "order.looked-up",
  });
  const node = new ToolNode([guarded]);

  const messages = await runNode(node, callMessage("lookup", ["hello"]));

  assert.equal(run.calls, 1);
  assert.equal(messages[0]?.content, "ran:hello");
  assert.equal(messages[0]?.status, "success");
});

test("guardTool: rules see the model args, not the ToolCall envelope", async () => {
  const { client } = stubClient(decisionAllow());
  const run: ToolRun = { calls: 0 };
  const seen: unknown[] = [];
  const guarded = guardTool(client, countingTool("lookup", run), {
    action: "order.looked-up",
    rules: (input) => {
      seen.push(input);
      return [];
    },
  });

  await runNode(new ToolNode([guarded]), callMessage("lookup", ["free text"]));

  assert.deepEqual(seen, [{ note: "free text" }]);
});

test("guardTool: parallel calls to the same tool each evaluate the guard", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const run: ToolRun = { calls: 0 };
  const guarded = guardTool(client, countingTool("lookup", run), {
    action: "order.looked-up",
  });
  const node = new ToolNode([guarded]);

  // ToolNode runs these through Promise.all. A shared re-entry flag used to
  // let the second call skip the guard and execute on a DENY.
  const messages = await runNode(node, callMessage("lookup", ["a", "b"]));

  assert.equal(guardCalls.length, 2, "every tool call must reach the guard");
  assert.equal(run.calls, 0, "no call may execute on DENY");
  assert.equal(messages.length, 2);
  for (const message of messages) {
    assert.equal(denialFrom(message)["arcjetDenied"], true);
  }
});

test("guardToolNode: guards a real ToolNode's unwrapped tools in place", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const run: ToolRun = { calls: 0 };
  const node = new ToolNode([countingTool("mcp_search", run)]);

  const guardedNode = guardToolNode(client, node, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });

  // Same node: ToolNode's captured closure reads the array it was built with,
  // so guarding a copy would leave the original tools running unguarded.
  assert.equal(guardedNode, node);

  const messages = await runNode(guardedNode, callMessage("mcp_search", ["hello"]));

  assert.equal(run.calls, 0, "an unwrapped tool must not run on DENY");
  assert.equal(guardCalls.length, 1);
  assert.equal(denialFrom(messages[0]!)["reason"], "PROMPT_INJECTION");
});

test("guardToolNode: the original node reference cannot bypass Guard", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const run: ToolRun = { calls: 0 };
  const node = new ToolNode([countingTool("mcp_search", run)]);

  guardToolNode(client, node, { action: "mcp.invoked" });

  // Deliberately invoke the pre-wrap reference a caller still holds.
  await runNode(node, callMessage("mcp_search", ["hello"]));

  assert.equal(run.calls, 0);
  assert.equal(guardCalls.length, 1);
});

test("guardToolNode: tools discovered after wrapping are guarded on the next invoke", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const run: ToolRun = { calls: 0 };
  const node = new ToolNode([]);
  const guardedNode = guardToolNode(client, node, { action: "late.invoked" });

  guardedNode.tools.push(countingTool("late", run));
  const messages = await runNode(guardedNode, callMessage("late", ["hello"]));

  assert.equal(run.calls, 0);
  assert.equal(guardCalls.length, 1);
  assert.equal(denialFrom(messages[0]!)["arcjetDenied"], true);
});

test("guardToolNode: an authored guardTool tool is not guarded twice", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const run: ToolRun = { calls: 0 };
  const authored = guardTool(client, countingTool("authored", run), {
    action: "order.looked-up",
  });
  const guardedNode = guardToolNode(client, new ToolNode([authored]), {
    action: "node.invoked",
  });

  await runNode(guardedNode, callMessage("authored", ["hello"]));

  assert.equal(run.calls, 1);
  assert.equal(guardCalls.length, 1, "the tool must not be guarded by both helpers");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- stub records the guard options
  const first = guardCalls[0] as { label?: string };
  assert.equal(first.label, "order.looked-up");
});

test("guardToolNode: ALLOW still executes every tool through the real node", async () => {
  const { client } = stubClient(decisionAllow());
  const run: ToolRun = { calls: 0 };
  const guardedNode = guardToolNode(client, new ToolNode([countingTool("mcp_search", run)]), {
    action: "mcp.invoked",
  });

  const messages = await runNode(guardedNode, callMessage("mcp_search", ["hello"]));

  assert.equal(run.calls, 1);
  assert.equal(messages[0]?.content, "ran:hello");
});

test("guardToolNode: refuses a frozen tools array rather than silently ungating", () => {
  const { client } = stubClient(decisionAllow());
  const run: ToolRun = { calls: 0 };
  const node = new ToolNode([countingTool("mcp_search", run)]);
  Object.freeze(node.tools);

  assert.throws(() => guardToolNode(client, node, { action: "mcp.invoked" }), /frozen tools array/);
});

test("correlation comes from the graph thread id and is never minted", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const run: ToolRun = { calls: 0 };
  const guarded = guardTool(client, countingTool("lookup", run), {
    action: "order.looked-up",
  });
  const node = new ToolNode([guarded]);

  await node.invoke(
    { messages: [callMessage("lookup", ["hello"])] },
    {
      configurable: { thread_id: "thread-real" },
    },
  );
  await runNode(node, callMessage("lookup", ["hello"]));

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- stub records the guard options
  const [withThread, withoutThread] = guardCalls as Array<{ correlationId?: string }>;
  assert.equal(withThread?.correlationId, "thread-real");
  assert.ok(
    withoutThread !== undefined && !("correlationId" in withoutThread),
    "no thread id must leave the call uncorrelated rather than minting one",
  );
});
