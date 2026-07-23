import assert from "node:assert/strict";
import { test } from "node:test";

import type { RuleWithInput } from "@arcjet/guard";
import type { Decision } from "@arcjet/guard";

import {
  protectAction,
  captureAction,
  ArcjetDeniedError,
  createAiContext,
  type ArcjetAiClient,
} from "../dist/index.js";

/**
 * Factory for stub guard clients with in-memory decision and capture tracking.
 */
function stubClient(decision: Decision | Error) {
  const guardCalls: unknown[] = [];
  const captureCalls: unknown[] = [];
  return {
    client: {
      async guard(opts: unknown) {
        guardCalls.push(opts);
        if (decision instanceof Error) throw decision;
        return decision;
      },
      experimental_capture(opts: unknown) {
        captureCalls.push(opts);
      },
    } as unknown as ArcjetAiClient,
    guardCalls,
    captureCalls,
  };
}

/**
 * Stub ALLOW decision.
 */
function decisionAllow(): Decision {
  return {
    conclusion: "ALLOW",
    id: "gdec_allow1",
    results: [],
    warnings: [],
    hasFailedOpen: () => false,
  } as unknown as Decision;
}

/**
 * Stub DENY decision (RATE_LIMIT).
 */
function decisionDenyRateLimit(resetAtUnixSeconds: number) {
  return {
    conclusion: "DENY",
    reason: "RATE_LIMIT",
    id: "gdec_deny1",
    results: [
      {
        conclusion: "DENY",
        reason: "RATE_LIMIT",
        type: "TOKEN_BUCKET",
        resetAtUnixSeconds,
      },
    ],
    warnings: [],
    hasFailedOpen: () => false,
  };
}

/**
 * Stub fail-open ALLOW decision.
 */
function decisionFailOpenAllow(): Decision {
  return {
    conclusion: "ALLOW",
    id: "gdec_allow_fo",
    results: [],
    warnings: [],
    hasFailedOpen: () => true,
  } as unknown as Decision;
}

// Fake rule for testing
const fakeRule: RuleWithInput = {
  type: "TEST" as never,
} as RuleWithInput;

test("AC3.1: ALLOW decision → fn runs once, protectAction resolves with fn's return value", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const result = await protectAction(
    client,
    createAiContext(),
    { action: "test.action", rules: [fakeRule] },
    async () => {
      fnCallCount++;
      return sentinel;
    },
  );

  assert.equal(fnCallCount, 1, "fn should be called once");
  assert.strictEqual(result, sentinel, "result should be the same reference as sentinel");
  assert.equal(guardCalls.length, 1, "guard should be called once");
});

test("AC3.2: DENY decision → ArcjetDeniedError thrown, fn never called", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 30;
  const { client, guardCalls } = stubClient(decisionDenyRateLimit(resetAt));
  let fnCallCount = 0;

  try {
    await protectAction(
      client,
      createAiContext(),
      { action: "test.action", rules: [fakeRule] },
      async () => {
        fnCallCount++;
        return { should: "not happen" };
      },
    );
    assert.fail("should have thrown ArcjetDeniedError");
  } catch (error) {
    assert.ok(error instanceof ArcjetDeniedError, "should throw ArcjetDeniedError");
    assert.equal((error as ArcjetDeniedError).name, "ArcjetDeniedError");
    assert.equal((error as ArcjetDeniedError).decision.reason, "RATE_LIMIT");
    assert.ok(
      (error as ArcjetDeniedError).message.includes("test.action"),
      "message should include action",
    );
    assert.ok(
      (error as ArcjetDeniedError).message.includes("RATE_LIMIT"),
      "message should include reason",
    );
  }

  assert.equal(fnCallCount, 0, "fn should never be called");
  assert.equal(guardCalls.length, 1, "guard should be called once");
});

test("AC3.3: success path → one capture with metadata outcome: success and decisionId set", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const sentinel = { result: "success" };

  const result = await protectAction(
    client,
    createAiContext({ correlationId: "corr-1", metadata: { key: "value" } }),
    { action: "test.action", rules: [fakeRule] },
    async () => sentinel,
  );

  assert.equal(captureCalls.length, 1, "capture should be called once");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.equal(captureCall.action, "test.action");
  assert.equal(captureCall.correlationId, "corr-1");
  assert.equal(captureCall.decisionId, "gdec_allow1");
  const metadata = captureCall.metadata as Record<string, string>;
  assert.equal(metadata.outcome, "success");
  assert.equal(metadata.key, "value");
});

test("AC3.3: denied path → one capture with outcome: denied and decisionId", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 30;
  const { client, captureCalls } = stubClient(decisionDenyRateLimit(resetAt));

  try {
    await protectAction(
      client,
      createAiContext({ correlationId: "corr-1" }),
      { action: "test.action", rules: [fakeRule] },
      async () => ({ should: "not happen" }),
    );
    assert.fail("should have thrown");
  } catch (error) {
    // Expected
  }

  assert.equal(captureCalls.length, 1, "capture should be called once on denial");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.equal(captureCall.decisionId, "gdec_deny1");
  const metadata = captureCall.metadata as Record<string, string>;
  assert.equal(metadata.outcome, "denied");
});

