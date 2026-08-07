// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/no-unsafe-argument, eslint/no-unsafe-call, eslint/strict-boolean-expressions, eslint/explicit-function-return-type, eslint/no-unnecessary-type-assertion -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookDefinition } from "eve/hooks";

import type { CaptureOptions } from "../../types.ts";
import type { ArcjetAgentClient } from "../../agents/capture.ts";
import { arcjetHooks } from "./hooks.ts";

// Mock client that captures calls
function createMockClient(): ArcjetAgentClient & {
  captureCalls: Array<{ action: string; correlationId?: string; metadata?: Record<string, unknown> }>;
} {
  const captureCalls: Array<{ action: string; correlationId?: string; metadata?: Record<string, unknown> }> = [];

  return {
    captureCalls,
    guard(_opts) {
      // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-return -- test mock
      return Promise.resolve({ allowed: true } as any);
    },
    capture(opts: CaptureOptions) {
      // oxlint-disable-next-line typescript/no-unsafe-assignment -- test mock
      captureCalls.push({
        action: opts.action,
        correlationId: opts.correlationId,
        metadata: opts.metadata,
      } as any);
    },
  };
}

// Mock client that throws on capture
function createThrowingClient(): ArcjetAgentClient {
  return {
    guard(_opts) {
      // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-return -- test mock
      return Promise.resolve({ allowed: true } as any);
    },
    capture() {
      throw new Error("capture failed");
    },
  };
}

// AC6.1: returned object's own keys are exactly ["events"]
test("AC6.1: arcjetHooks returns object with only 'events' key", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  const keys = Object.keys(definition);
  assert.deepEqual(keys, ["events"], "arcjetHooks must return object with only 'events' key");
});

// AC6.1: every key of events is a member of HookEventMap
test("AC6.1: events map contains only valid HookEventMap keys", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  assert.ok(definition.events !== undefined, "events map must exist");

  // Valid event families from the phase file
  const validKeys = new Set([
    "session.started",
    "session.failed",
    "turn.started",
    "turn.completed",
    "turn.failed",
    "action.result",
    "subagent.called",
    "subagent.completed",
  ]);

  const eventKeys = Object.keys(definition.events);
  for (const key of eventKeys) {
    assert.ok(validKeys.has(key), `event key "${key}" must be a valid HookEventMap member`);
  }
});

// AC6.2: action.result with status "completed" → outcome "success"
test("AC6.2: action.result with status 'completed' captures outcome 'success'", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  assert.ok(definition.events?.["action.result"], "action.result handler must exist");

  // oxlint-disable-next-line typescript/no-non-null-assertion -- assertion above
  const handler = definition.events!["action.result"]!;
  const mockCtx = {
    session: { id: "ses_123" },
    agent: { name: "test-agent" },
    channel: {},
  };
  const mockEvent = {
    data: {
      status: "completed",
      turnId: "turn_123",
      sequence: 1,
      stepIndex: 0,
      result: { kind: "something" },
    },
  };

  await handler(mockEvent as any, mockCtx as any);

  assert.equal(client.captureCalls.length, 1, "one capture call expected");
  const capture = client.captureCalls[0];
  assert.equal(capture.action, "eve.action-result");
  assert.equal(capture.metadata?.["outcome"], "success");
  assert.equal(capture.metadata?.["eve.phase"], "result");
});

// AC6.2: action.result with status "failed" → outcome "error"
test("AC6.2: action.result with status 'failed' captures outcome 'error'", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  // oxlint-disable-next-line typescript/no-non-null-assertion -- assertion above
  const handler = definition.events!["action.result"]!;
  const mockCtx = {
    session: { id: "ses_123" },
    agent: { name: "test-agent" },
    channel: {},
  };
  const mockEvent = {
    data: {
      status: "failed",
      turnId: "turn_123",
      sequence: 1,
      stepIndex: 0,
      result: { kind: "something" },
      error: { code: "ERROR_CODE" },
    },
  };

  await handler(mockEvent as any, mockCtx as any);

  assert.equal(client.captureCalls.length, 1);
  const capture = client.captureCalls[0];
  assert.equal(capture.metadata?.["outcome"], "error");
  assert.equal(capture.metadata?.["error.code"], "ERROR_CODE");
});

