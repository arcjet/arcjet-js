import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { eveAgentContext } from "./context.ts";

// Mock SessionContext type for testing (avoiding Eve import in tests)
interface MockSessionContext {
  readonly session: {
    readonly id: string;
    readonly auth: {
      readonly current: { readonly principalId: string } | null;
      readonly initiator: null;
    };
    readonly turn: {
      readonly id: string;
      readonly sequence: number;
    };
    readonly parent?: {
      readonly callId: string;
      readonly rootSessionId: string;
      readonly sessionId: string;
      readonly turn: { readonly id: string; readonly sequence: number };
    };
  };
}

test("AC3.1: root session correlates to its own id", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_root_12345",
      auth: { current: null, initiator: null },
      turn: { id: "turn_123", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  assert.equal(result.correlationId, "ses_root_12345");
});

test("AC3.2: delegated session correlates to root, not to self", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_mid_99999",
      auth: { current: null, initiator: null },
      turn: { id: "turn_456", sequence: 1 },
      parent: {
        callId: "call_123",
        rootSessionId: "ses_root_xxxxx",
        sessionId: "ses_mid_99999",
        turn: { id: "turn_parent", sequence: 0 },
      },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  assert.equal(result.correlationId, "ses_root_xxxxx");
  assert.notEqual(result.correlationId, "ses_mid_99999");
});

test("AC3.3a: rejects empty session id, generates ULID, records in metadata", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "",
      auth: { current: null, initiator: null },
      turn: { id: "turn_123", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  // Should have generated a ULID (26 Crockford base32 chars)
  assert.match(result.correlationId, /^[0-9A-HJKMNP-TV-Z]{26}$/);

  // Should record the rejected value in metadata
  assert.ok(result.metadata);
  assert.equal(result.metadata["eve.session"], "");
});

