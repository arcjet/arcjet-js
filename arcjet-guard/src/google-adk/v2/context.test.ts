// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type, typescript/no-unnecessary-type-assertion -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { googleAdkContext } from "./context.ts";

test("prefers a field the integrator put on a nested context bag", () => {
  const result = googleAdkContext({
    context: { sessionId: "sess-app", conversationId: "conv-app" },
    sessionId: "sess-envelope",
    conversationId: "conv-envelope",
  });

  assert.equal(result.correlationId, "sess-app");
  assert.equal(result.metadata?.["google-adk.session"], "sess-app");
  assert.equal(result.metadata?.["google-adk.conversation"], "conv-app");
});

test("prefers context.correlationId over context.sessionId", () => {
  const result = googleAdkContext({
    context: { correlationId: "corr-1", sessionId: "sess-1" },
  });

  assert.equal(result.correlationId, "corr-1");
  assert.equal(result.metadata?.["google-adk.session"], "sess-1");
});

test("falls back to context.conversationId when sessionId is absent", () => {
  const result = googleAdkContext({
    context: { conversationId: "conv-1" },
  });

  assert.equal(result.correlationId, "conv-1");
  assert.equal(result.metadata?.["google-adk.conversation"], "conv-1");
});

test("reads caller-owned keys from state.toRecord()", () => {
  const result = googleAdkContext({
    invocationId: "inv-auto",
    sessionId: "sess-auto",
    state: {
      toRecord: () => ({ sessionId: "sess-state" }),
    },
  });

  assert.equal(result.correlationId, "sess-state");
  assert.equal(result.metadata?.["google-adk.session"], "sess-state");
});

test("reads caller-owned keys from state.get()", () => {
  const bag: Record<string, unknown> = { sessionId: "sess-get" };
  const result = googleAdkContext({
    invocationId: "inv-auto",
    sessionId: "sess-auto",
    state: {
      get: (key: string) => bag[key],
    },
  });

  assert.equal(result.correlationId, "sess-get");
});

test("accepts a bare app context object", () => {
  const result = googleAdkContext({ sessionId: "direct-sess" });
  assert.equal(result.correlationId, "direct-sess");
  assert.equal(result.metadata?.["google-adk.session"], "direct-sess");
});

test("init.sessionId is used when the caller bag has no id", () => {
  const result = googleAdkContext({ context: { user: "alice" } }, { sessionId: "policy-sess" });
  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["google-adk.session"], "policy-sess");
});

test("init.sessionId wins over durable session state", () => {
  const result = googleAdkContext(
    {
      invocationId: "inv-auto",
      sessionId: "sess-auto",
      state: { sessionId: "sess-stale", conversationId: "conv-stale" },
    },
    { sessionId: "policy-sess" },
  );
  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["google-adk.session"], "policy-sess");
});

test("nested caller wrap still wins over init.sessionId", () => {
  const result = googleAdkContext(
    { context: { sessionId: "sess-app" } },
    { sessionId: "policy-sess" },
  );
  assert.equal(result.correlationId, "sess-app");
});

test("never mints an id when nothing valid is present", () => {
  const result = googleAdkContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = googleAdkContext({ context: { sessionId: "" } });

  assert.equal(result.correlationId, undefined);
  assert.equal("google-adk.session" in (result.metadata ?? {}), false);
});

test("never reads toolContext.sessionId / invocationId on an ADK envelope", () => {
  const result = googleAdkContext({
    invocationId: "inv-auto",
    sessionId: "sess-auto",
    functionCallId: "call-auto",
    context: {},
  });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("never reads invocationId, functionCallId, or traceId", () => {
  const result = googleAdkContext({
    invocationId: "inv-1",
    functionCallId: "call-1",
    traceId: "trace-1",
    context: {
      invocationId: "ctx-inv",
      functionCallId: "ctx-call",
      traceId: "ctx-trace",
    },
  } as never);

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("a toolContext with invocationId is an envelope; sessionId is ignored", () => {
  const bare = googleAdkContext({
    invocationId: "inv-1",
    sessionId: "sess-lost",
  });
  assert.equal(bare.correlationId, undefined);
});

test("ADK Context has no nested context field; caller wrap is not the SDK object", () => {
  const adkShaped = googleAdkContext({
    invocationId: "inv-auto",
    sessionId: "sess-auto",
    state: { sessionId: "sess-from-state" },
  });
  assert.equal(adkShaped.correlationId, "sess-from-state");
  assert.equal("context" in { invocationId: "inv-auto", sessionId: "sess-auto" }, false);

  const wrap = googleAdkContext({ context: { sessionId: "sess-from-wrap" } });
  assert.equal(wrap.correlationId, "sess-from-wrap");
});

test("skips an invalid context session id and uses the next candidate", () => {
  const result = googleAdkContext({
    context: { sessionId: "" },
    conversationId: "conv-ok",
  });

  assert.equal(result.correlationId, "conv-ok");
  assert.equal("google-adk.session" in (result.metadata ?? {}), false);
  assert.equal(result.metadata?.["google-adk.conversation"], "conv-ok");
});

test("rejects a session id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = googleAdkContext({ context: { sessionId: longId } });

  assert.equal(result.correlationId, undefined);
  assert.equal("google-adk.session" in (result.metadata ?? {}), false);
});

test("a null context does not throw and does not mint", () => {
  const result = googleAdkContext({ context: null });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("caller metadata overrides derived keys", () => {
  const result = googleAdkContext(
    { context: { sessionId: "sess-1" } },
    { metadata: { "google-adk.session": "override" } },
  );

  assert.equal(result.metadata?.["google-adk.session"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = googleAdkContext({
    context: { sessionId: "sess-1", conversationId: "conv-1" },
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
  const result = googleAdkContext({
    context: { sessionId: "sess-1", conversationId: "conv-1" },
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["google-adk.session"]);
  assert.ok(metadataJson["google-adk.conversation"]);
});

test("undefined source does not throw and does not mint", () => {
  const result = googleAdkContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in googleAdkContext(null as never), false);
  assert.equal("correlationId" in googleAdkContext("sess" as never), false);
  assert.equal("correlationId" in googleAdkContext(12 as never), false);
});

test("non-string candidates are skipped", () => {
  const result = googleAdkContext({
    context: { sessionId: 99, conversationId: { id: "nope" } },
  });
  assert.equal(result.correlationId, undefined);
});

test("non-printable session id is rejected and does not mint", () => {
  const result = googleAdkContext({ context: { sessionId: "bad\nid" } });
  assert.equal(result.correlationId, undefined);
  assert.equal("google-adk.session" in (result.metadata ?? {}), false);
});

test("does not write an invalid session id into metadata when a later candidate is valid", () => {
  const result = googleAdkContext(
    { context: { sessionId: "bad\nid" } },
    { sessionId: "policy-sess" },
  );

  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["google-adk.session"], "policy-sess");
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
    googleAdkContext({ context: { sessionId: "" } });
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
    const result = googleAdkContext({
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
