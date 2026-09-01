// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { tanstackAiContext } from "./context.ts";

test("prefers a field the integrator put on chat({ context })", () => {
  const result = tanstackAiContext({
    context: { sessionId: "sess-app", conversationId: "conv-app" },
    sessionId: "sess-envelope",
    conversationId: "conv-envelope",
  });

  assert.equal(result.correlationId, "sess-app");
  assert.equal(result.metadata?.["tanstack-ai.session"], "sess-app");
  assert.equal(result.metadata?.["tanstack-ai.conversation"], "conv-app");
});

test("prefers context.correlationId over context.sessionId", () => {
  const result = tanstackAiContext({
    context: { correlationId: "corr-1", sessionId: "sess-1" },
  });

  assert.equal(result.correlationId, "corr-1");
  assert.equal(result.metadata?.["tanstack-ai.session"], "sess-1");
});

test("falls back to context.conversationId when sessionId is absent", () => {
  const result = tanstackAiContext({
    context: { conversationId: "conv-1" },
  });

  assert.equal(result.correlationId, "conv-1");
  assert.equal(result.metadata?.["tanstack-ai.conversation"], "conv-1");
});

test("accepts a bare app context object", () => {
  const result = tanstackAiContext({ sessionId: "direct-sess" });
  assert.equal(result.correlationId, "direct-sess");
  assert.equal(result.metadata?.["tanstack-ai.session"], "direct-sess");
});

test("init.sessionId is a last-resort caller-owned fallback", () => {
  const result = tanstackAiContext({ context: { user: "alice" } }, { sessionId: "policy-sess" });
  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["tanstack-ai.session"], "policy-sess");
});

test("never mints an id when nothing valid is present", () => {
  const result = tanstackAiContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = tanstackAiContext({ context: { sessionId: "" } });

  assert.equal(result.correlationId, undefined);
  assert.equal("tanstack-ai.session" in (result.metadata ?? {}), false);
});

test("never reads ctx.threadId, even when it is the only string present", () => {
  const result = tanstackAiContext({
    requestId: "req-minted",
    streamId: "stream-minted",
    threadId: "thread-auto",
    conversationId: "conv-alias-of-thread",
    context: {},
  } as never);

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("never reads requestId, streamId, runId, or traceId", () => {
  const result = tanstackAiContext({
    requestId: "req-1",
    streamId: "stream-1",
    runId: "run-1",
    traceId: "trace-1",
    context: {
      requestId: "ctx-req",
      streamId: "ctx-stream",
      runId: "ctx-run",
      traceId: "ctx-trace",
    },
  } as never);

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("a bare object with requestId and streamId is an envelope; nest caller ids on context", () => {
  const bare = tanstackAiContext({
    requestId: "req-1",
    streamId: "stream-1",
    sessionId: "sess-lost",
  });
  assert.equal(bare.correlationId, undefined);

  const nested = tanstackAiContext({
    requestId: "req-1",
    streamId: "stream-1",
    context: { sessionId: "sess-kept" },
  });
  assert.equal(nested.correlationId, "sess-kept");
});

test("reads chat({ context }) even when the envelope is a ChatMiddlewareContext", () => {
  const result = tanstackAiContext({
    requestId: "req-1",
    streamId: "stream-1",
    threadId: "thread-auto",
    conversationId: "thread-auto",
    context: { sessionId: "sess-from-chat" },
  } as never);

  assert.equal(result.correlationId, "sess-from-chat");
  assert.equal(result.metadata?.["tanstack-ai.session"], "sess-from-chat");
});

test("skips an invalid context session id and uses the next candidate", () => {
  const result = tanstackAiContext({
    context: { sessionId: "" },
    conversationId: "conv-ok",
  });

  assert.equal(result.correlationId, "conv-ok");
  assert.equal("tanstack-ai.session" in (result.metadata ?? {}), false);
  assert.equal(result.metadata?.["tanstack-ai.conversation"], "conv-ok");
});

test("rejects a session id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = tanstackAiContext({ context: { sessionId: longId } });

  assert.equal(result.correlationId, undefined);
  assert.equal("tanstack-ai.session" in (result.metadata ?? {}), false);
});

test("a null context does not throw and does not mint", () => {
  const result = tanstackAiContext({ context: null });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("caller metadata overrides derived keys", () => {
  const result = tanstackAiContext(
    { context: { sessionId: "sess-1" } },
    { metadata: { "tanstack-ai.session": "override" } },
  );

  assert.equal(result.metadata?.["tanstack-ai.session"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = tanstackAiContext({
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
  const result = tanstackAiContext({
    context: { sessionId: "sess-1", conversationId: "conv-1" },
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["tanstack-ai.session"]);
  assert.ok(metadataJson["tanstack-ai.conversation"]);
});

test("undefined source does not throw and does not mint", () => {
  const result = tanstackAiContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in tanstackAiContext(null as never), false);
  assert.equal("correlationId" in tanstackAiContext("sess" as never), false);
  assert.equal("correlationId" in tanstackAiContext(12 as never), false);
});

test("non-string candidates are skipped", () => {
  const result = tanstackAiContext({
    context: { sessionId: 99, conversationId: { id: "nope" } },
  });
  assert.equal(result.correlationId, undefined);
});

test("non-printable session id is rejected and does not mint", () => {
  const result = tanstackAiContext({ context: { sessionId: "bad\nid" } });
  assert.equal(result.correlationId, undefined);
  assert.equal("tanstack-ai.session" in (result.metadata ?? {}), false);
});

test("does not write an invalid session id into metadata when a later candidate is valid", () => {
  const result = tanstackAiContext(
    { context: { sessionId: "bad\nid" } },
    { sessionId: "policy-sess" },
  );

  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["tanstack-ai.session"], "policy-sess");
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
    tanstackAiContext({ context: { sessionId: "" } });
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
    const result = tanstackAiContext({
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
