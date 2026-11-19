// oxlint-disable eslint/no-unsafe-type-assertion -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookDefinition } from "eve/hooks";

import type { ArcjetAgentClient } from "../../agents/capture.ts";
import type { CaptureOptions } from "../../types.ts";
import { arcjetHooks } from "./hooks.ts";

type Captured = { action: string; correlationId?: string; metadata?: Record<string, unknown> };

function createMockClient(): ArcjetAgentClient & { captureCalls: Captured[] } {
  const captureCalls: Captured[] = [];
  return {
    captureCalls,
    guard() {
      return Promise.resolve({ allowed: true } as never);
    },
    capture(opts: CaptureOptions) {
      captureCalls.push({
        action: opts.action,
        ...(opts.correlationId === undefined ? {} : { correlationId: opts.correlationId }),
        ...(opts.metadata === undefined ? {} : { metadata: opts.metadata }),
      });
    },
  };
}

function createThrowingClient(): ArcjetAgentClient {
  return {
    guard() {
      return Promise.resolve({ allowed: true } as never);
    },
    capture() {
      throw new Error("capture failed");
    },
  };
}

const SESSION_ID = "01JTESTSESSION0000000000AB";

function hookContext(overrides: Record<string, unknown> = {}): unknown {
  return {
    session: {
      id: SESSION_ID,
      turn: { id: "turn_1", sequence: 1 },
      auth: { current: { principalId: "user_1" }, initiator: null },
    },
    channel: { kind: "slack", continuationToken: "slack:1700000000.000100" },
    agent: { name: "support" },
    ...overrides,
  };
}

/** Run one handler of `definition` with an untyped event and context. */
function fire(
  definition: HookDefinition,
  key: string,
  event: unknown,
  ctx: unknown = hookContext(),
): void {
  const handler = (definition.events as Record<string, unknown>)[key];
  assert.equal(typeof handler, "function", `expected a handler for ${key}`);
  (handler as (event: unknown, ctx: unknown) => void)(event, ctx);
}

test("arcjetHooks returns an object with only an events key", () => {
  assert.deepEqual(Object.keys(arcjetHooks(createMockClient())), ["events"]);
});

test("default families register only Eve 1.x session stream v27 keys", () => {
  // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh Object.keys array
  const keys = Object.keys(arcjetHooks(createMockClient()).events).sort();
  assert.deepEqual(keys, [
    "call.settled",
    "child.opened",
    "session.ended",
    "session.started",
    "task.ended",
    "task.started",
    "turn.settled",
    "turn.started",
  ]);
});

test("no handler uses a key Eve 1.x's hook loader rejects", () => {
  // Eve 1.x throws "was removed in session stream version 27" for these.
  const removed = new Set([
    "action.result",
    "agent.started",
    "session.completed",
    "session.failed",
    "subagent.called",
    "subagent.completed",
    "task.settled",
    "turn.cancelled",
    "turn.completed",
    "turn.failed",
  ]);
  for (const key of Object.keys(arcjetHooks(createMockClient()).events)) {
    assert.equal(removed.has(key), false, `${key} is removed in Eve 1.x`);
  }
});

test("events option selects families", () => {
  const families = {
    session: ["session.ended", "session.started"],
    turn: ["turn.settled", "turn.started"],
    tool: ["call.settled"],
    subagent: ["child.opened", "task.ended", "task.started"],
  } as const;
  for (const [family, keys] of Object.entries(families)) {
    const definition = arcjetHooks(createMockClient(), {
      events: [family as keyof typeof families],
    });
    // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh Object.keys array
    assert.deepEqual(Object.keys(definition.events).sort(), [...keys]);
  }
  assert.deepEqual(Object.keys(arcjetHooks(createMockClient(), { events: [] }).events), []);
});

test("session.started emits the join record with continuation token, channel, and agent", () => {
  const client = createMockClient();
  fire(arcjetHooks(client), "session.started", { type: "session.started", data: {} });

  assert.deepEqual(client.captureCalls, [
    {
      action: "eve.session-started",
      correlationId: SESSION_ID,
      metadata: {
        "eve.session": SESSION_ID,
        "eve.turn": "turn_1",
        user: "user_1",
        "eve.continuation-token": "slack:1700000000.000100",
        "eve.channel": "slack",
        "eve.agent": "support",
      },
    },
  ]);
});

