// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type, eslint/require-await -- test infrastructure and mocks
import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookCallback, HookInput } from "@anthropic-ai/claude-agent-sdk";

import { recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { Decision, RuleWithInput } from "../../types.ts";
import type { ClaudeCallToolResult } from "./denial.ts";
import type { ClaudeToolDefinition, GuardToolResult } from "./guard-tool.ts";
import { guardTool } from "./guard-tool.ts";
import type { GuardHooksToolResult } from "./hooks.ts";
import { guardHooks } from "./hooks.ts";

/** A client that returns `decisions` in order, one per guard call. */
function sequencedClient(...decisions: Decision[]) {
  const guardCalls: unknown[] = [];
  const captureCalls: unknown[] = [];
  const client: ArcjetAgentClient = {
    guard(opts: unknown): Promise<Decision> {
      const decision = decisions[guardCalls.length];
      guardCalls.push(opts);
      assert.ok(decision !== undefined, "more guard calls than decisions");
      return Promise.resolve(decision);
    },
    capture(opts: unknown): void {
      captureCalls.push(opts);
    },
  };
  return { client, guardCalls, captureCalls };
}

function metadataOf(call: unknown): Record<string, unknown> {
  return recorded(call)["metadata"] as Record<string, unknown>;
}

function fetchTool(calls: unknown[]): ClaudeToolDefinition<{ url: string }> {
  return {
    name: "fetch",
    description: "Fetch a page",
    inputSchema: {},
    handler: async (input: { url: string }): Promise<ClaudeCallToolResult> => {
      calls.push(input);
      return { content: [{ type: "text", text: `page body for ${input.url}` }] };
    },
  };
}

function screenText(seen?: GuardToolResult<{ url: string }>[]) {
  return (result: GuardToolResult<{ url: string }>): RuleWithInput[] => {
    seen?.push(result);
    return [fakeRule];
  };
}

test("guardTool resultRules: a DENY replaces the result after the handler ran", async () => {
  const calls: unknown[] = [];
  const { client, guardCalls, captureCalls } = sequencedClient(
    decisionAllow(),
    decisionDenyPromptInjection(),
  );
  const tool = guardTool(client, fetchTool(calls), {
    action: "page.fetched",
    resultRules: screenText(),
  });
  const result = (await tool.handler({ url: "https://example.com" }, {})) as ClaudeCallToolResult;

  assert.equal(calls.length, 1);
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent?.["arcjetDenied"], true);
  assert.deepEqual(
    guardCalls.map((call) => recorded(call)["label"]),
    ["page.fetched", "page.fetched.result"],
  );
  assert.equal(metadataOf(guardCalls[1])["claude.phase"], "result");
  assert.equal(recorded(guardCalls[1])["inputs"], undefined);
  assert.equal(metadataOf(captureCalls.at(-1))["outcome"], "denied");
});

test("guardTool resultRules: rules receive the input, the result and its text", async () => {
  const seen: GuardToolResult<{ url: string }>[] = [];
  const { client } = stubClient(decisionAllow());
  const tool = guardTool(client, fetchTool([]), {
    action: "page.fetched",
    resultRules: screenText(seen),
  });
  const result = await tool.handler({ url: "https://example.com" }, {});

  assert.deepEqual(result, {
    content: [{ type: "text", text: "page body for https://example.com" }],
  });
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0]?.input, { url: "https://example.com" });
  assert.equal(seen[0]?.result, result);
  assert.equal(seen[0]?.text, "page body for https://example.com");
});

test("guardTool resultRules: resultAction overrides the label", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = guardTool(client, fetchTool([]), {
    action: "page.fetched",
    resultRules: screenText(),
    resultAction: "page.screened",
  });
  await tool.handler({ url: "https://example.com" }, {});
  assert.deepEqual(
    guardCalls.map((call) => recorded(call)["label"]),
    ["page.fetched", "page.screened"],
  );
});

test("guardTool resultRules: no result check when the call is denied", async () => {
  const calls: unknown[] = [];
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const tool = guardTool(client, fetchTool(calls), {
    action: "page.fetched",
    resultRules: screenText(),
  });
  await tool.handler({ url: "https://example.com" }, {});
  assert.equal(calls.length, 0);
  assert.equal(guardCalls.length, 1);
});

test("guardTool resultRules: a rules callback that throws still calls Guard and fails closed", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const tool = guardTool(client, fetchTool([]), {
    action: "page.fetched",
    resultRules: () => {
      throw new Error("no rules");
    },
  });
  const result = (await tool.handler({ url: "https://example.com" }, {})) as ClaudeCallToolResult;
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent?.["reason"], "ERROR");
  assert.deepEqual(recorded(guardCalls[1])["rules"], []);
});

