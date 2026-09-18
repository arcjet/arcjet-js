// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type, eslint/require-await, eslint/strict-boolean-expressions, typescript/strict-boolean-expressions, unicorn/no-object-as-default-parameter -- test infrastructure and mocks
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
import type { ArcjetDenialResult } from "../../agents/denial.ts";
import { policyInput } from "../../policy-input.ts";
import { guardHooks } from "./hooks.ts";
import type { CloudflareThinkGuardHooks } from "./hooks.ts";

function toolCtx(name: string, input: unknown = {}) {
  return {
    toolName: name,
    toolCallId: "call-auto",
    input,
    messages: [],
    abortSignal: undefined,
    stepNumber: 0,
  };
}

async function runHook(hooks: CloudflareThinkGuardHooks, ctx: unknown) {
  const hook = hooks.beforeToolCall;
  assert.ok(hook, "guardHooks must install beforeToolCall");
  return hook(ctx as never);
}

test("returns a beforeToolCall object (not a raw function)", () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  assert.equal(typeof hooks, "object");
  assert.equal(typeof hooks.beforeToolCall, "function");
  assert.equal("afterToolCall" in hooks, false);
  assert.equal("needsApproval" in hooks, false);
});

test("ALLOW → void decision so the tool can run", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup"));
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 1);
});

test("substitute-deny: DENY → { action: substitute, output: ArcjetDenialResult }", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup", { note: "x" }));
  assert.ok(result && typeof result === "object" && "action" in result);
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  const denial = asDenial<ArcjetDenialResult>(decision.output);
  assert.equal(denial.arcjetDenied, true);
  assert.equal(denial.reason, "PROMPT_INJECTION");
});

test("block-deny: onDeny block → { action: block, reason }", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const hooks = guardHooks(client, { action: "tool.invoked", onDeny: "block" });
  const result = await runHook(hooks, toolCtx("lookup", { note: "x" }));
  assert.ok(result && typeof result === "object" && "action" in result);
  const decision = result as { action: string; reason?: string };
  assert.equal(decision.action, "block");
  assert.equal(typeof decision.reason, "string");
  assert.match(String(decision.reason), /PROMPT_INJECTION/);
});

test("rules see ctx.input, not the opaque toolCallId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let scanned: unknown;
  const hooks = guardHooks(client, {
    action: "note.read",
    rules: ({ input, toolName }) => {
      scanned = { input, toolName };
      return [fakeRule];
    },
  });
  await runHook(hooks, toolCtx("lookup", { note: "hello" }));
  assert.deepEqual(scanned, { input: { note: "hello" }, toolName: "lookup" });
  assert.deepEqual(recorded(guardCalls[0])["rules"], [fakeRule]);
});

test("policy.sessionId is used because the tool-call envelope has none", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    sessionId: "policy-sess",
  });
  await runHook(hooks, toolCtx("lookup"));
  assert.equal(recorded(guardCalls[0])["correlationId"], "policy-sess");
});

test("never-mint: does not mint a correlation id when nothing is present", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, toolCtx("lookup"));
  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("never-mint: does not use auto-generated toolCallId / requestId", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, {
    ...toolCtx("lookup"),
    requestId: "req-auto",
    traceId: "trace-auto",
  });
  const call = recorded(guardCalls[0]);
  assert.equal("correlationId" in call, false);
  assert.notEqual(call["correlationId"], "call-auto");
  assert.notEqual(call["correlationId"], "req-auto");
  assert.notEqual(call["correlationId"], "trace-auto");
});

test("fail-closed unavailable → substitute with ERROR payload", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("onGuardError allow → void so the tool still runs on fail-open", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { action: "tool.invoked", onGuardError: "allow" });
  const result = await runHook(hooks, toolCtx("lookup"));
  assert.equal(result, undefined);
});