test("session.started correlates a delegated session on its root session", () => {
  const client = createMockClient();
  fire(
    arcjetHooks(client),
    "session.started",
    { type: "session.started", data: {} },
    hookContext({
      session: {
        id: "01JTESTCHILD00000000000000",
        turn: { id: "turn_c", sequence: 1 },
        auth: { current: null, initiator: null },
        parent: { sessionId: SESSION_ID, rootSessionId: SESSION_ID, callId: "call_1" },
      },
    }),
  );
  assert.equal(client.captureCalls[0]?.correlationId, SESSION_ID);
  assert.equal(client.captureCalls[0]?.metadata?.["eve.parent-session"], SESSION_ID);
});

test("session.ended records eve.session-failed only for a failed session", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);
  fire(definition, "session.ended", { type: "session.ended", data: { outcome: "completed" } });
  fire(definition, "session.ended", {
    type: "session.ended",
    data: { outcome: "failed", error: { code: "MODEL_CALL_FAILED", message: "x" } },
  });

  assert.equal(client.captureCalls.length, 1);
  assert.equal(client.captureCalls[0]?.action, "eve.session-failed");
  assert.equal(client.captureCalls[0]?.metadata?.["outcome"], "error");
  assert.equal(client.captureCalls[0]?.metadata?.["error.code"], "MODEL_CALL_FAILED");
});

test("turn.started records the turn id", () => {
  const client = createMockClient();
  fire(arcjetHooks(client), "turn.started", {
    type: "turn.started",
    data: { turnId: "turn_2", cause: { deliveryId: "d_1" }, follows: null },
  });
  assert.equal(client.captureCalls[0]?.action, "eve.turn-started");
  assert.equal(client.captureCalls[0]?.metadata?.["eve.turn"], "turn_2");
});

test("turn.settled maps each outcome to its own action", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);
  fire(definition, "turn.settled", {
    type: "turn.settled",
    data: { turnId: "turn_2", outcome: "completed" },
  });
  fire(definition, "turn.settled", {
    type: "turn.settled",
    data: { turnId: "turn_3", outcome: "failed", error: { code: "TOOL_FAILED", message: "x" } },
  });
  fire(definition, "turn.settled", {
    type: "turn.settled",
    data: { turnId: "turn_4", outcome: "cancelled" },
  });
  fire(definition, "turn.settled", {
    type: "turn.settled",
    data: { turnId: "turn_5", outcome: "something-newer" },
  });

  assert.deepEqual(
    client.captureCalls.map((call) => [
      call.action,
      call.metadata?.["eve.turn"],
      call.metadata?.["outcome"],
      call.metadata?.["error.code"],
    ]),
    [
      ["eve.turn-completed", "turn_2", "success", undefined],
      ["eve.turn-failed", "turn_3", "error", "TOOL_FAILED"],
      ["eve.turn-cancelled", "turn_4", "cancelled", undefined],
    ],
  );
});

test("call.settled records eve.action-result with the call id and mapped outcome", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);
  for (const outcome of ["completed", "failed", "rejected", "interrupted", "abandoned"]) {
    fire(definition, "call.settled", {
      type: "call.settled",
      data: {
        callId: `call_${outcome}`,
        outcome,
        ...(outcome === "failed" && { error: { code: "TOOL_ERROR", message: "x" } }),
      },
    });
  }

  assert.deepEqual(
    client.captureCalls.map((call) => ({
      action: call.action,
      phase: call.metadata?.["eve.phase"],
      call: call.metadata?.["eve.call"],
      raw: call.metadata?.["eve.call-outcome"],
      outcome: call.metadata?.["outcome"],
      code: call.metadata?.["error.code"],
    })),
    [
      {
        action: "eve.action-result",
        phase: "result",
        call: "call_completed",
        raw: "completed",
        outcome: "success",
        code: undefined,
      },
      {
        action: "eve.action-result",
        phase: "result",
        call: "call_failed",
        raw: "failed",
        outcome: "error",
        code: "TOOL_ERROR",
      },
      {
        action: "eve.action-result",
        phase: "result",
        call: "call_rejected",
        raw: "rejected",
        outcome: "denied",
        code: undefined,
      },
      {
        action: "eve.action-result",
        phase: "result",
        call: "call_interrupted",
        raw: "interrupted",
        outcome: undefined,
        code: undefined,
      },
      {
        action: "eve.action-result",
        phase: "result",
        call: "call_abandoned",
        raw: "abandoned",
        outcome: undefined,
        code: undefined,
      },
    ],
  );
});

