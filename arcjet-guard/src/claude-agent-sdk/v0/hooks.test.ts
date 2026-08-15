// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookCallback, HookInput } from "@anthropic-ai/claude-agent-sdk";

import { recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { guardHooks } from "./hooks.ts";

function preToolInput(input?: unknown): HookInput {
  return {
    hook_event_name: "PreToolUse",
    session_id: "session-hooks",
    transcript_path: "/tmp/t.jsonl",
    cwd: "/tmp",
    tool_name: "Bash",
    tool_input: input === undefined ? { command: "ls" } : input,
    tool_use_id: "tu-1",
  };
}

function userPromptInput(prompt = "hello"): HookInput {
  return {
    hook_event_name: "UserPromptSubmit",
    session_id: "session-hooks",
    transcript_path: "/tmp/t.jsonl",
    cwd: "/tmp",
    prompt,
  };
}

function postToolInput(): HookInput {
  return {
    hook_event_name: "PostToolUse",
    session_id: "session-hooks",
    transcript_path: "/tmp/t.jsonl",
    cwd: "/tmp",
    tool_name: "Bash",
    tool_input: { command: "ls" },
    tool_response: { ok: true },
    tool_use_id: "tu-1",
  };
}

function runHook(
  matchers: { hooks: HookCallback[] }[] | undefined,
  input: HookInput,
): Promise<unknown> {
  assert.ok(matchers !== undefined);
  assert.equal(matchers.length, 1);
  const hook = matchers[0]?.hooks[0];
  assert.equal(typeof hook, "function");
  return hook(input, "tu-1", { signal: new AbortController().signal });
}

test("PreToolUse ALLOW returns an empty object so the tool proceeds", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  const result = await runHook(hooks.PreToolUse, preToolInput());

  assert.deepEqual(result, {});
  assert.equal(recorded(guardCalls[0])["correlationId"], "session-hooks");
  assert.equal(
    (recorded(captureCalls[0])["metadata"] as Record<string, unknown>)["outcome"],
    "allowed",
  );
});

test("PreToolUse DENY returns permissionDecision deny", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  const result = (await runHook(hooks.PreToolUse, preToolInput())) as {
    hookSpecificOutput?: { permissionDecision?: string; permissionDecisionReason?: string };
  };

  assert.equal(result.hookSpecificOutput?.permissionDecision, "deny");
  assert.match(String(result.hookSpecificOutput?.permissionDecisionReason), /PROMPT_INJECTION/);
});

test("PreToolUse fail-closed unavailable returns permissionDecision deny", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client);
  const result = (await runHook(hooks.PreToolUse, preToolInput())) as {
    hookSpecificOutput?: { permissionDecision?: string };
  };

  assert.equal(result.hookSpecificOutput?.permissionDecision, "deny");
});

test("UserPromptSubmit ALLOW returns an empty object", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    inbound: { action: "message.received" },
  });
  const result = await runHook(hooks.UserPromptSubmit, userPromptInput("hi"));

  assert.deepEqual(result, {});
  assert.equal(recorded(guardCalls[0])["label"], "message.received");
  assert.equal(recorded(guardCalls[0])["correlationId"], "session-hooks");
});

test("UserPromptSubmit DENY returns decision block", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, {
    inbound: { rules: ({ prompt }) => (prompt.length > 0 ? [fakeRule] : []) },
  });
  const result = (await runHook(hooks.UserPromptSubmit, userPromptInput("inject"))) as {
    decision?: string;
    reason?: string;
  };

  assert.equal(result.decision, "block");
  assert.match(String(result.reason), /PROMPT_INJECTION/);
});

test("UserPromptSubmit fail-closed unavailable returns decision block", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client);
  const result = (await runHook(hooks.UserPromptSubmit, userPromptInput())) as {
    decision?: string;
  };

  assert.equal(result.decision, "block");
});

test("inbound rules callback receives the prompt", async () => {
  const { client } = stubClient(decisionAllow());
  let seen = "";
  const hooks = guardHooks(client, {
    inbound: {
      rules: ({ prompt }) => {
        seen = prompt;
        return [fakeRule];
      },
    },
  });
  await runHook(hooks.UserPromptSubmit, userPromptInput("screen me"));
  assert.equal(seen, "screen me");
});

test("rules callback receives the tool name and input", async () => {
  const { client } = stubClient(decisionAllow());
  let seenName = "";
  const hooks = guardHooks(client, {
    rules: ({ toolName, input }) => {
      seenName = toolName;
      assert.deepEqual(input, { command: "rm" });
      return [fakeRule];
    },
  });
  await runHook(hooks.PreToolUse, preToolInput({ command: "rm" }));
  assert.equal(seenName, "Bash");
});