test("policy factory throw fail-closes and does not throw from the hook", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("onDeny block does not block unavailable: fail-open stays substitute", async () => {
  const { client } = stubClient(decisionFailOpenAllow());
  const hooks = guardHooks(client, { action: "tool.invoked", onDeny: "block" });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("onDeny block does not block unavailable: policy factory throw stays substitute", async () => {
  const { client } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    onDeny: "block",
    rules: () => {
      throw new Error("rules exploded");
    },
  });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("onDeny block does not block unavailable: thrown guard() stays substitute", async () => {
  const { client } = stubClient(new Error("transport down"));
  const hooks = guardHooks(client, { action: "tool.invoked", onDeny: "block" });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("no-throw: a throwing guard() becomes a substitute denial, not a thrown error", async () => {
  const { client } = stubClient(new Error("transport down"));
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, toolCtx("lookup"));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
});

test("inbound guard() before the turn is a separate call; hooks still gate tools", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const inbound = await client.guard({
    label: "message.received",
    rules: [],
  });
  assert.equal(inbound.hasFailedOpen(), false);

  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, toolCtx("lookup"));
  assert.equal(guardCalls.length, 2);
  assert.equal(recorded(guardCalls[0])["label"], "message.received");
  assert.equal(recorded(guardCalls[1])["label"], "tool.invoked");
});

test("a non-tool-call hook context is passed through without a guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  const result = await runHook(hooks, { text: "not a tool" });
  assert.equal(result, undefined);
  assert.equal(guardCalls.length, 0);
});

test("action callback names the guard call from the tool name", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: ({ toolName }) => `${toolName}.invoked`,
  });
  await runHook(hooks, toolCtx("mcp_search"));
  assert.equal(recorded(guardCalls[0])["label"], "mcp_search.invoked");
});

test("defaults the guard label to tool.invoked", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client);
  await runHook(hooks, toolCtx("mcp_search"));
  assert.equal(recorded(guardCalls[0])["label"], "tool.invoked");
});

test("sessionId callback receives the tool name and input", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  let seen: unknown;
  const hooks = guardHooks(client, {
    sessionId: (call) => {
      seen = call;
      return "sess-from-callback";
    },
  });
  await runHook(hooks, toolCtx("mcp_search", { q: "hello" }));
  assert.deepEqual(seen, { toolName: "mcp_search", input: { q: "hello" } });
  assert.equal(recorded(guardCalls[0])["correlationId"], "sess-from-callback");
});

test("omitting actor and inputs does not send them on the guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, toolCtx("lookup", { id: "one" }));
  const call = recorded(guardCalls[0]);
  assert.equal("actor" in call, false);
  assert.equal("inputs" in call, false);
});

test("resolves actor and typed inputs onto the guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    actor: "user-1",
    inputs: (call) => ({
      id: policyInput.server.string(String((call.input as { id?: string }).id)),
    }),
  });
  await runHook(hooks, toolCtx("lookup", { id: "one" }));
  assert.equal(recorded(guardCalls[0]).actor, "user-1");
  assert.deepEqual(recorded(guardCalls[0]).inputs, {
    id: policyInput.server.string("one"),
  });
});

test("an actor resolver can read the Think tool-call context", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    actor: (_call, ctx) => ctx.toolName,
  });
  await runHook(hooks, toolCtx("lookup", { id: "one" }));
  assert.equal(recorded(guardCalls[0]).actor, "lookup");
});

test("an input resolver failure follows the fail-closed unavailable path", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    inputs: () => {
      throw new Error("mapping failed");
    },
  });
  const result = await runHook(hooks, toolCtx("lookup", { id: "one" }));
  const decision = result as { action: string; output: unknown };
  assert.equal(decision.action, "substitute");
  assert.equal(asDenial<ArcjetDenialResult>(decision.output).reason, "ERROR");
  assert.equal(guardCalls.length, 0);
});

test("preserves an explicit null tool input for policy callbacks", async () => {
  const { client } = stubClient(decisionAllow());
  let seen: unknown;
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    rules: ({ input }) => {
      seen = input;
      return [fakeRule];
    },
  });
  await runHook(hooks, toolCtx("lookup", null));
  assert.equal(seen, null);
});

test("normalizes a missing tool input to an empty object", async () => {
  const { client } = stubClient(decisionAllow());
  let seen: unknown;
  const hooks = guardHooks(client, {
    action: "tool.invoked",
    rules: ({ input }) => {
      seen = input;
      return [fakeRule];
    },
  });
  const ctx = toolCtx("lookup");
  delete (ctx as { input?: unknown }).input;
  await runHook(hooks, ctx);
  assert.deepEqual(seen, {});
});

test("writes a printable tool name onto cloudflare-think.tool", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, toolCtx("lookup"));
  assert.equal(recorded(recorded(guardCalls[0])["metadata"])["cloudflare-think.tool"], "lookup");
});

test("omits a non-printable tool name from metadata", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, toolCtx("bad\nname"));
  assert.equal("cloudflare-think.tool" in recorded(recorded(guardCalls[0])["metadata"]), false);
});

test("does not mine a sessionId sitting on the Think tool-call envelope", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const hooks = guardHooks(client, { action: "tool.invoked" });
  await runHook(hooks, { ...toolCtx("lookup"), sessionId: "envelope-sess" });
  const call = recorded(guardCalls[0]);
  assert.equal("correlationId" in call, false);
  assert.equal("cloudflare-think.session" in recorded(call["metadata"]), false);
});