/** Allows the call, then rejects the result check. */
function resultCheckDownClient(): ArcjetAgentClient {
  let calls = 0;
  return {
    guard(): Promise<Decision> {
      calls += 1;
      return calls === 1 ? Promise.resolve(decisionAllow()) : Promise.reject(new Error("down"));
    },
    capture(): void {},
  };
}

test("guardTool resultRules: an unavailable screen fails closed by default and open on allow", async () => {
  const denied = (await guardTool(resultCheckDownClient(), fetchTool([]), {
    action: "page.fetched",
    resultRules: screenText(),
  }).handler({ url: "https://example.com" }, {})) as ClaudeCallToolResult;
  assert.equal(denied.isError, true);
  assert.equal(denied.structuredContent?.["reason"], "ERROR");

  const kept = await guardTool(resultCheckDownClient(), fetchTool([]), {
    action: "page.fetched",
    resultRules: screenText(),
    onGuardError: "allow",
  }).handler({ url: "https://example.com" }, {});
  assert.deepEqual(kept, {
    content: [{ type: "text", text: "page body for https://example.com" }],
  });
});

test("guardTool resultRules: configuration is checked when the tool is wrapped", () => {
  const { client } = stubClient(decisionAllow());
  assert.throws(
    () =>
      guardTool(client, fetchTool([]), {
        action: "page.fetched",
        resultRules: [fakeRule] as unknown as () => RuleWithInput[],
      }),
    TypeError,
  );
  assert.throws(
    () =>
      guardTool(client, fetchTool([]), { action: "page.fetched", resultAction: "page.screened" }),
    /resultAction/,
  );
  assert.throws(() =>
    guardTool(client, fetchTool([]), {
      action: "page.fetched",
      resultRules: screenText(),
      resultAction: "not a label!",
    }),
  );
});

function postToolInput(toolName: string, response: unknown): HookInput {
  return {
    hook_event_name: "PostToolUse",
    session_id: "session-results",
    transcript_path: "/tmp/t.jsonl",
    cwd: "/tmp",
    tool_name: toolName,
    tool_input: { command: "curl https://example.com" },
    tool_response: response,
    tool_use_id: "tu-1",
  };
}

const BASH_RESPONSE = { stdout: "page", stderr: "", interrupted: false };

function runPostToolUse(
  hooks: ReturnType<typeof guardHooks>,
  input: HookInput,
): Promise<Record<string, unknown>> {
  const hook: HookCallback | undefined = hooks.PostToolUse?.[0]?.hooks[0];
  assert.ok(hook !== undefined);
  return hook(input, "tu-1", { signal: new AbortController().signal }) as Promise<
    Record<string, unknown>
  >;
}

function screen(seen?: GuardHooksToolResult[]) {
  return (result: GuardHooksToolResult): RuleWithInput[] => {
    seen?.push(result);
    return [fakeRule];
  };
}

function replaced(output: Record<string, unknown>): unknown {
  const specific = output["hookSpecificOutput"] as Record<string, unknown> | undefined;
  assert.equal(specific?.["hookEventName"], "PostToolUse");
  return specific?.["updatedToolOutput"];
}

test("toolResults: ALLOW leaves the result and captures after then result", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { toolResults: { rules: screen() } });
  const output = await runPostToolUse(hooks, postToolInput("Bash", BASH_RESPONSE));

  assert.deepEqual(output, {});
  assert.equal(guardCalls.length, 1);
  assert.equal(recorded(guardCalls[0])["label"], "tool.result");
  assert.equal(recorded(guardCalls[0])["correlationId"], "session-results");
  assert.equal(metadataOf(guardCalls[0])["claude.phase"], "result");
  assert.deepEqual(
    captureCalls.map((call) => metadataOf(call)["claude.phase"]),
    ["after", "result"],
  );
  assert.equal(metadataOf(captureCalls[1])["claude.denial"], undefined);
});

test("toolResults: rules receive the call, its response and its text", async () => {
  const seen: GuardHooksToolResult[] = [];
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { toolResults: { rules: screen(seen) } });
  await runPostToolUse(hooks, postToolInput("Bash", BASH_RESPONSE));

  assert.equal(seen[0]?.toolName, "Bash");
  assert.deepEqual(seen[0]?.input, { command: "curl https://example.com" });
  assert.deepEqual(seen[0]?.response, BASH_RESPONSE);
  assert.equal(seen[0]?.text, "page");
});