test("PostToolUse captures success and never throws", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "mcp.invoked" });
  const result = await runHook(hooks.PostToolUse, postToolInput());

  assert.deepEqual(result, {});
  assert.equal(captureCalls.length, 1);
  const metadata = recorded(captureCalls[0])["metadata"] as Record<string, unknown>;
  assert.equal(metadata["outcome"], "success");
  assert.equal(metadata["claude.phase"], "after");
  assert.equal(metadata["claude.tool"], "Bash");
});

test("default tool action is tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await runHook(hooks.PreToolUse, preToolInput());
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("action callback is used when provided", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await runHook(hooks.PreToolUse, preToolInput());
  assert.equal(recorded(guardCalls[0])["label"], "Bash.invoked");
});

test("empty action string falls back to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "" });
  await runHook(hooks.PreToolUse, preToolInput());
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("onGuardError allow lets PreToolUse proceed on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { onGuardError: "allow" });
  const result = await runHook(hooks.PreToolUse, preToolInput());
  assert.deepEqual(result, {});
});

test("inbound onGuardError allow lets UserPromptSubmit proceed on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { inbound: { onGuardError: "allow" } });
  const result = await runHook(hooks.UserPromptSubmit, userPromptInput());
  assert.deepEqual(result, {});
});

test("rules throw still denies PreToolUse (fail closed)", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client } = stubClient(decisionAllow());
    const hooks = guardHooks(client, {
      rules: () => {
        throw new Error("rules exploded");
      },
    });
    const result = (await runHook(hooks.PreToolUse, preToolInput())) as {
      hookSpecificOutput?: { permissionDecision?: string };
    };
    assert.equal(result.hookSpecificOutput?.permissionDecision, "deny");
    assert.ok(warnings.length > 0);
    assert.match(String(warnings[0]?.[0]), /PreToolUse threw/);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});

test("rules throw with onGuardError allow proceeds", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    onGuardError: "allow",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(hooks.PreToolUse, preToolInput());
  assert.deepEqual(result, {});
});

test("empty toolName is omitted from metadata", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await runHook(hooks.PreToolUse, { ...preToolInput(), tool_name: "" } as HookInput);
  assert.equal("claude.tool" in recorded(recorded(guardCalls[0])["metadata"]), false);
});

test("policy.sessionId is used when hook input has no session_id", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { sessionId: "options-session" });
  await runHook(hooks.PreToolUse, { ...preToolInput(), session_id: "" });
  assert.equal(recorded(guardCalls[0])["correlationId"], "options-session");
});

test("does not mint a correlation id when neither hook nor options provide one", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await runHook(hooks.PreToolUse, { ...preToolInput(), session_id: "" });
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("subagent agent_id is metadata only", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await runHook(hooks.PreToolUse, { ...preToolInput(), agent_id: "sub-1" });
  assert.equal(recorded(guardCalls[0])["correlationId"], "session-hooks");
  assert.equal(recorded(recorded(guardCalls[0])["metadata"])["claude.agent"], "sub-1");
});

test("metadata callback is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    metadata: ({ toolName }) => ({ "app.tool": toolName }),
  });
  await runHook(hooks.PreToolUse, preToolInput());
  assert.equal(recorded(recorded(guardCalls[0])["metadata"])["app.tool"], "Bash");
});

test("static metadata is merged", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { metadata: { "app.static": "yes" } });
  await runHook(hooks.PreToolUse, preToolInput());
  assert.equal(recorded(recorded(guardCalls[0])["metadata"])["app.static"], "yes");
});

test("PostToolUse never throws when capture or metadata throws", async () => {
  const { client } = stubClient(decisionAllow());
  client.capture = () => {
    throw new Error("capture failed");
  };
  const hooks = guardHooks(client, {
    metadata: () => {
      throw new Error("metadata exploded");
    },
  });
  const result = await runHook(hooks.PostToolUse, postToolInput());
  assert.deepEqual(result, {});
});

test("registers PreToolUse, UserPromptSubmit, and PostToolUse only", () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  const names = Object.keys(hooks);
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  names.sort();
  assert.deepEqual(names, ["PostToolUse", "PreToolUse", "UserPromptSubmit"]);
});

test("default inbound action is message.received", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await runHook(hooks.UserPromptSubmit, userPromptInput());
  assert.equal(recorded(guardCalls[0])["label"], "message.received");
});
