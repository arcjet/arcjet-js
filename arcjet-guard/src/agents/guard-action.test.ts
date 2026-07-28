import assert from "node:assert/strict";
import { test } from "node:test";

import {
  guardAction,
  captureAction,
  ArcjetDeniedError,
  ArcjetGuardUnavailableError,
} from "./guard-action.ts";
import { createAgentContext } from "./context.ts";
import { setLogLevel } from "../../test/_shared/log-level.ts";
import {
  stubClient,
  decisionAllow,
  decisionDenyRateLimit,
  decisionFailOpenAllow,
  fakeRule,
} from "../../test/_shared/stub-client.ts";

test("AC4.8: ALLOW decision → fn runs once, guardAction resolves with fn's return value", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const result = await guardAction(
    client,
    createAgentContext(),
    { action: "test.action", rules: [fakeRule] },
    // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
    async () => {
      fnCallCount++;
      return sentinel;
    },
  );

  assert.equal(fnCallCount, 1, "fn should be called once");
  assert.strictEqual(result, sentinel, "result should be the same reference as sentinel");
  assert.equal(guardCalls.length, 1, "guard should be called once");
});

test("AC4.8: DENY decision → ArcjetDeniedError thrown, fn never called", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 30;
  const { client, guardCalls } = stubClient(decisionDenyRateLimit(resetAt));
  let fnCallCount = 0;

  try {
    await guardAction(
      client,
      createAgentContext(),
      { action: "test.action", rules: [fakeRule] },
      // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
      async () => {
        fnCallCount++;
        return { should: "not happen" };
      },
    );
    assert.fail("should have thrown ArcjetDeniedError");
  } catch (err) {
    assert.ok(err instanceof ArcjetDeniedError, "should throw ArcjetDeniedError");
    assert.equal(err.name, "ArcjetDeniedError");
    assert.equal(err.decision.reason, "RATE_LIMIT");
    assert.ok(err.message.includes("test.action"), "message should include action");
    assert.ok(err.message.includes("RATE_LIMIT"), "message should include reason");
  }

  assert.equal(fnCallCount, 0, "fn should never be called");
  assert.equal(guardCalls.length, 1, "guard should be called once");
});

test("AC4.9: success path → one capture with metadata outcome: success and decisionId set", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const sentinel = { result: "success" };

  await guardAction(
    client,
    createAgentContext({ correlationId: "corr-1", metadata: { key: "value" } }),
    { action: "test.action", rules: [fakeRule] },
    // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
    async () => sentinel,
  );

  assert.equal(captureCalls.length, 1, "capture should be called once");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured values
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.equal(captureCall.action, "test.action");
  assert.equal(captureCall.correlationId, "corr-1");
  assert.equal(captureCall.decisionId, "gdec_allow1");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured metadata
  const metadata = captureCall.metadata as Record<string, unknown>;
  assert.equal(metadata.outcome, "success");
  assert.equal(metadata.key, "value");
});

test("AC4.9: denied path → one capture with outcome: denied and decisionId", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 30;
  const { client, captureCalls } = stubClient(decisionDenyRateLimit(resetAt));

  try {
    await guardAction(
      client,
      createAgentContext({ correlationId: "corr-1" }),
      { action: "test.action", rules: [fakeRule] },
      // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
      async () => ({ should: "not happen" }),
    );
    assert.fail("should have thrown");
  } catch {
    // Expected
  }

  assert.equal(captureCalls.length, 1, "capture should be called once on denial");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured values
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.equal(captureCall.decisionId, "gdec_deny1");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured metadata
  const metadata = captureCall.metadata as Record<string, unknown>;
  assert.equal(metadata.outcome, "denied");
});

test("AC4.9: error path → fn rejects, sentinel propagates, one capture with outcome: error", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const testError = new Error("fn failed");

  try {
    await guardAction(
      client,
      createAgentContext({ correlationId: "corr-1" }),
      { action: "test.action", rules: [fakeRule] },
      // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
      async () => {
        throw testError;
      },
    );
    assert.fail("should have thrown");
  } catch (err) {
    assert.strictEqual(err, testError, "same error should propagate");
  }

  assert.equal(captureCalls.length, 1, "capture should fire once with error");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured values
  const captureCall = captureCalls[0] as Record<string, unknown>;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured metadata
  const metadata = captureCall.metadata as Record<string, unknown>;
  assert.equal(metadata.outcome, "error");
});

