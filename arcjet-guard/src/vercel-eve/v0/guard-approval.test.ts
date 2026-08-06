// oxlint-disable eslint/no-unsafe-type-assertion, eslint/no-unsafe-member-access, eslint/no-unsafe-assignment, eslint/no-unsafe-argument, eslint/no-unsafe-call, eslint/strict-boolean-expressions, eslint/explicit-function-return-type, eslint/no-unnecessary-type-assertion -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApprovalContext } from "eve/tools";
import {
  decisionAllow,
  decisionDenyPromptInjection,
  decisionDenyPromptInjectionWithReset,
  decisionDenyRateLimit,
  fakeRule,
  stubClient,
} from "../../../test/_shared/stub-client.ts";
import { recorded } from "../../../test/_shared/source-scan.ts";
import { eveAgentContext } from "./context.ts";
import { guardApproval } from "./guard-approval.ts";

// Factory for creating approval contexts with overrides
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
function createApprovalContext(overrides?: Partial<ApprovalContext>): ApprovalContext {
  // oxlint-disable-next-line typescript/no-explicit-any -- test infrastructure for mock SessionContext
  const mockSessionContext: any = {
    session: {
      id: "ses_123",
      auth: { current: { principalId: "user_456" }, initiator: null },
      turn: { id: "turn_789", sequence: 1 },
    },
    getSandbox: () => null,
    getSkill: () => null,
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument -- test infrastructure
  const derivedContext = eveAgentContext(mockSessionContext);

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  return {
    ...derivedContext,
    approvedTools: new Set(),
    callId: "call_abc",
    toolName: "test.tool",
    session: mockSessionContext.session,
    getSandbox: mockSessionContext.getSandbox,
    getSkill: mockSessionContext.getSkill,
    ...overrides,
  } as any as ApprovalContext;
}

test("AC4.1: ALLOW → default resolved value is exactly 'not-applicable'", async () => {
  const { client } = stubClient(decisionAllow());
  const approval = guardApproval(client, { action: "resource.read" });

  const ctx = createApprovalContext();
  const result = await approval(ctx);

  assert.strictEqual(result, "not-applicable");
});

test("AC4.2: ALLOW with onAllow: 'user-approval' → resolved value is 'user-approval'", async () => {
  const { client } = stubClient(decisionAllow());
  const approval = guardApproval(client, {
    action: "resource.read",
    onAllow: "user-approval",
  });

  const ctx = createApprovalContext();
  const result = await approval(ctx);

  assert.strictEqual(result, "user-approval");
});

test("AC4.3: DENY with rate limit → denies with retry-after reason", async () => {
  const { client } = stubClient(decisionDenyRateLimit(1693526400));
  const approval = guardApproval(client, { action: "resource.read" });

  const ctx = createApprovalContext();
  const result = await approval(ctx);

  assert.ok(typeof result === "object" && result !== null);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- test infrastructure
  assert.equal((result as any).type, "denied");
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- test infrastructure
  assert.ok((result as any).reason?.includes("RATE_LIMIT"));
  assert.ok((result as any).reason?.includes("seconds"));
});

test("AC4.3: DENY with prompt injection → denies with no retry-after", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  const approval = guardApproval(client, { action: "resource.read" });

  const ctx = createApprovalContext();
  const result = await approval(ctx);

  assert.ok(typeof result === "object" && result !== null);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- test infrastructure
  assert.equal((result as any).type, "denied");
  assert.ok((result as any).reason?.includes("PROMPT_INJECTION"));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- test infrastructure
  assert.ok(!(result as any).reason?.includes("seconds"));
});

test("AC4.3: DENY with prompt injection even with co-occurring reset → no retry-after", async () => {
  const { client } = stubClient(decisionDenyPromptInjectionWithReset(1693526400));
  const approval = guardApproval(client, { action: "resource.read" });

  const ctx = createApprovalContext();
  const result = await approval(ctx);

  assert.ok(typeof result === "object" && result !== null);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- test infrastructure
  assert.equal((result as any).type, "denied");
  assert.ok((result as any).reason?.includes("PROMPT_INJECTION"));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- test infrastructure
  assert.ok(!(result as any).reason?.includes("seconds"));
});

