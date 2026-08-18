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
import type { ArcjetMetadata, DecisionAllow } from "../../types.ts";
import { runGate } from "./gate.ts";

test("guard threw, failing closed → onUnavailable, capture outcome unavailable", async () => {
  const error = new Error("boom");
  const { client, captureCalls } = stubClient(error);

  let onUnavailableCalls = 0;
  let receivedKind: string | undefined;
  let receivedError: unknown;
  const result = await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: (unavailable) => {
      onUnavailableCalls += 1;
      receivedKind = unavailable.kind;
      if (unavailable.kind === "threw") {
        receivedError = unavailable.error;
      }
      return "unavailable";
    },
    onGuardError: "deny",
  });

  assert.equal(result, "unavailable");
  assert.equal(onUnavailableCalls, 1);
  assert.equal(receivedKind, "threw");
  assert.strictEqual(receivedError, error);
  assert.equal(captureCalls.length, 1);
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
  assert.equal(captureCalls.length, 1);
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

test("non-empty decision.id is included on the capture", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
  });

  assert.equal(recorded(captureCalls[0])["decisionId"], "gdec_allow1");
});

test("captures never use outcome success or error", async () => {
  const { client: allowClient, captureCalls: allowCaptures } = stubClient(decisionAllow());
  const { client: denyClient, captureCalls: denyCaptures } = stubClient(
    decisionDenyPromptInjection(),
  );
  const { client: errorClient, captureCalls: errorCaptures } = stubClient(new Error("boom"));
  const { client: failOpenClient, captureCalls: failOpenCaptures } =
    stubClient(decisionFailOpenAllow());

  const params = {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
    onGuardError: "deny" as const,
  };

  await runGate(allowClient, params);
  await runGate(denyClient, params);
  await runGate(errorClient, params);
  await runGate(failOpenClient, params);

  for (const captures of [allowCaptures, denyCaptures, errorCaptures, failOpenCaptures]) {
    for (const capture of captures) {
      const outcome = recorded(recorded(capture)["metadata"])["outcome"];
      assert.notEqual(outcome, "success");
      assert.notEqual(outcome, "error");
    }
  }
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

test("set correlationId is included on the guard call", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  await runGate(client, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
  });

  assert.equal(recorded(guardCalls[0])["correlationId"], "corr-123");
});

test("guard is always called, including when rules is undefined or empty", async () => {
  const { client: a, guardCalls: callsA } = stubClient(decisionAllow());
  const { client: b, guardCalls: callsB } = stubClient(decisionAllow());

  await runGate(a, {
    action: "test.action",
    rules: undefined,
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
  });
  await runGate(b, {
    action: "test.action",
    rules: [],
    correlationId: "corr-123",
    metadata: {},
    onAllow: () => "allowed",
    onDeny: () => "denied",
    onUnavailable: () => "unavailable",
  });

  assert.deepEqual(recorded(callsA[0])["rules"], []);
  assert.deepEqual(recorded(callsB[0])["rules"], []);
});

test("metadata is not mutated", async () => {
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
  });

  assert.equal(result, "unavailable");
  assert.equal(onUnavailableCalled, true);
});

test("onGuardError allow + threw → onAllow", async () => {
  const { client, captureCalls } = stubClient(new Error("boom"));
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
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "allowed");
});

test("onGuardError allow + failed-open → onAllow", async () => {
  const { client, captureCalls } = stubClient(decisionFailOpenAllow());
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
  assert.equal(recorded(recorded(captureCalls[0])["metadata"])["outcome"], "allowed");
});

test("capture() throw does not reject runGate", async () => {
  const { client } = stubClient(decisionAllow());
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
  });

  assert.equal(result, "allowed");
});

test("warns on threw / failed-open when ARCJET_LOG_LEVEL asks for warnings", async () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const { client: threwDeny } = stubClient(new Error("boom"));
    await runGate(threwDeny, {
      action: "warn.threw-deny",
      rules: undefined,
      correlationId: undefined,
      metadata: {},
      onAllow: () => "allowed",
      onDeny: () => "denied",
      onUnavailable: () => "unavailable",
    });

    const { client: threwAllow } = stubClient(new Error("boom"));
    await runGate(threwAllow, {
      action: "warn.threw-allow",
      rules: undefined,
      correlationId: undefined,
      metadata: {},
      onAllow: () => "allowed",
      onDeny: () => "denied",
      onUnavailable: () => "unavailable",
      onGuardError: "allow",
    });

    const { client: failClosed } = stubClient(decisionFailOpenAllow());
    await runGate(failClosed, {
      action: "warn.failed-open-deny",
      rules: undefined,
      correlationId: undefined,
      metadata: {},
      onAllow: () => "allowed",
      onDeny: () => "denied",
      onUnavailable: () => "unavailable",
    });

    const { client: failOpen } = stubClient(decisionFailOpenAllow());
    await runGate(failOpen, {
      action: "warn.failed-open-allow",
      rules: undefined,
      correlationId: undefined,
      metadata: {},
      onAllow: () => "allowed",
      onDeny: () => "denied",
      onUnavailable: () => "unavailable",
      onGuardError: "allow",
    });

    assert.ok(warnings.length >= 4);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});