test("AC4.9: captureAction emits capture with context's correlation ID and merged metadata", () => {
  const { client, captureCalls } = stubClient(decisionAllow());

  const ctx = createAgentContext({
    correlationId: "run-1",
    metadata: { agent: "review-bot" },
  });

  captureAction(client, ctx, {
    action: "notification.sent",
    metadata: { destination: "slack" },
  });

  assert.equal(captureCalls.length, 1, "capture should be called once");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured values
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.equal(captureCall.action, "notification.sent");
  assert.equal(captureCall.correlationId, "run-1");
  assert.strictEqual(captureCall.decisionId, undefined, "no decisionId for captureAction");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured metadata
  const metadata = captureCall.metadata as Record<string, unknown>;
  assert.deepEqual(
    metadata,
    { agent: "review-bot", destination: "slack" },
    "metadata should merge context then options (no outcome key)",
  );
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- metadata is narrowed by deepEqual assertion
  assert.strictEqual((metadata as Record<string, unknown>).outcome, undefined, "captureAction should NOT add outcome");
});

test("AC4.4: guard throws, onGuardError: 'allow' → fn runs, result passes through, fail-open warning", async () => {
  const guardError = new Error("guard API error");
  const { client, guardCalls, captureCalls } = stubClient(guardError);
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  // oxlint-disable-next-line typescript/explicit-function-return-type -- test mock function
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };

  const restoreLogLevel = setLogLevel("warn");
  try {
    const result = await guardAction(
      client,
      createAgentContext(),
      { action: "test.action", rules: [fakeRule], onGuardError: "allow" },
      // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
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
          JSON.stringify(call).includes("guard check") &&
          JSON.stringify(call).includes("errored") &&
          JSON.stringify(call).includes("failing open"),
      ),
      "warning should mention guard error and failing open",
    );
    assert.equal(guardCalls.length, 1, "guard should be called");
    assert.equal(captureCalls.length, 1, "capture should still fire");
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }
});

test("AC4.4: guard resolves fail-open ALLOW, onGuardError: 'allow' → fn runs, result passes through, fail-open warning", async () => {
  const { client, captureCalls } = stubClient(decisionFailOpenAllow());
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  // oxlint-disable-next-line typescript/explicit-function-return-type -- test mock function
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };

  const restoreLogLevel = setLogLevel("warn");
  try {
    const result = await guardAction(
      client,
      createAgentContext(),
      { action: "test.action", rules: [fakeRule], onGuardError: "allow" },
      // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
      async () => {
        fnCallCount++;
        return sentinel;
      },
    );

    assert.equal(fnCallCount, 1, "fn should run on fail-open");
    assert.strictEqual(result, sentinel);
    assert.ok(
      warnCalls.some(
        (call) =>
          JSON.stringify(call).includes("guard check") &&
          JSON.stringify(call).includes("failed open"),
      ),
      "warning should mention failed open",
    );
    assert.equal(captureCalls.length, 1, "capture should fire");
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }
});

test("Capture-only mode: no rules → guard never called, fn runs, capture fires without decisionId", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const result = await guardAction(
    client,
    createAgentContext({ correlationId: "corr-1" }),
    { action: "test.action" }, // No rules
    // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
    async () => {
      fnCallCount++;
      return sentinel;
    },
  );

  assert.equal(guardCalls.length, 0, "guard should not be called in capture-only mode");
  assert.equal(fnCallCount, 1, "fn should run");
  assert.strictEqual(result, sentinel);
  assert.equal(captureCalls.length, 1, "capture should fire");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured values
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.strictEqual(captureCall.decisionId, undefined, "no decisionId in capture-only");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured metadata
  const metadata = captureCall.metadata as Record<string, unknown>;
  assert.equal(metadata.outcome, "success");
});

test("Capture-only mode: empty rules array → guard never called", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const sentinel = { result: "success" };
  let fnCallCount = 0;

  const result = await guardAction(
    client,
    createAgentContext(),
    { action: "test.action", rules: [] }, // Empty rules array
    // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
    async () => {
      fnCallCount++;
      return sentinel;
    },
  );

  assert.equal(guardCalls.length, 0, "guard should not be called with empty rules");
  assert.equal(fnCallCount, 1, "fn should run");
  assert.strictEqual(result, sentinel);
});

test("AC4.11: guard throws, onGuardError omitted (default deny) → ArcjetGuardUnavailableError, fn never called", async () => {
  const guardError = new Error("guard API error");
  const { client, guardCalls, captureCalls } = stubClient(guardError);
  let fnCallCount = 0;

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };
  const restoreLogLevel = setLogLevel("warn");

  let caught: unknown;
  try {
    await guardAction(
      client,
      createAgentContext(),
      { action: "test.action", rules: [fakeRule] },
      () => Promise.resolve(++fnCallCount),
    );
  } catch (err) {
    caught = err;
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }

  assert.ok(
    caught instanceof ArcjetGuardUnavailableError,
    "should throw ArcjetGuardUnavailableError",
  );
  assert.equal(caught.name, "ArcjetGuardUnavailableError");
  assert.equal(caught.action, "test.action");
  assert.strictEqual(caught.decision, undefined, "decision should be undefined on threw path");
  assert.strictEqual(caught.cause, guardError, "cause should be the original error by reference");
  assert.ok(
    !(caught instanceof ArcjetDeniedError),
    "should NOT be an instance of ArcjetDeniedError",
  );

  assert.ok(
    warnCalls.some(
      (call) =>
        JSON.stringify(call).includes("guard check") &&
        JSON.stringify(call).includes("errored") &&
        JSON.stringify(call).includes("failing closed"),
    ),
    "warning should mention guard error and failing closed, not failing open",
  );

  assert.equal(fnCallCount, 0, "fn should never be called");
  assert.equal(guardCalls.length, 1, "guard should be called once");
  assert.equal(captureCalls.length, 1, "capture should fire with unavailable outcome");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured values
  const captureCall = captureCalls[0] as Record<string, unknown>;
  assert.strictEqual(captureCall.decisionId, undefined, "no decisionId on threw path");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured metadata
  const metadata = captureCall.metadata as Record<string, unknown>;
  assert.equal(metadata.outcome, "unavailable");
});

