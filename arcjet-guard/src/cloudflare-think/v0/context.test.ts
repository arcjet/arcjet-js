// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { cloudflareThinkContext } from "./context.ts";

test("prefers a field the integrator put on a nested context bag", () => {
  const result = cloudflareThinkContext({
    context: { sessionId: "sess-app", conversationId: "conv-app" },
    sessionId: "sess-envelope",
    conversationId: "conv-envelope",
  });

  assert.equal(result.correlationId, "sess-app");
  assert.equal(result.metadata?.["cloudflare-think.session"], "sess-app");
  assert.equal(result.metadata?.["cloudflare-think.conversation"], "conv-app");
});

test("prefers context.correlationId over context.sessionId", () => {
  const result = cloudflareThinkContext({
    context: { correlationId: "corr-1", sessionId: "sess-1" },
  });

  assert.equal(result.correlationId, "corr-1");
  assert.equal(result.metadata?.["cloudflare-think.session"], "sess-1");
});

test("falls back to context.conversationId when sessionId is absent", () => {
  const result = cloudflareThinkContext({
    context: { conversationId: "conv-1" },
  });

  assert.equal(result.correlationId, "conv-1");
  assert.equal(result.metadata?.["cloudflare-think.conversation"], "conv-1");
});

test("accepts a bare app context object", () => {
  const result = cloudflareThinkContext({ sessionId: "direct-sess" });
  assert.equal(result.correlationId, "direct-sess");
  assert.equal(result.metadata?.["cloudflare-think.session"], "direct-sess");
});

test("init.sessionId is a last-resort caller-owned fallback", () => {
  const result = cloudflareThinkContext(
    { context: { user: "alice" } },
    { sessionId: "policy-sess" },
  );
  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["cloudflare-think.session"], "policy-sess");
});

test("never mints an id when nothing valid is present", () => {
  const result = cloudflareThinkContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = cloudflareThinkContext({ context: { sessionId: "" } });

  assert.equal(result.correlationId, undefined);
  assert.equal("cloudflare-think.session" in (result.metadata ?? {}), false);
});

test("never reads toolCallId, even when it is the only string present", () => {
  const result = cloudflareThinkContext({
    toolCallId: "call-auto",
    toolName: "lookup",
    conversationId: "should-be-ignored-on-envelope",
  });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("never reads Durable Object name / id or traceId", () => {
  const result = cloudflareThinkContext({
    name: "do-name",
    id: "do-id",
    traceId: "trace-1",
    toolCallId: "call-auto",
    toolName: "lookup",
    context: {},
  } as never);

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("a ToolCallContext envelope is not mined; nest caller ids on context", () => {
  const bare = cloudflareThinkContext({
    toolCallId: "call-1",
    toolName: "lookup",
    sessionId: "sess-lost",
  });
  assert.equal(bare.correlationId, undefined);

  const nested = cloudflareThinkContext({
    toolCallId: "call-1",
    toolName: "lookup",
    context: { sessionId: "sess-kept" },
  });
  assert.equal(nested.correlationId, "sess-kept");
});

test("reads a nested context even when the envelope is a ToolCallContext", () => {
  const result = cloudflareThinkContext({
    toolCallId: "call-1",
    toolName: "lookup",
    context: { sessionId: "sess-from-app" },
  });

  assert.equal(result.correlationId, "sess-from-app");
  assert.equal(result.metadata?.["cloudflare-think.session"], "sess-from-app");
});

test("skips an invalid context session id and uses the next candidate", () => {
  const result = cloudflareThinkContext({
    context: { sessionId: "" },
    conversationId: "conv-ok",
  });

  assert.equal(result.correlationId, "conv-ok");
  assert.equal("cloudflare-think.session" in (result.metadata ?? {}), false);
  assert.equal(result.metadata?.["cloudflare-think.conversation"], "conv-ok");
});

test("rejects a session id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = cloudflareThinkContext({ context: { sessionId: longId } });

  assert.equal(result.correlationId, undefined);
  assert.equal("cloudflare-think.session" in (result.metadata ?? {}), false);
});

test("a null context does not throw and does not mint", () => {
  const result = cloudflareThinkContext({ context: null });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("caller metadata overrides derived keys", () => {
  const result = cloudflareThinkContext(
    { context: { sessionId: "sess-1" } },
    { metadata: { "cloudflare-think.session": "override" } },
  );

  assert.equal(result.metadata?.["cloudflare-think.session"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = cloudflareThinkContext({
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
  const result = cloudflareThinkContext({
    context: { sessionId: "sess-1", conversationId: "conv-1" },
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["cloudflare-think.session"]);
  assert.ok(metadataJson["cloudflare-think.conversation"]);
});

test("undefined source does not throw and does not mint", () => {
  const result = cloudflareThinkContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in cloudflareThinkContext(null as never), false);
  assert.equal("correlationId" in cloudflareThinkContext("sess" as never), false);
  assert.equal("correlationId" in cloudflareThinkContext(12 as never), false);
});

test("non-string candidates are skipped", () => {
  const result = cloudflareThinkContext({
    context: { sessionId: 99, conversationId: { id: "nope" } },
  });
  assert.equal(result.correlationId, undefined);
});

test("non-printable session id is rejected and does not mint", () => {
  const result = cloudflareThinkContext({ context: { sessionId: "bad\nid" } });
  assert.equal(result.correlationId, undefined);
  assert.equal("cloudflare-think.session" in (result.metadata ?? {}), false);
});

test("does not write an invalid session id into metadata when a later candidate is valid", () => {
  const result = cloudflareThinkContext(
    { context: { sessionId: "bad\nid" } },
    { sessionId: "policy-sess" },
  );

  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["cloudflare-think.session"], "policy-sess");
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
    cloudflareThinkContext({ context: { sessionId: "" } });
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
    const result = cloudflareThinkContext({
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