// AC6.2: action.result with status "rejected" → outcome "denied"
test("AC6.2: action.result with status 'rejected' captures outcome 'denied'", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  // oxlint-disable-next-line typescript/no-non-null-assertion -- assertion above
  const handler = definition.events!["action.result"]!;
  const mockCtx = {
    session: { id: "ses_123" },
    agent: { name: "test-agent" },
    channel: {},
  };
  const mockEvent = {
    data: {
      status: "rejected",
      turnId: "turn_123",
      sequence: 1,
      stepIndex: 0,
      result: { kind: "something" },
    },
  };

  await handler(mockEvent as any, mockCtx as any);

  assert.equal(client.captureCalls.length, 1);
  const capture = client.captureCalls[0];
  assert.equal(capture.metadata?.["outcome"], "denied");
});

// AC6.2: action.result with unrecognised status → no outcome key
test("AC6.2: action.result with unrecognised status does not capture outcome key", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  // oxlint-disable-next-line typescript/no-non-null-assertion -- assertion above
  const handler = definition.events!["action.result"]!;
  const mockCtx = {
    session: { id: "ses_123" },
    agent: { name: "test-agent" },
    channel: {},
  };
  const mockEvent = {
    data: {
      status: "unknown-status",
      turnId: "turn_123",
      sequence: 1,
      stepIndex: 0,
      result: { kind: "something" },
    },
  };

  await handler(mockEvent as any, mockCtx as any);

  assert.equal(client.captureCalls.length, 1);
  const capture = client.captureCalls[0];
  assert.ok(!("outcome" in (capture.metadata ?? {})), "outcome key must not exist for unknown status");
});

// AC6.3: session.started with channel.continuationToken and channel.kind present
test("AC6.3: session.started captures continuation-token and channel when present", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  // oxlint-disable-next-line typescript/no-non-null-assertion -- assert below
  const handler = definition.events?.["session.started"];
  assert.ok(handler, "session.started handler must exist");

  const mockCtx = {
    session: { id: "ses_123" },
    agent: { name: "test-agent" },
    channel: { continuationToken: "token_456", kind: "thread" },
  };
  const mockEvent = { data: {} };

  await handler(mockEvent as any, mockCtx as any);

  assert.equal(client.captureCalls.length, 1);
  const capture = client.captureCalls[0];
  assert.equal(capture.metadata?.["eve.continuation-token"], "token_456");
  assert.equal(capture.metadata?.["eve.channel"], "thread");
  assert.equal(capture.metadata?.["eve.agent"], "test-agent");
});

// AC6.3: session.started without channel details still emits with session id
test("AC6.3: session.started captures session id even when channel is empty", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  // oxlint-disable-next-line typescript/no-non-null-assertion -- assert below
  const handler = definition.events?.["session.started"];
  assert.ok(handler, "session.started handler must exist");
  const mockCtx = {
    session: { id: "ses_123" },
    agent: { name: "test-agent" },
    channel: {},
  };
  const mockEvent = { data: {} };

  // oxlint-disable-next-line typescript/no-non-null-assertion -- asserted above
  await handler!(mockEvent as any, mockCtx as any);

  assert.equal(client.captureCalls.length, 1);
  const capture = client.captureCalls[0];
  assert.equal(capture.metadata?.["eve.session"], "ses_123");
  assert.ok(!("eve.continuation-token" in (capture.metadata ?? {})), "continuation-token should not be present");
  assert.ok(!("eve.channel" in (capture.metadata ?? {})), "channel should not be present");
});

// AC6.4: subagent.called captures child-session, subagent, and call
test("AC6.4: subagent.called captures eve.child-session, eve.subagent, and eve.call", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  // oxlint-disable-next-line typescript/no-non-null-assertion -- assert below
  const handler = definition.events?.["subagent.called"];
  assert.ok(handler, "subagent.called handler must exist");

  const mockCtx = {
    session: { id: "ses_123" },
    agent: { name: "test-agent" },
    channel: {},
  };
  const mockEvent = {
    data: {
      callId: "call_789",
      childSessionId: "ses_child_456",
      name: "researcher",
    },
  };

  await handler(mockEvent as any, mockCtx as any);

  assert.equal(client.captureCalls.length, 1);
  const capture = client.captureCalls[0];
  assert.equal(capture.metadata?.["eve.child-session"], "ses_child_456");
  assert.equal(capture.metadata?.["eve.subagent"], "researcher");
  assert.equal(capture.metadata?.["eve.call"], "call_789");
});

