// oxlint-disable eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import type { DecisionAllow } from "../../types.ts";
import type { ArcjetMetadata } from "../../types.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { recorded } from "../../../test/_shared/source-scan.ts";
import { runGate } from "./gate.ts";

test("AC4.6 + AC4.8: guard threw, failing closed → onUnavailable called, one capture with outcome: unavailable", async () => {
  const error = new Error("boom");
  const { client, captureCalls } = stubClient(error);

  let onUnavailableCalls = 0;
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => {
      onUnavailableCalls++;
      return "unavailable";
    },
    onGuardError: "deny",
  });

  assert.equal(result, "unavailable");
  assert.equal(onUnavailableCalls, 1);
  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  assert.equal(recorded(capture.metadata).outcome, "unavailable");
});

test("AC4.6: guard returned fail-open ALLOW, failing closed → onUnavailable called, one capture with outcome: unavailable", async () => {
  const { client, captureCalls } = stubClient(decisionFailOpenAllow());

  let onUnavailableCalls = 0;
  let receivedDecision: DecisionAllow | undefined;
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: (unavailable) => {
      onUnavailableCalls++;
      assert.equal(unavailable.kind, "failed-open");
      receivedDecision = unavailable.decision;
      return "unavailable";
    },
    onGuardError: "deny",
  });

  assert.equal(result, "unavailable");
  assert.equal(onUnavailableCalls, 1);
  assert.equal(receivedDecision?.id, "");
  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  assert.equal(recorded(capture.metadata).outcome, "unavailable");
});

test("AC4.8: exactly one capture per invocation (ALLOW path)", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());

  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.equal(result, "allowed");
  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  assert.equal(recorded(capture.metadata).outcome, "allowed");
});

test("AC4.8: exactly one capture per invocation (DENY path)", async () => {
  const { client, captureCalls } = stubClient(decisionDenyPromptInjection());

  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: (decision) => `denied: ${decision.reason}`,
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.equal(result, "denied: PROMPT_INJECTION");
  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  assert.equal(recorded(capture.metadata).outcome, "denied");
});

test("AC4.8: empty decision.id produces capture with no decisionId key", async () => {
  const { client, captureCalls } = stubClient(decisionFailOpenAllow());

  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  assert.equal("decisionId" in capture, false);
});

test("AC4.8: non-empty decision.id produces capture with decisionId key", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());

  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.equal(captureCalls.length, 1);
  const capture = recorded(captureCalls[0]);
  assert.equal("decisionId" in capture, true);
  assert.equal(capture.decisionId, "gdec_allow1");
});

test("AC4.8: no capture ever carries outcome: success or error", async () => {
  const { client: allowClient, captureCalls: allowCaptures } = stubClient(decisionAllow());
  const { client: denyClient, captureCalls: denyCaptures } = stubClient(
    decisionDenyPromptInjection(),
  );
  const { client: errorClient, captureCalls: errorCaptures } = stubClient(new Error("boom"));
  const { client: failOpenClient, captureCalls: failOpenCaptures } = stubClient(
    decisionFailOpenAllow(),
  );

  // Test ALLOW
  await runGate(allowClient, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  // Test DENY
  await runGate(denyClient, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  // Test error
  await runGate(errorClient, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  // Test fail-open
  await runGate(failOpenClient, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  for (const captures of [allowCaptures, denyCaptures, errorCaptures, failOpenCaptures]) {
    for (const capture of captures) {
      const record = recorded(capture);
      assert.notEqual(record.outcome, "success", "capture should never have outcome: success");
      assert.notEqual(record.outcome, "error", "capture should never have outcome: error");
    }
  }
});

test("AC4.9: context missing session → guard still called, does not throw", async () => {
  const { client, guardCalls, captureCalls } = stubClient(decisionAllow());

  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: undefined,
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.equal(result, "allowed");
  assert.equal(guardCalls.length, 1);
  assert.equal(captureCalls.length, 1);
});

test("AC4.9: capture() throws → runGate does not reject", async () => {
  const { client } = stubClient(decisionAllow());
  // Override capture to throw
  client.capture = () => {
    throw new Error("capture failed");
  };

  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.equal(result, "allowed");
});

test("guard always called, including when rules is undefined", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());

  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.equal(guardCalls.length, 1);
  const call = recorded(guardCalls[0]);
  assert.deepEqual(call.rules, []);
});

test("guard always called with empty rules array", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());

  await runGate(client, {
    action: "test.action",
    rules: [],
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.equal(guardCalls.length, 1);
  const call = recorded(guardCalls[0]);
  assert.deepEqual(call.rules, []);
});

test("correlationId is omitted from guard call when undefined", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());

  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: undefined,
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  const call = recorded(guardCalls[0]);
  assert.equal("correlationId" in call, false);
});

test("correlationId is included in guard call when set", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());

  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  const call = recorded(guardCalls[0]);
  assert.equal(call.correlationId, "corr-123");
});

test("metadata is not mutated by runGate", async () => {
  const { client } = stubClient(decisionAllow());
  const originalMetadata: ArcjetMetadata = { custom: "value" };
  const metadataCopy = { ...originalMetadata };

  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: originalMetadata,
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny",
  });

  assert.deepEqual(originalMetadata, metadataCopy);
});

test("onGuardError defaults to deny", async () => {
  const { client } = stubClient(new Error("boom"));

  let onUnavailableCalled = false;
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => {
      onUnavailableCalled = true;
      return "unavailable";
    },
    // onGuardError not specified, should default to "deny"
  });

  assert.equal(result, "unavailable");
  assert.equal(onUnavailableCalled, true);
});

test("with onGuardError: allow, threw guard error → onAllow called", async () => {
  const { client } = stubClient(new Error("boom"));

  let onAllowCalled = false;
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => {
      onAllowCalled = true;
      return "allowed";
    },
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "allow",
  });

  assert.equal(result, "allowed");
  assert.equal(onAllowCalled, true);
});

test("with onGuardError: allow, failed-open → onAllow called", async () => {
  const { client } = stubClient(decisionFailOpenAllow());

  let onAllowCalled = false;
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => {
      onAllowCalled = true;
      return "allowed";
    },
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "allow",
  });

  assert.equal(result, "allowed");
  assert.equal(onAllowCalled, true);
});
