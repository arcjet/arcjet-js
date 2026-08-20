// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { genkitContext } from "./context.ts";

test("prefers a field the integrator put on generate context", () => {
  const result = genkitContext({
    context: { sessionId: "sess-app", conversationId: "conv-app", flowId: "flow-app" },
    sessionId: "sess-envelope",
    conversationId: "conv-envelope",
  });

  assert.equal(result.correlationId, "sess-app");
  assert.equal(result.metadata?.["genkit.session"], "sess-app");
  assert.equal(result.metadata?.["genkit.conversation"], "conv-app");
  assert.equal(result.metadata?.["genkit.flow"], "flow-app");
});

test("prefers context.correlationId over context.sessionId", () => {
  const result = genkitContext({
    context: { correlationId: "corr-1", sessionId: "sess-1" },
  });

  assert.equal(result.correlationId, "corr-1");
  assert.equal(result.metadata?.["genkit.session"], "sess-1");
});

test("falls back to context.conversationId when sessionId is absent", () => {
  const result = genkitContext({
    context: { conversationId: "conv-1", flowId: "flow-1" },
  });

  assert.equal(result.correlationId, "conv-1");
  assert.equal(result.metadata?.["genkit.conversation"], "conv-1");
  assert.equal(result.metadata?.["genkit.flow"], "flow-1");
});

test("falls back to a caller-owned flowId when session and conversation are absent", () => {
  const result = genkitContext({
    context: { flowId: "flow-only", runId: "run-only" },
  });

  assert.equal(result.correlationId, "flow-only");
  assert.equal(result.metadata?.["genkit.flow"], "flow-only");
  assert.equal(result.metadata?.["genkit.run"], "run-only");
});

test("falls back to a caller-owned runId when flowId is absent", () => {
  const result = genkitContext({
    context: { runId: "run-only" },
  });

  assert.equal(result.correlationId, "run-only");
  assert.equal(result.metadata?.["genkit.run"], "run-only");
});

test("reads documented envelope copies when context has no id", () => {
  const result = genkitContext({
    context: { user: "alice" },
    conversationId: "conv-opt",
    flowId: "flow-env",
  });

  assert.equal(result.correlationId, "conv-opt");
  assert.equal(result.metadata?.["genkit.conversation"], "conv-opt");
  assert.equal(result.metadata?.["genkit.flow"], "flow-env");
});

test("accepts a bare ActionContext object", () => {
  const result = genkitContext({ sessionId: "direct-sess" });
  assert.equal(result.correlationId, "direct-sess");
  assert.equal(result.metadata?.["genkit.session"], "direct-sess");
});

test("accepts a tool-handler envelope { context, interrupt, resumed } and ignores interrupt/resumed", () => {
  const result = genkitContext({
    context: { sessionId: "from-handler" },
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting we do not read these as correlation
    ...({ interrupt: () => "nope", resumed: { status: "APPROVED" } } as Record<string, unknown>),
  });

  assert.equal(result.correlationId, "from-handler");
});

test("init.sessionId is a last-resort caller-owned fallback", () => {
  const result = genkitContext({ context: { user: "alice" } }, { sessionId: "policy-sess" });
  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["genkit.session"], "policy-sess");
});

test("never mints an id when nothing valid is present", () => {
  const result = genkitContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = genkitContext({ context: { sessionId: "" } });

  assert.equal(result.correlationId, undefined);
  assert.equal("genkit.session" in (result.metadata ?? {}), false);
});

test("skips an invalid context session id and uses the next candidate", () => {
  const result = genkitContext({
    context: { sessionId: "" },
    conversationId: "conv-ok",
  });

  assert.equal(result.correlationId, "conv-ok");
});

test("rejects a session id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = genkitContext({ context: { sessionId: longId } });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["genkit.session"], longId);
});

test("never reads traceId, even when it is the only string present", () => {
  const result = genkitContext({
    context: { traceId: "trace-minted-by-sdk" },
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting we do not invent a traceId field on the source
    ...({ traceId: "envelope-trace" } as Record<string, unknown>),
  });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("does not call getSessionId on a session-shaped object", () => {
  let called = 0;
  const result = genkitContext({
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- session is not a documented source field
    ...({
      session: {
        getSessionId: () => {
          called += 1;
          return "minted-or-async";
        },
        sessionId: "minted-uuid",
      },
    } as Record<string, unknown>),
  });

  assert.equal(called, 0);
  assert.equal(result.correlationId, undefined);
});

test("a null context does not throw and does not mint", () => {
  const result = genkitContext({ context: null });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("caller metadata overrides derived keys", () => {
  const result = genkitContext(
    { context: { sessionId: "sess-1" } },
    { metadata: { "genkit.session": "override" } },
  );

  assert.equal(result.metadata?.["genkit.session"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = genkitContext({
    context: { sessionId: "sess-1", conversationId: "conv-1", flowId: "flow-1", runId: "run-1" },
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
  const result = genkitContext({
    context: { sessionId: "sess-1", conversationId: "conv-1", flowId: "flow-1", runId: "run-1" },
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["genkit.session"]);
  assert.ok(metadataJson["genkit.conversation"]);
  assert.ok(metadataJson["genkit.flow"]);
  assert.ok(metadataJson["genkit.run"]);
});

test("undefined source does not throw and does not mint", () => {
  const result = genkitContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in genkitContext(null as never), false);
  assert.equal("correlationId" in genkitContext("sess" as never), false);
  assert.equal("correlationId" in genkitContext(12 as never), false);
});

test("non-string candidates are skipped", () => {
  const result = genkitContext({
    context: { sessionId: 99, conversationId: { id: "nope" } },
  });
  assert.equal(result.correlationId, undefined);
});

test("non-printable session id is rejected and does not mint", () => {
  const result = genkitContext({ context: { sessionId: "bad\nid" } });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["genkit.session"], "bad\nid");
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
    genkitContext({ context: { sessionId: "" } });
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
    const result = genkitContext({
      context: { sessionId: "" },
      conversationId: "conv-ok",
    });
    assert.equal(result.correlationId, "conv-ok");
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