// AC6.4: subagent.completed does NOT capture child-session
test("AC6.4: subagent.completed does not have eve.child-session", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  // oxlint-disable-next-line typescript/no-non-null-assertion -- assert below
  const handler = definition.events?.["subagent.completed"];
  assert.ok(handler, "subagent.completed handler must exist");

  const mockCtx = {
    session: { id: "ses_123" },
    agent: { name: "test-agent" },
    channel: {},
  };
  const mockEvent = {
    data: {
      callId: "call_789",
      subagentName: "researcher",
      output: "some model output",
    },
  };

  await handler(mockEvent as any, mockCtx as any);

  assert.equal(client.captureCalls.length, 1);
  const capture = client.captureCalls[0];
  assert.equal(capture.metadata?.["eve.call"], "call_789");
  assert.equal(capture.metadata?.["eve.subagent"], "researcher");
  assert.ok(!("eve.child-session" in (capture.metadata ?? {})), "eve.child-session must not be present");
});

// AC6.5: never throws when handler called with empty event/ctx
test("AC6.5: all handlers are side-effect-only and never throw with empty input", async () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  assert.ok(definition.events, "events map must exist");

  // Call each handler with empty event and context
  for (const [name, handler] of Object.entries(definition.events)) {
    const mockCtx = {};
    const mockEvent = {};

    try {
      await handler(mockEvent as any, mockCtx as any);
    } catch (error) {
      assert.fail(`Handler "${name}" threw with empty input: ${String(error)}`);
    }
  }
});

// AC6.5: never throws when capture() throws
test("AC6.5: handlers don't throw when capture() throws", async () => {
  const client = createThrowingClient();
  const definition = arcjetHooks(client);

  assert.ok(definition.events, "events map must exist");

  // Call each handler that would normally capture
  for (const [name, handler] of Object.entries(definition.events)) {
    const mockCtx = {
      session: { id: "ses_123" },
      agent: { name: "test-agent" },
      channel: { continuationToken: "token" },
    };
    const mockEvent = {
      data: {
        status: "completed",
        turnId: "turn_123",
        sequence: 1,
        stepIndex: 0,
        result: {},
        callId: "call_123",
        childSessionId: "ses_child",
        subagentName: "agent",
      },
    };

    try {
      await handler(mockEvent as any, mockCtx as any);
    } catch (error) {
      assert.fail(`Handler "${name}" threw when capture() threw: ${String(error)}`);
    }
  }
});

// AC6.6: { events: ["tool"] } yields only tool-family keys
test("AC6.6: events option filters to only selected families", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client, { events: ["tool"] });

  assert.ok(definition.events, "events map must exist");

  const eventKeys = Object.keys(definition.events);
  assert.ok(eventKeys.length > 0, "tool family should have at least one event");

  // All event keys should be tool-family (action.result)
  for (const key of eventKeys) {
    assert.ok(key.startsWith("action."), `event key "${key}" should be from tool family`);
  }
});

// AC6.6: default includes all four families
test("AC6.6: default events option includes all four families", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);

  assert.ok(definition.events, "events map must exist");

  const eventKeys = Object.keys(definition.events);

  // Should have at least one from each family
  const hasSessions = eventKeys.some(k => k.startsWith("session."));
  const hasTurns = eventKeys.some(k => k.startsWith("turn."));
  const hasTools = eventKeys.some(k => k.startsWith("action."));
  const hasSubagents = eventKeys.some(k => k.startsWith("subagent."));

  assert.ok(hasSessions, "should include session family");
  assert.ok(hasTurns, "should include turn family");
  assert.ok(hasTools, "should include tool family");
  assert.ok(hasSubagents, "should include subagent family");
});

// AC6.6: { events: [] } yields an empty map
test("AC6.6: empty events option yields empty map", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client, { events: [] });

  assert.ok(definition.events !== undefined, "events map must exist");

  const eventKeys = Object.keys(definition.events);
  assert.equal(eventKeys.length, 0, "events map should be empty");
});

// Task 3: Type-level assertion
// This file can only assert assignability to HookDefinition, not ExactDefinition.
// The ExactDefinition wrapper is verified in Phase 6 where defineHook is actually called.
test("Task 3: arcjetHooks returns valid HookDefinition assignable to defineHook parameter", () => {
  const client = createMockClient();

  // Assignable to what `defineHook` accepts, and to what an authored
  // `agent/hooks/*.ts` default-exports.
  const asDefinition: HookDefinition = arcjetHooks(client);
  void asDefinition;

  // Type assertion passes at compile time; ExactDefinition validation is done in Phase 6
  assert.ok(true, "type assertion verified at compile time");
});