test("AC4.4: guard call includes label, rules, correlationId, and merged metadata", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const approval = guardApproval(client, {
    action: "resource.created",
    metadata: { policy: "value" },
  });

  const ctx = createApprovalContext();
  await approval(ctx);

  assert.equal(guardCalls.length, 1);
  const call = recorded(guardCalls[0]);
  assert.equal(call.label, "resource.created");
  assert.ok(Array.isArray(call.rules));
  // correlationId is derived from the session, so it should be present
  assert.ok(call.correlationId);
  const metadata = recorded(call.metadata);
  assert.ok(metadata["eve.tool"]);
  assert.ok(metadata["eve.call"]);
  assert.ok(metadata["eve.session"]);
  assert.equal(metadata["policy"], "value");
});

test("AC4.5: rules function receives ApprovalContext and its output reaches guard", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const approval = guardApproval(client, {
    action: "resource.read",
    rules: (ctx) => {
      assert.ok(ctx.toolInput);
      assert.ok(ctx.session);
      return [fakeRule];
    },
  });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-explicit-any -- test infrastructure
  const ctx = createApprovalContext({ toolInput: { id: "123" } } as any);
  await approval(ctx);

  const call = recorded(guardCalls[0]);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const rules = call.rules as Array<{ type: string }>;
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0], fakeRule);
});

test("AC4.7: with onGuardError: allow, both signals resolve to 'not-applicable', warning matches /fail(ing|ed) open/", async () => {
  const oldLogLevel = process.env.ARCJET_LOG_LEVEL;
  process.env.ARCJET_LOG_LEVEL = "warn";
  const originalWarn = console.warn;
  const warnings: Array<{ format: string; args: unknown[] }> = [];
  // oxlint-disable-next-line typescript/no-explicit-any -- test infrastructure
  console.warn = (format: string, ...args: any[]) => {
    warnings.push({ format, args });
  };

  try {
    const { client } = stubClient(new Error("boom"));
    const approval = guardApproval(client, {
      action: "resource.read",
      onGuardError: "allow",
    });

    const ctx = createApprovalContext();
    const result = await approval(ctx);

    assert.strictEqual(result, "not-applicable");
    const failOpenWarning = warnings.find((w) => /fail(ing|ed) open/.test(w.format));
    assert.ok(failOpenWarning, `Expected a fail(ing|ed) open warning, got: ${warnings.map((w) => w.format).join(", ")}`);
  } finally {
    console.warn = originalWarn;
    if (oldLogLevel === undefined) {
      delete process.env.ARCJET_LOG_LEVEL;
    } else {
      process.env.ARCJET_LOG_LEVEL = oldLogLevel;
    }
  }
});

test("AC4.7: with default onGuardError: deny, unavailable warning does NOT match /fail(ing|ed) open/", async () => {
  const oldLogLevel = process.env.ARCJET_LOG_LEVEL;
  process.env.ARCJET_LOG_LEVEL = "warn";
  const originalWarn = console.warn;
  const warnings: Array<{ format: string; args: unknown[] }> = [];
  // oxlint-disable-next-line typescript/no-explicit-any -- test infrastructure
  console.warn = (format: string, ...args: any[]) => {
    warnings.push({ format, args });
  };

  try {
    const { client } = stubClient(new Error("boom"));
    const approval = guardApproval(client, {
      action: "resource.read",
      onGuardError: "deny",
    });

    const ctx = createApprovalContext();
    const result = await approval(ctx);

    assert.ok(typeof result === "object" && result !== null);
    assert.equal((result as any).type, "denied");
    const denialWarning = warnings.find((w) => w.args.includes("resource.read"));
    assert.ok(denialWarning, `Expected a warning with "resource.read" action, got: ${warnings.map((w) => w.format).join(", ")}`);
    assert.ok(!/fail(ing|ed) open/.test(denialWarning.format), `Warning should NOT match /fail(ing|ed) open/, got: ${denialWarning.format}`);
  } finally {
    console.warn = originalWarn;
    if (oldLogLevel === undefined) {
      delete process.env.ARCJET_LOG_LEVEL;
    } else {
      process.env.ARCJET_LOG_LEVEL = oldLogLevel;
    }
  }
});