test("AC3.3: error path → fn rejects, sentinel propagates, one capture with outcome: error", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const testError = new Error("fn failed");

  try {
    await protectAction(
      client,
      createAiContext({ correlationId: "corr-1" }),
      { action: "test.action", rules: [fakeRule] },
      async () => {
        throw testError;
      },
    );
    assert.fail("should have thrown");
  } catch (error) {
    assert.strictEqual(error, testError, "same error should propagate");
  }

  assert.equal(captureCalls.length, 1, "capture should fire once with error");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  const metadata = captureCall.metadata as Record<string, string>;
  assert.equal(metadata.outcome, "error");
});

test("AC3.4: captureAction emits capture with context's correlation ID and merged metadata", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());

  const ctx = createAiContext({
    correlationId: "run-1",
    metadata: { agent: "review-bot" },
  });

  captureAction(client, ctx, {
    action: "notification.sent",
    metadata: { destination: "slack" },
  });

  assert.equal(captureCalls.length, 1, "capture should be called once");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.equal(captureCall.action, "notification.sent");
  assert.equal(captureCall.correlationId, "run-1");
  assert.strictEqual(captureCall.decisionId, undefined, "no decisionId for captureAction");
  const metadata = captureCall.metadata as Record<string, string>;
  assert.deepEqual(
    metadata,
    { agent: "review-bot", destination: "slack" },
    "metadata should merge context then options",
  );
  assert.strictEqual(metadata.outcome, undefined, "captureAction should NOT add outcome");
});

test("AC3.5: guard throws → fn still runs, result passes through, fail-open warning", async () => {
  const guardError = new Error("guard API error");
  const { client, guardCalls, captureCalls } = stubClient(guardError);
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  process.env.ARCJET_LOG_LEVEL = "warn";
  try {
    const result = await protectAction(
      client,
      createAiContext(),
      { action: "test.action", rules: [fakeRule] },
      async () => {
        fnCallCount++;
        return sentinel;
      },
    );

    assert.equal(fnCallCount, 1, "fn should run on guard error");
    assert.strictEqual(result, sentinel);
    assert.ok(
      warnCalls.some(
        (call) =>
          JSON.stringify(call).includes("guard check") && JSON.stringify(call).includes("errored"),
      ),
      "warning should mention guard error",
    );
    assert.equal(guardCalls.length, 1, "guard should be called");
    assert.equal(captureCalls.length, 1, "capture should still fire");
  } finally {
    console.warn = originalWarn;
    delete process.env.ARCJET_LOG_LEVEL;
  }
});

test("AC3.5: guard resolves fail-open ALLOW → fn runs, result passes through, fail-open warning", async () => {
  const { client, captureCalls } = stubClient(decisionFailOpenAllow());
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]) => {
    warnCalls.push(args);
  };

  process.env.ARCJET_LOG_LEVEL = "warn";
  try {
    const result = await protectAction(
      client,
      createAiContext(),
      { action: "test.action", rules: [fakeRule] },
      async () => {
        fnCallCount++;
        return sentinel;
      },
    );

    assert.equal(fnCallCount, 1, "fn should run on fail-open");
    assert.strictEqual(result, sentinel);
    assert.ok(
      warnCalls.some((call) => JSON.stringify(call).includes("failed open")),
      "warning should mention fail-open",
    );
    assert.equal(captureCalls.length, 1, "capture should fire");
  } finally {
    console.warn = originalWarn;
    delete process.env.ARCJET_LOG_LEVEL;
  }
});

test("Capture-only mode: no rules → guard never called, fn runs, capture fires without decisionId", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const result = await protectAction(
    client,
    createAiContext({ correlationId: "corr-1" }),
    { action: "test.action" }, // No rules
    async () => {
      fnCallCount++;
      return sentinel;
    },
  );

  assert.equal(guardCalls.length, 0, "guard should not be called in capture-only mode");
  assert.equal(fnCallCount, 1, "fn should run");
  assert.strictEqual(result, sentinel);
  assert.equal(captureCalls.length, 1, "capture should fire");
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.strictEqual(captureCall.decisionId, undefined, "no decisionId in capture-only");
  const metadata = captureCall.metadata as Record<string, string>;
  assert.equal(metadata.outcome, "success");
});

test("Capture-only mode: empty rules array → guard never called", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const result = await protectAction(
    client,
    createAiContext(),
    { action: "test.action", rules: [] }, // Empty rules array
    async () => {
      fnCallCount++;
      return sentinel;
    },
  );

  assert.equal(guardCalls.length, 0, "guard should not be called with empty rules");
  assert.equal(fnCallCount, 1, "fn should run");
  assert.strictEqual(result, sentinel);
});