test("AC3.3b: rejects session id over 256 chars, generates ULID, records in metadata", () => {
  const longId = "x".repeat(257);
  const ctx: MockSessionContext = {
    session: {
      id: longId,
      auth: { current: null, initiator: null },
      turn: { id: "turn_123", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  // Should have generated a ULID
  assert.match(result.correlationId, /^[0-9A-HJKMNP-TV-Z]{26}$/);

  // Should record the rejected value
  assert.ok(result.metadata);
  assert.equal(result.metadata["eve.session"], longId);
});

test("AC3.3c: rejects session id containing non-printable chars, generates ULID, records in metadata", () => {
  // Use a NUL character (0x00) embedded in an otherwise-valid id
  const badId = `ses_${String.fromCodePoint(0)}_abc`;
  const ctx: MockSessionContext = {
    session: {
      id: badId,
      auth: { current: null, initiator: null },
      turn: { id: "turn_123", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  // Should have generated a ULID
  assert.match(result.correlationId, /^[0-9A-HJKMNP-TV-Z]{26}$/);

  // Should record the rejected value
  assert.ok(result.metadata);
  assert.equal(result.metadata["eve.session"], badId);
});

test("AC3.3: warning fires with ARCJET_LOG_LEVEL=warn", () => {
  const oldEnv = process.env.ARCJET_LOG_LEVEL;
  try {
    process.env.ARCJET_LOG_LEVEL = "warn";

    const consoleWarnCalls: string[] = [];
    const originalWarn = console.warn;
    // oxlint-disable-next-line typescript/no-explicit-any -- test infrastructure
    console.warn = (msg: any): void => {
      // oxlint-disable-next-line typescript/no-unsafe-argument -- test infrastructure
      consoleWarnCalls.push(msg);
    };

    try {
      const ctx: MockSessionContext = {
        session: {
          id: "",
          auth: { current: null, initiator: null },
          turn: { id: "turn_123", sequence: 1 },
        },
      };

      // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
      eveAgentContext(ctx as any);

      assert.ok(consoleWarnCalls.length > 0, "Should warn when ARCJET_LOG_LEVEL=warn");
    } finally {
      console.warn = originalWarn;
    }
  } finally {
    if (oldEnv === undefined) {
      delete process.env.ARCJET_LOG_LEVEL;
    } else {
      process.env.ARCJET_LOG_LEVEL = oldEnv;
    }
  }
});

test("AC3.3: no warning without ARCJET_LOG_LEVEL", () => {
  const oldEnv = process.env.ARCJET_LOG_LEVEL;
  try {
    delete process.env.ARCJET_LOG_LEVEL;

    const consoleWarnCalls: string[] = [];
    const originalWarn = console.warn;
    // oxlint-disable-next-line typescript/no-explicit-any -- test infrastructure
    console.warn = (msg: any): void => {
      // oxlint-disable-next-line typescript/no-unsafe-argument -- test infrastructure
      consoleWarnCalls.push(msg);
    };

    try {
      const ctx: MockSessionContext = {
        session: {
          id: "",
          auth: { current: null, initiator: null },
          turn: { id: "turn_123", sequence: 1 },
        },
      };

      // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
      eveAgentContext(ctx as any);

      assert.equal(consoleWarnCalls.length, 0, "Should not warn when ARCJET_LOG_LEVEL unset");
    } finally {
      console.warn = originalWarn;
    }
  } finally {
    if (oldEnv === undefined) {
      delete process.env.ARCJET_LOG_LEVEL;
    } else {
      process.env.ARCJET_LOG_LEVEL = oldEnv;
    }
  }
});

test("AC3.4: user metadata from current principal", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_123",
      auth: {
        current: { principalId: "user_456" },
        initiator: null,
      },
      turn: { id: "turn_123", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  assert.ok(result.metadata);
  assert.equal(result.metadata.user, "user_456");
});

test("AC3.4: user omitted when auth.current is null", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_123",
      auth: { current: null, initiator: null },
      turn: { id: "turn_123", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  // Metadata must be defined (eve.session is always present)
  assert.ok(result.metadata);
  // Must use 'in' operator, not === undefined, per AC3.4
  assert.equal("user" in result.metadata, false);
});

test("AC3.5: eve.session always included", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_abc",
      auth: { current: null, initiator: null },
      turn: { id: "turn_xyz", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  assert.ok(result.metadata);
  assert.equal(result.metadata["eve.session"], "ses_abc");
});

test("AC3.5: eve.turn included", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_abc",
      auth: { current: null, initiator: null },
      turn: { id: "turn_xyz", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  assert.ok(result.metadata);
  assert.equal(result.metadata["eve.turn"], "turn_xyz");
});

test("AC3.5: eve.turn omitted when turn is absent", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_abc",
      auth: { current: null, initiator: null },
      turn: { id: "", sequence: 1 }, // empty turn id
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  assert.ok(result.metadata);
  assert.ok(!("eve.turn" in result.metadata), "eve.turn should be omitted when id is empty");
});

test("AC3.5: eve.parent-session only for delegated sessions", () => {
  const rootCtx: MockSessionContext = {
    session: {
      id: "ses_root",
      auth: { current: null, initiator: null },
      turn: { id: "turn_1", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const resultRoot = eveAgentContext(rootCtx as any);
  assert.ok(!resultRoot.metadata || !("eve.parent-session" in resultRoot.metadata));

  const delegatedCtx: MockSessionContext = {
    session: {
      id: "ses_mid",
      auth: { current: null, initiator: null },
      turn: { id: "turn_2", sequence: 1 },
      parent: {
        callId: "call_123",
        rootSessionId: "ses_root",
        sessionId: "ses_parent",
        turn: { id: "turn_parent", sequence: 0 },
      },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const resultDelegated = eveAgentContext(delegatedCtx as any);
  assert.ok(resultDelegated.metadata);
  assert.equal(resultDelegated.metadata["eve.parent-session"], "ses_parent");
});

test("AC3.5: caller metadata overrides derived keys", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_abc",
      auth: { current: null, initiator: null },
      turn: { id: "turn_xyz", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any, {
    metadata: { "eve.turn": "override_turn" },
  });

  assert.ok(result.metadata);
  assert.equal(result.metadata["eve.turn"], "override_turn");
});

test("AC3.5: metadata with eve.session always included", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_abc",
      auth: { current: null, initiator: null },
      turn: { id: "turn_xyz", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  // Metadata should be present (has eve.session key)
  assert.ok(result.metadata);
  assert.ok("eve.session" in result.metadata);
});

test("AC3.6: derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  // Collect derived keys from three shapes so any future additions are covered
  const collectedDerivedKeys = new Set<string>();

  // Test root session
  const rootCtx: MockSessionContext = {
    session: {
      id: "ses_root",
      auth: { current: { principalId: "user_123" }, initiator: null },
      turn: { id: "turn_1", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const rootResult = eveAgentContext(rootCtx as any);
  collectDerivedKeys(rootResult.metadata, collectedDerivedKeys);

  // Test delegated session
  const delegatedCtx: MockSessionContext = {
    session: {
      id: "ses_mid",
      auth: { current: { principalId: "user_456" }, initiator: null },
      turn: { id: "turn_2", sequence: 1 },
      parent: {
        callId: "call_123",
        rootSessionId: "ses_root",
        sessionId: "ses_parent",
        turn: { id: "turn_parent", sequence: 0 },
      },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const delegatedResult = eveAgentContext(delegatedCtx as any);
  collectDerivedKeys(delegatedResult.metadata, collectedDerivedKeys);

  // Test with null auth
  const nullAuthCtx: MockSessionContext = {
    session: {
      id: "ses_abc",
      auth: { current: null, initiator: null },
      turn: { id: "turn_xyz", sequence: 1 },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const nullAuthResult = eveAgentContext(nullAuthCtx as any);
  collectDerivedKeys(nullAuthResult.metadata, collectedDerivedKeys);

  // Per AC3.6: derived keys must match /^[A-Za-z0-9._-]+$/
  // This is the load-bearing character-class assertion.
  const validKeyPattern = /^[A-Za-z0-9._-]+$/;

  for (const key of collectedDerivedKeys) {
    assert.ok(
      validKeyPattern.test(key),
      `Derived key "${key}" must match /^[A-Za-z0-9._-]+$/ (from README Metadata section)`,
    );
  }
});

function collectDerivedKeys(
  metadata: Record<string, unknown> | undefined,
  keys: Set<string>,
): void {
  if (!metadata) return;

  for (const key of Object.keys(metadata)) {
    // Collect all keys unconditionally. The three eveAgentContext shapes
    // (root session, delegated session, auth.current null) produce only derived keys,
    // and every key in each returned metadata is derived by construction.
    keys.add(key);
  }
}

test("AC3.6: encoder round-trip with no AJ1017 warnings (smoke test)", () => {
  const ctx: MockSessionContext = {
    session: {
      id: "ses_root",
      auth: { current: { principalId: "user_789" }, initiator: null },
      turn: { id: "turn_1", sequence: 1 },
      parent: {
        callId: "call_123",
        rootSessionId: "ses_root_xxx",
        sessionId: "ses_parent",
        turn: { id: "turn_parent", sequence: 0 },
      },
    },
  };

  // oxlint-disable-next-line typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const result = eveAgentContext(ctx as any);

  // Metadata must be defined (has derived keys)
  assert.ok(result.metadata);

  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);

  // Smoke test: no AJ1017 warnings for derived keys. This cannot fail on a key name
  // and is here to catch an unrepresentable value (a BigInt or non-finite number
  // arriving through init.metadata), not to validate names. The character-class
  // assertion above is the load-bearing half.
  assert.equal(
    localWarnings.length,
    0,
    "Encoder round-trip should produce no warnings for derived metadata",
  );

  // All derived keys should survive the round-trip
  assert.ok(metadataJson["eve.session"]);
  assert.ok(metadataJson["eve.turn"]);
  assert.ok(metadataJson["eve.parent-session"]);
  assert.ok(metadataJson.user);
});

test("missing session falls back to generated ULID without throwing", () => {
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-argument, typescript/no-unsafe-type-assertion -- testing with structural mock
  const ctx = {
    // Missing session property entirely
  } as any;

  // oxlint-disable-next-line typescript/no-unsafe-argument -- testing with structural mock
  const result = eveAgentContext(ctx);

  // Should generate a ULID, not throw
  assert.match(result.correlationId, /^[0-9A-HJKMNP-TV-Z]{26}$/);
  // Metadata should be omitted (no derived keys produced)
  assert.equal(result.metadata, undefined);
});
