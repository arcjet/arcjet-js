// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { strandsAgentContext } from "./context.ts";

test("prefers invocationState.correlationId over sessionId over requestId", () => {
  const result = strandsAgentContext({
    invocationState: {
      correlationId: "corr-1",
      sessionId: "sess-1",
      requestId: "req-1",
    },
  });

  assert.equal(result.correlationId, "corr-1");
  assert.equal(result.metadata?.["strands.session"], "sess-1");
  assert.equal(result.metadata?.["strands.request"], "req-1");
});

test("falls back to invocationState.sessionId when correlationId is absent", () => {
  const result = strandsAgentContext({
    invocationState: { sessionId: "sess-1", requestId: "req-1" },
  });

  assert.equal(result.correlationId, "sess-1");
  assert.equal(result.metadata?.["strands.session"], "sess-1");
  assert.equal(result.metadata?.["strands.request"], "req-1");
});

test("falls back to invocationState.requestId when sessionId is absent", () => {
  const result = strandsAgentContext({
    invocationState: { requestId: "req-only" },
  });

  assert.equal(result.correlationId, "req-only");
  assert.equal(result.metadata?.["strands.request"], "req-only");
});

test("accepts a bare invocationState bag", () => {
  const result = strandsAgentContext({ sessionId: "direct-sess" });
  assert.equal(result.correlationId, "direct-sess");
  assert.equal(result.metadata?.["strands.session"], "direct-sess");
});

test("reads documented envelope copies when the bag has no id", () => {
  const result = strandsAgentContext({
    invocationState: { user: "alice" },
    sessionId: "sess-env",
    requestId: "req-env",
  });

  assert.equal(result.correlationId, "sess-env");
  assert.equal(result.metadata?.["strands.session"], "sess-env");
  assert.equal(result.metadata?.["strands.request"], "req-env");
});

test("init.sessionId is a last-resort caller-owned fallback", () => {
  const result = strandsAgentContext({ invocationState: { user: "alice" } }, { sessionId: "policy-sess" });
  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["strands.session"], "policy-sess");
});

test("never mints an id when nothing valid is present", () => {
  const result = strandsAgentContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = strandsAgentContext({ invocationState: { sessionId: "" } });

  assert.equal(result.correlationId, undefined);
  assert.equal("strands.session" in (result.metadata ?? {}), false);
});

test("skips an invalid invocationState session id and uses the next candidate", () => {
  const result = strandsAgentContext({
    invocationState: { sessionId: "" },
    requestId: "req-ok",
  });

  assert.equal(result.correlationId, "req-ok");
});

test("rejects a session id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = strandsAgentContext({ invocationState: { sessionId: longId } });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["strands.session"], longId);
});

test("never reads traceId, even when it is the only string present", () => {
  const result = strandsAgentContext({
    invocationState: { traceId: "trace-minted-by-sdk" },
  });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("never reads agent.id from an envelope that carries an agent", () => {
  const result = strandsAgentContext({
    invocationState: {},
    ...({ agent: { id: "agent-uuid" } } as Record<string, unknown>),
  });

  assert.equal(result.correlationId, undefined);
});

test("does not call SessionManager or getSessionId", () => {
  let called = 0;
  const result = strandsAgentContext({
    ...({
      sessionManager: {
        getSessionId: () => {
          called += 1;
          return "minted-or-async";
        },
      },
    } as Record<string, unknown>),
  });

  assert.equal(called, 0);
  assert.equal(result.correlationId, undefined);
});

test("a null invocationState does not throw and does not mint", () => {
  const result = strandsAgentContext({ invocationState: null });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("caller metadata overrides derived keys", () => {
  const result = strandsAgentContext(
    { invocationState: { sessionId: "sess-1" } },
    { metadata: { "strands.session": "override" } },
  );

  assert.equal(result.metadata?.["strands.session"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = strandsAgentContext({
    invocationState: { sessionId: "sess-1", requestId: "req-1" },
  });

  assert.ok(result.metadata);
  const validKeyPattern = /^[A-Za-z0-9._-]+$/;
  for (const key of Object.keys(result.metadata)) {
    assert.ok(
      validKeyPattern.test(key),
      `derived key "${key}" must match the metadata character class`,
    );
  }
});

test("encoder round-trip produces no AJ1017 warnings", () => {
  const result = strandsAgentContext({
    invocationState: { sessionId: "sess-1", requestId: "req-1" },
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["strands.session"]);
  assert.ok(metadataJson["strands.request"]);
});

test("undefined source does not throw and does not mint", () => {
  const result = strandsAgentContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in strandsAgentContext(null as never), false);
  assert.equal("correlationId" in strandsAgentContext("sess" as never), false);
  assert.equal("correlationId" in strandsAgentContext(12 as never), false);
});

test("non-string candidates are skipped", () => {
  const result = strandsAgentContext({
    invocationState: { sessionId: 99, requestId: { id: "nope" } },
  });
  assert.equal(result.correlationId, undefined);
});

test("non-printable session id is rejected and does not mint", () => {
  const result = strandsAgentContext({ invocationState: { sessionId: "bad\nid" } });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["strands.session"], "bad\nid");
});

test("warns when every candidate is invalid and ARCJET_LOG_LEVEL asks for warnings", () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "info";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    strandsAgentContext({ invocationState: { sessionId: "" } });
    assert.ok(warnings.length > 0);
    assert.match(String(warnings[0]?.[0]), /rejected/);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});

test("does not warn when a later candidate is valid", () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "warn";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    const result = strandsAgentContext({
      invocationState: { sessionId: "" },
      requestId: "req-ok",
    });
    assert.equal(result.correlationId, "req-ok");
    assert.equal(warnings.length, 0);
  } finally {
    console.warn = originalWarn;
    if (previous === undefined) {
      delete process.env["ARCJET_LOG_LEVEL"];
    } else {
      process.env["ARCJET_LOG_LEVEL"] = previous;
    }
  }
});