test("AC4.8: capture carries eve.phase: 'approval' on all outcomes", async () => {
  const { client: allowClient, captureCalls: allowCaptures } = stubClient(decisionAllow());
  const { client: denyClient, captureCalls: denyCaptures } = stubClient(
    decisionDenyPromptInjection(),
  );

  const allowApproval = guardApproval(allowClient, { action: "resource.read" });
  const denyApproval = guardApproval(denyClient, { action: "resource.read" });

  const ctx = createApprovalContext();

  await allowApproval(ctx);
  await denyApproval(ctx);

  for (const captures of [allowCaptures, denyCaptures]) {
    assert.equal(captures.length, 1);
    const capture = recorded(captures[0]);
    const metadata = recorded(capture.metadata);
    assert.equal(metadata["eve.phase"], "approval");
  }
});

test("AC4.9: callback throwing rules → deny unavailable, not throw", async () => {
  const { client } = stubClient(decisionAllow());
  const approval = guardApproval(client, {
    action: "resource.read",
    rules: () => {
      throw new Error("rule computation failed");
    },
    onGuardError: "deny",
  });

  const ctx = createApprovalContext();
  const result = await approval(ctx);

  assert.ok(typeof result === "object" && result !== null);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- test infrastructure
  assert.equal((result as any).type, "denied");
});

test("AC4.9: callback throwing metadata → deny unavailable, not throw", async () => {
  const { client } = stubClient(decisionAllow());
  const approval = guardApproval(client, {
    action: "resource.read",
    metadata: () => {
      throw new Error("metadata computation failed");
    },
    onGuardError: "deny",
  });

  const ctx = createApprovalContext();
  const result = await approval(ctx);

  assert.ok(typeof result === "object" && result !== null);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unsafe-member-access -- test infrastructure
  assert.equal((result as any).type, "denied");
});

test("AC4.10: onDeny receives DecisionDeny and its return value resolves", async () => {
  const { client } = stubClient(decisionDenyPromptInjection());
  let onDenyCalled = false;
  const approval = guardApproval(client, {
    action: "resource.read",
    onDeny: (decision) => {
      onDenyCalled = true;
      assert.equal(decision.conclusion, "DENY");
      return { type: "denied", reason: "custom: " + decision.reason };
    },
  });

  const ctx = createApprovalContext();
  const result = await approval(ctx);

  assert.ok(onDenyCalled);
  assert.ok(typeof result === "object" && result !== null);
  assert.equal((result as any).reason, "custom: PROMPT_INJECTION");
});

test("AC4.10: onDeny is NOT called on unavailable signals", async () => {
  const { client } = stubClient(new Error("boom"));
  let onDenyCalled = false;
  const approval = guardApproval(client, {
    action: "resource.read",
    onGuardError: "deny",
    onDeny: () => {
      onDenyCalled = true;
      return { type: "denied", reason: "should not see this" };
    },
  });

  const ctx = createApprovalContext();
  await approval(ctx);

  assert.equal(onDenyCalled, false);
});

test("metadata merge order: derived ← policy ← per-call function", async () => {
  const { client, guardCalls } = stubClient(decisionAllow());
  const approval = guardApproval(client, {
    action: "resource.read",
    metadata: { shared: "from-policy", policy: "value" },
  });

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test infrastructure
  const ctx = createApprovalContext({
    session: {
      id: "ses_123",
      auth: { current: { principalId: "user_456" }, initiator: null },
      turn: { id: "turn_789", sequence: 1 },
    },
  } as unknown as ApprovalContext);

  await approval(ctx);

  const call = recorded(guardCalls[0]);
  const metadata = recorded(call.metadata);
  // eve.* keys from derived context
  assert.ok(typeof metadata["eve.session"] === "string");
  // policy metadata overrides/adds
  assert.equal(metadata["policy"], "value");
  // shared key should have policy value (policy wins over derived)
  assert.equal(metadata["shared"], "from-policy");
});
