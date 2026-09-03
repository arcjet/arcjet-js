// oxlint-disable eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { recorded } from "../../../test/_shared/source-scan.ts";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionFailOpenAllow,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import type { DecisionAllow } from "../../types.ts";
import { runGate } from "./gate.ts";

test("guard threw, failing closed → onUnavailable, capture outcome unavailable", async () => {
  const error = new Error("boom");
  const { client, captureCalls } = stubClient(error);

  let receivedKind: string | undefined;
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: (unavailable) => {
      receivedKind = unavailable.kind;
      return "unavailable";
    },
    onGuardError: "deny",
  });

  assert.equal(result, "unavailable");
  assert.equal(receivedKind, "threw");
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "unavailable");
});

test("fail-open ALLOW, failing closed → onUnavailable", async () => {
  const decision = decisionFailOpenAllow();
  const { client, captureCalls } = stubClient(decision);

  let receivedKind: string | undefined;
  let receivedDecision: DecisionAllow | undefined;
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: (unavailable) => {
      receivedKind = unavailable.kind;
      if (unavailable.kind === "failed-open") {
        receivedDecision = unavailable.decision;
      }
      return "unavailable";
    },
  });

  assert.equal(result, "unavailable");
  assert.equal(receivedKind, "failed-open");
  assert.strictEqual(receivedDecision, decision);
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "unavailable");
});

test("ALLOW → onAllow and capture outcome allowed", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
  });

  assert.equal(result, "allowed");
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "allowed");
});

test("DENY → onDeny and capture outcome denied", async () => {
  const { client, captureCalls } = stubClient(decisionDenyPromptInjection());
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: (decision) => `denied: ${decision.reason}`,
    onUnavailable: () => "unavailable",
  });

  assert.equal(result, "denied: PROMPT_INJECTION");
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "denied");
});

test("empty decision.id is omitted from the capture", async () => {
  const { client, captureCalls } = stubClient(decisionFailOpenAllow());
  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
  });

  assert.equal("decisionId" in recorded(captureCalls[0]), false);
});

test("undefined correlationId is omitted from the guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: undefined,
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
  });

  assert.equal("correlationId" in recorded(guardCalls[0]), false);
});

test("onGuardError allow after a throw still reaches onAllow", async () => {
  const { client } = stubClient(new Error("boom"));
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: undefined,
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "allow",
  });

  assert.equal(result, "allowed");
});