test("toolResults: a Bash DENY replaces stdout", async () => {
  const { client, captureCalls } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { toolResults: { rules: screen() } });
  const output = await runPostToolUse(hooks, postToolInput("Bash", BASH_RESPONSE));

  const replacement = replaced(output) as { stdout: string; stderr: string; interrupted: boolean };
  assert.equal(replacement.stderr, "");
  assert.equal(replacement.interrupted, false);
  assert.equal((JSON.parse(replacement.stdout) as Record<string, unknown>)["arcjetDenied"], true);
  assert.equal(output["continue"], undefined);
  assert.equal(metadataOf(captureCalls.at(-1))["outcome"], "denied");
  assert.equal(metadataOf(captureCalls.at(-1))["claude.denial"], "replaced");
});

test("toolResults: Read and MCP DENYs are replaced in their shapes", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { toolResults: { rules: screen() } });

  const read = replaced(
    await runPostToolUse(
      hooks,
      postToolInput("Read", { type: "text", file: { filePath: "/r/a.md", content: "x" } }),
    ),
  ) as { file: { filePath: string; content: string } };
  assert.equal(read.file.filePath, "/r/a.md");
  assert.equal((JSON.parse(read.file.content) as Record<string, unknown>)["arcjetDenied"], true);

  const mcp = replaced(
    await runPostToolUse(
      hooks,
      postToolInput("mcp__docs__fetch", [{ type: "text", text: "page" }]),
    ),
  ) as { type: string; text: string }[];
  assert.equal(mcp.length, 1);
  assert.equal(mcp[0]?.type, "text");
  assert.equal((JSON.parse(mcp[0]?.text ?? "") as Record<string, unknown>)["arcjetDenied"], true);
});

test("toolResults: a DENY for a tool outside the table stops the run", async () => {
  const { client, captureCalls } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { toolResults: { rules: screen() } });
  const output = await runPostToolUse(hooks, postToolInput("WebSearch", { query: "q" }));

  assert.equal(output["continue"], false);
  assert.equal(typeof output["stopReason"], "string");
  assert.equal(output["hookSpecificOutput"], undefined);
  assert.equal(metadataOf(captureCalls.at(-1))["claude.denial"], "run_stopped");
});

test("toolResults: an unavailable screen keeps the result from the model by default", async () => {
  const { client, captureCalls } = stubClient(new Error("down"));
  const hooks = guardHooks(client, { toolResults: { rules: screen() } });
  const output = await runPostToolUse(hooks, postToolInput("Bash", BASH_RESPONSE));
  const replacement = replaced(output) as { stdout: string };
  assert.equal((JSON.parse(replacement.stdout) as Record<string, unknown>)["reason"], "ERROR");
  assert.equal(metadataOf(captureCalls.at(-1))["outcome"], "unavailable");
  assert.equal(metadataOf(captureCalls.at(-1))["claude.denial"], "replaced");

  const allowing = guardHooks(stubClient(new Error("down")).client, {
    toolResults: { rules: screen(), onGuardError: "allow" },
  });
  assert.deepEqual(await runPostToolUse(allowing, postToolInput("Bash", BASH_RESPONSE)), {});
});

test("toolResults: a rules callback that throws still calls Guard and fails closed", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    toolResults: {
      rules: () => {
        throw new Error("no rules");
      },
    },
  });
  const output = await runPostToolUse(hooks, postToolInput("Bash", BASH_RESPONSE));
  assert.ok(replaced(output) !== undefined);
  assert.deepEqual(recorded(guardCalls[0])["rules"], []);
});

test("toolResults: action string and callback", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  await runPostToolUse(
    guardHooks(client, { toolResults: { rules: screen(), action: "tool.screened" } }),
    postToolInput("Bash", BASH_RESPONSE),
  );
  await runPostToolUse(
    guardHooks(client, {
      toolResults: { rules: screen(), action: ({ toolName }) => `${toolName}.seen` },
    }),
    postToolInput("Bash", BASH_RESPONSE),
  );
  assert.deepEqual(
    guardCalls.map((call) => recorded(call)["label"]),
    ["tool.screened", "Bash.seen"],
  );
});

test("toolResults: without it PostToolUse only captures", async () => {
  const { client, guardCalls } = stubClient(decisionDenyPromptInjection());
  const output = await runPostToolUse(guardHooks(client), postToolInput("Bash", BASH_RESPONSE));
  assert.deepEqual(output, {});
  assert.equal(guardCalls.length, 0);
});

test("toolResults: configuration is checked when the hooks are built", () => {
  const { client } = stubClient(decisionAllow());
  assert.throws(
    () =>
      guardHooks(client, {
        toolResults: { rules: [fakeRule] as unknown as () => RuleWithInput[] },
      }),
    TypeError,
  );
  assert.throws(() =>
    guardHooks(client, { toolResults: { rules: screen(), action: "not a label!" } }),
  );
});