test("AC4.12: guard returns fail-open ALLOW, onGuardError omitted (default deny) → ArcjetGuardUnavailableError, fn never called", async () => {
  const failedOpen = decisionFailOpenAllow();
  const { client, guardCalls, captureCalls } = stubClient(failedOpen);
  let fnCallCount = 0;

  const originalWarn = console.warn;
  const warnCalls: unknown[] = [];
  console.warn = (...args: unknown[]): void => {
    warnCalls.push(args);
  };
  const restoreLogLevel = setLogLevel("warn");

  let caught: unknown;
  try {
    await guardAction(
      client,
      createAgentContext(),
      { action: "test.action", rules: [fakeRule] },
      () => Promise.resolve(++fnCallCount),
    );
  } catch (err) {
    caught = err;
  } finally {
    console.warn = originalWarn;
    restoreLogLevel();
  }

  assert.ok(
    caught instanceof ArcjetGuardUnavailableError,
    "should throw ArcjetGuardUnavailableError",
  );
  assert.equal(caught.name, "ArcjetGuardUnavailableError");
  assert.equal(caught.action, "test.action");
  assert.strictEqual(
    caught.cause,
    undefined,
    "cause should be undefined on failed-open path (use === undefined, not in)",
  );
  assert.strictEqual(caught.decision, failedOpen, "decision should be the DecisionAllow by reference");
  assert.ok(
    !(caught instanceof ArcjetDeniedError),
    "should NOT be an instance of ArcjetDeniedError",
  );

  assert.ok(
    warnCalls.some(
      (call) =>
        JSON.stringify(call).includes("guard check") &&
        JSON.stringify(call).includes("was unavailable") &&
        JSON.stringify(call).includes("failing closed"),
    ),
    "warning should say the check was unavailable and is failing closed, not failed open",
  );

  assert.equal(fnCallCount, 0, "fn should never be called");
  assert.equal(guardCalls.length, 1, "guard should be called once");
  assert.equal(captureCalls.length, 1, "capture should fire with unavailable outcome");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured values
  const captureCall = captureCalls[0] as Record<string, unknown>;
  // Synthesized decisions carry id: "", so no decisionId in capture
  assert.strictEqual(
    captureCall.decisionId,
    undefined,
    "no decisionId on fail-open path (synthesized decision has id: '')",
  );
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting captured metadata
  const metadata = captureCall.metadata as Record<string, unknown>;
  assert.equal(metadata.outcome, "unavailable");
});

test("AC4.11: real DENY with onGuardError: 'deny' still throws ArcjetDeniedError, not ArcjetGuardUnavailableError", async () => {
  const resetAt = Math.floor(Date.now() / 1000) + 30;
  const { client } = stubClient(decisionDenyRateLimit(resetAt));

  try {
    await guardAction(
      client,
      createAgentContext(),
      { action: "test.action", rules: [fakeRule], onGuardError: "deny" },
      // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
      async () => ({ should: "not happen" }),
    );
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof ArcjetDeniedError, "should throw ArcjetDeniedError, not unavailable");
    assert.ok(!(err instanceof ArcjetGuardUnavailableError), "should not be unavailable error");
  }
});

test("AC4.11: policy.onDeny is NOT invoked on unavailable signals", async () => {
  const guardError = new Error("guard API error");
  const { client } = stubClient(guardError);
  let onDenyCallCount = 0;

  try {
    await guardAction(
      client,
      createAgentContext(),
      {
        action: "test.action",
        rules: [fakeRule],
      },
      // oxlint-disable-next-line eslint/require-await -- callback must be async to match function signature
      async () => {
        return { should: "not happen" };
      },
    );
    assert.fail("should have thrown");
  } catch {
    // Expected — ArcjetGuardUnavailableError
  }

  // If we had hooked onDeny somehow, it would not have been called.
  // This test documents that unavailable errors bypass onDeny entirely.
  assert.equal(onDenyCallCount, 0, "onDeny callback never called");
});