test("task.started records eve.subagent-called only for agent tasks", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);
  fire(definition, "task.started", {
    type: "task.started",
    data: { taskId: "task_t", startedBy: { callId: "call_t" }, kind: "tool", name: "deploy" },
  });
  fire(definition, "task.started", {
    type: "task.started",
    data: { taskId: "task_a", startedBy: { callId: "call_a" }, kind: "agent", name: "research" },
  });

  assert.equal(client.captureCalls.length, 1);
  assert.equal(client.captureCalls[0]?.action, "eve.subagent-called");
  assert.equal(client.captureCalls[0]?.metadata?.["eve.subagent"], "research");
  assert.equal(client.captureCalls[0]?.metadata?.["eve.call"], "call_a");
  assert.equal(client.captureCalls[0]?.metadata?.["eve.task"], "task_a");
});

test("child.opened records eve.agent-started with the child session and its owner", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);
  fire(definition, "child.opened", {
    type: "child.opened",
    data: { sessionId: "child_1", owner: { callId: "call_a" }, name: "research", stream: "/s" },
  });
  fire(definition, "child.opened", {
    type: "child.opened",
    data: { sessionId: "child_2", owner: { taskId: "task_a" }, name: "research", stream: "/s" },
  });

  const [byCall, byTask] = client.captureCalls;
  assert.equal(byCall?.action, "eve.agent-started");
  assert.equal(byCall?.metadata?.["eve.child-session"], "child_1");
  assert.equal(byCall?.metadata?.["eve.subagent"], "research");
  assert.equal(byCall?.metadata?.["eve.call"], "call_a");
  assert.equal(byCall?.metadata?.["eve.task"], undefined);
  assert.equal(byTask?.metadata?.["eve.task"], "task_a");
  assert.equal(byTask?.metadata?.["eve.call"], undefined);
});

test("task.ended records eve.task-ended with status, cancel reason, and error code", () => {
  const client = createMockClient();
  const definition = arcjetHooks(client);
  fire(definition, "task.ended", {
    type: "task.ended",
    data: { taskId: "task_a", outcome: "cancelled", reason: "turn-cancelled" },
  });
  fire(definition, "task.ended", {
    type: "task.ended",
    data: { taskId: "task_b", outcome: "failed", error: { code: "AGENT_FAILED", message: "x" } },
  });

  const [cancelled, failed] = client.captureCalls;
  assert.equal(cancelled?.action, "eve.task-ended");
  assert.equal(cancelled?.metadata?.["eve.task"], "task_a");
  assert.equal(cancelled?.metadata?.["eve.task-status"], "cancelled");
  assert.equal(cancelled?.metadata?.["eve.cancel-reason"], "turn-cancelled");
  assert.equal(failed?.metadata?.["eve.task-status"], "failed");
  assert.equal(failed?.metadata?.["error.code"], "AGENT_FAILED");
});

test("non-string and empty fields are left out of metadata", () => {
  const client = createMockClient();
  fire(
    arcjetHooks(client),
    "call.settled",
    { type: "call.settled", data: { callId: "", outcome: 42 } },
    hookContext({ channel: { kind: 7 } }),
  );
  assert.equal(client.captureCalls.length, 1);
  const metadata = client.captureCalls[0]?.metadata ?? {};
  assert.equal("eve.call" in metadata, false);
  assert.equal("eve.call-outcome" in metadata, false);
  assert.equal("outcome" in metadata, false);
});

test("handlers never throw: capture failure, missing event, missing context", () => {
  const throwing = arcjetHooks(createThrowingClient());
  const plain = arcjetHooks(createMockClient());
  for (const definition of [throwing, plain]) {
    for (const key of Object.keys(definition.events)) {
      assert.doesNotThrow(() => {
        fire(definition, key, { type: key, data: {} });
      });
      assert.doesNotThrow(() => {
        fire(definition, key, undefined, null);
      });
      assert.doesNotThrow(() => {
        fire(definition, key, null, {});
      });
    }
  }
});

test("a session without an id still captures under a generated correlation id", () => {
  const client = createMockClient();
  fire(arcjetHooks(client), "turn.started", { data: { turnId: "t" } }, {});
  const correlationId = client.captureCalls[0]?.correlationId;
  assert.equal(typeof correlationId, "string");
  assert.ok((correlationId ?? "").length > 0);
});
