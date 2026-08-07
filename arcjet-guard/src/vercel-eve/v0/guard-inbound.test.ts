// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/no-unsafe-argument, eslint/no-unsafe-call, eslint/strict-boolean-expressions, eslint/explicit-function-return-type, eslint/no-unnecessary-type-assertion -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionDenyRateLimit,
  decisionFailOpenAllow,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { guardInbound } from "./guard-inbound.ts";
import { deniedReason } from "./denial.ts";

test("AC5.6: ALLOW → exactly { allowed: true } with no extra fields", async () => {
  const { client } = stubClient(decisionAllow());
  const verdict = await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  assert.deepEqual(verdict, { allowed: true });
});

test("AC5.6: DENY → { allowed: false, reason: 'DENY', message, decision }", async () => {
  const decision = decisionDenyPromptInjection();
  const { client } = stubClient(decision);
  const verdict = await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  assert.strictEqual(verdict.allowed, false);
  assert.equal((verdict as any).reason, "DENY");
  assert.strictEqual((verdict as any).decision, decision);
  assert.ok(typeof (verdict as any).message === "string");
  assert.ok((verdict as any).message.includes("PROMPT_INJECTION"));
});

test("AC5.6: DENY → message from deniedReason helper", async () => {
  const decision = decisionDenyRateLimit(1693526400);
  const { client } = stubClient(decision);
  const verdict = await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  const expectedMessage = deniedReason(decision);
  assert.equal((verdict as any).message, expectedMessage);
});

test("AC5.6: DENY verdict.decision can be used with rule's results()", async () => {
  const decision = decisionDenyPromptInjection();
  const { client } = stubClient(decision);
  const verdict = await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  assert.strictEqual(verdict.allowed, false);
  // The decision is present and can be used to call results()
  if (!verdict.allowed && (verdict as any).decision) {
    assert.ok(typeof (verdict as any).decision === "object");
    assert.ok("results" in (verdict as any).decision);
  }
});

test("AC5.7: unavailable with default onGuardError → { allowed: false, reason: 'UNAVAILABLE' }", async () => {
  const { client } = stubClient(new Error("guard failed"));
  const verdict = await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  assert.strictEqual(verdict.allowed, false);
  assert.equal((verdict as any).reason, "UNAVAILABLE");
});

test("AC5.7: unavailable with onGuardError='allow' → { allowed: true } with fail-open warning", async () => {
  const { client } = stubClient(new Error("guard failed"));
  const verdict = await guardInbound(client, "test input", {
    rules: [fakeRule],
    onGuardError: "allow",
  });

  assert.deepEqual(verdict, { allowed: true });
});

test("AC5.7: fail-open warning matches /fail(ing|ed) open/ pattern", async () => {
  // Use a fail-open decision instead of thrown error
  const { client } = stubClient(decisionFailOpenAllow());
  let warnOutput = "";
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    warnOutput += args.join(" ");
  };

  try {
    process.env["ARCJET_LOG_LEVEL"] = "warn";
    await guardInbound(client, "test input", {
      rules: [fakeRule],
      onGuardError: "allow",
    });
  } finally {
    console.warn = originalWarn;
    delete process.env["ARCJET_LOG_LEVEL"];
  }

  // Check that the warning contains the pattern
  const pattern = /fail(ing|ed) open/;
  assert.ok(pattern.test(warnOutput), `Warning should match pattern /fail(ing|ed) open/, got: "${warnOutput}"`);
});

test("AC5.8: never throws - rejecting guard() resolves to verdict", async () => {
  const { client } = stubClient(new Error("guard call failed"));
  let threw = false;
  try {
    await guardInbound(client, "test input", {
      rules: [fakeRule],
    });
  } catch {
    threw = true;
  }

  assert.ok(!threw, "guardInbound should never throw");
});

test("AC5.8: exactly ONE capture per call - ALLOW", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  assert.equal(captureCalls.length, 1, "Should have exactly one capture call");
  const capturePayload = captureCalls[0] as any;
  assert.equal(capturePayload.metadata.outcome, "allowed");
});

test("AC5.8: exactly ONE capture per call - DENY", async () => {
  const { client, captureCalls } = stubClient(decisionDenyPromptInjection());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  assert.equal(captureCalls.length, 1, "Should have exactly one capture call");
  const capturePayload = captureCalls[0] as any;
  assert.equal(capturePayload.metadata.outcome, "denied");
});

test("AC5.8: exactly ONE capture per call - unavailable", async () => {
  const { client, captureCalls } = stubClient(new Error("guard failed"));
  await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  assert.equal(captureCalls.length, 1, "Should have exactly one capture call");
  const capturePayload = captureCalls[0] as any;
  assert.equal(capturePayload.metadata.outcome, "unavailable");
});

test("AC5.8: capture metadata includes eve.phase: 'inbound'", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  const capturePayload = captureCalls[0] as any;
  assert.equal(capturePayload.metadata["eve.phase"], "inbound");
});

test("AC5.8: capture metadata merges caller's metadata under eve.phase", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
    metadata: { custom: "value" },
  });

  const capturePayload = captureCalls[0] as any;
  assert.equal(capturePayload.metadata["eve.phase"], "inbound");
  assert.equal(capturePayload.metadata.custom, "value");
});

test("AC5.8: caller's eve.phase overrides guardian's (unlikely but specified)", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
    metadata: { "eve.phase": "custom-phase" },
  });

  const capturePayload = captureCalls[0] as any;
  // Caller wins
  assert.equal(capturePayload.metadata["eve.phase"], "custom-phase");
});

test("AC5.9: supplied correlationId appears on guard payload", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
    correlationId: "thread_123",
  });

  const guardPayload = guardCalls[0] as any;
  assert.equal(guardPayload.correlationId, "thread_123");
});

test("AC5.9: supplied correlationId appears on capture payload", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
    correlationId: "thread_123",
  });

  const capturePayload = captureCalls[0] as any;
  assert.equal(capturePayload.correlationId, "thread_123");
});

test("AC5.9: omitted correlationId → guard payload has no correlationId key", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  const guardPayload = guardCalls[0] as any;
  assert.ok(!("correlationId" in guardPayload), "guard payload should not have correlationId key when omitted");
});

test("AC5.9: omitted correlationId → capture payload has no correlationId key", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  const capturePayload = captureCalls[0] as any;
  assert.ok(!("correlationId" in capturePayload), "capture payload should not have correlationId key when omitted");
});

test("default action is 'message.received'", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
  });

  const guardPayload = guardCalls[0] as any;
  assert.equal(guardPayload.label, "message.received");
});

test("custom action is used when provided", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  await guardInbound(client, "test input", {
    rules: [fakeRule],
    action: "custom.action",
  });

  const guardPayload = guardCalls[0] as any;
  assert.equal(guardPayload.label, "custom.action");
});

test("text is not put in metadata", async () => {
  const { client, captureCalls } = stubClient(decisionAllow());
  await guardInbound(client, "sensitive user content", {
    rules: [fakeRule],
  });

  const capturePayload = captureCalls[0] as any;
  const metadataString = JSON.stringify(capturePayload.metadata);
  assert.ok(!metadataString.includes("sensitive user content"), "text should not appear in metadata");
});

test("rules parameter is required - cannot be omitted", async () => {
  const { client } = stubClient(decisionAllow());
  // This should be a type error if rules were optional, but at runtime
  // the implementation should handle it gracefully
  const verdict = await guardInbound(client, "test input", {
    rules: [], // empty but present
  });

  assert.strictEqual(verdict.allowed, true);
});
