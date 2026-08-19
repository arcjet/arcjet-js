// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { openaiAgentsContext } from "./context.ts";

test("prefers a field the integrator put on runContext.context", () => {
  const result = openaiAgentsContext({
    context: { sessionId: "sess-app", conversationId: "conv-app", groupId: "group-app" },
    conversationId: "conv-envelope",
    groupId: "group-envelope",
    sessionId: "sess-envelope",
  });

  assert.equal(result.correlationId, "sess-app");
  assert.equal(result.metadata?.["openai-agents.session"], "sess-app");
  assert.equal(result.metadata?.["openai-agents.conversation"], "conv-app");
  assert.equal(result.metadata?.["openai-agents.group"], "group-app");
});

test("prefers context.correlationId over context.sessionId", () => {
  const result = openaiAgentsContext({
    context: { correlationId: "corr-1", sessionId: "sess-1" },
  });

  assert.equal(result.correlationId, "corr-1");
  assert.equal(result.metadata?.["openai-agents.session"], "sess-1");
});

test("falls back to context.conversationId when sessionId is absent", () => {
  const result = openaiAgentsContext({
    context: { conversationId: "conv-1", groupId: "group-1" },
  });

  assert.equal(result.correlationId, "conv-1");
  assert.equal(result.metadata?.["openai-agents.conversation"], "conv-1");
  assert.equal(result.metadata?.["openai-agents.group"], "group-1");
});

test("falls back to context.groupId when session and conversation are absent", () => {
  const result = openaiAgentsContext({
    context: { groupId: "group-only" },
  });

  assert.equal(result.correlationId, "group-only");
  assert.equal(result.metadata?.["openai-agents.group"], "group-only");
});

test("reads documented envelope copies when context has no id", () => {
  const result = openaiAgentsContext({
    context: { user: "alice" },
    conversationId: "conv-opt",
    groupId: "group-cfg",
  });

  assert.equal(result.correlationId, "conv-opt");
  assert.equal(result.metadata?.["openai-agents.conversation"], "conv-opt");
  assert.equal(result.metadata?.["openai-agents.group"], "group-cfg");
});

test("accepts a bare app context object", () => {
  const result = openaiAgentsContext({ sessionId: "direct-sess" });
  assert.equal(result.correlationId, "direct-sess");
  assert.equal(result.metadata?.["openai-agents.session"], "direct-sess");
});

test("init.sessionId is a last-resort caller-owned fallback", () => {
  const result = openaiAgentsContext({ context: { user: "alice" } }, { sessionId: "policy-sess" });
  assert.equal(result.correlationId, "policy-sess");
  assert.equal(result.metadata?.["openai-agents.session"], "policy-sess");
});

test("never mints an id when nothing valid is present", () => {
  const result = openaiAgentsContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = openaiAgentsContext({ context: { sessionId: "" } });

  assert.equal(result.correlationId, undefined);
  assert.equal("openai-agents.session" in (result.metadata ?? {}), false);
});

test("skips an invalid context session id and uses the next candidate", () => {
  const result = openaiAgentsContext({
    context: { sessionId: "" },
    conversationId: "conv-ok",
  });

  assert.equal(result.correlationId, "conv-ok");
});

test("rejects a session id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = openaiAgentsContext({ context: { sessionId: longId } });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["openai-agents.session"], longId);
});

test("never reads traceId, even when it is the only string present", () => {
  const result = openaiAgentsContext({
    context: { traceId: "trace-minted-by-sdk" },
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- asserting we do not invent a traceId field on the source
    ...({ traceId: "envelope-trace" } as Record<string, unknown>),
  });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("does not call getSessionId on a session-shaped object", () => {
  let called = 0;
  const result = openaiAgentsContext({
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- session is not a documented source field
    ...({
      session: {
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

test("a null context does not throw and does not mint", () => {
  const result = openaiAgentsContext({ context: null });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("caller metadata overrides derived keys", () => {
  const result = openaiAgentsContext(
    { context: { sessionId: "sess-1" } },
    { metadata: { "openai-agents.session": "override" } },
  );

  assert.equal(result.metadata?.["openai-agents.session"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = openaiAgentsContext({
    context: { sessionId: "sess-1", conversationId: "conv-1", groupId: "group-1" },
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
  const result = openaiAgentsContext({
    context: { sessionId: "sess-1", conversationId: "conv-1", groupId: "group-1" },
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["openai-agents.session"]);
  assert.ok(metadataJson["openai-agents.conversation"]);
  assert.ok(metadataJson["openai-agents.group"]);
});

test("undefined source does not throw and does not mint", () => {
  const result = openaiAgentsContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in openaiAgentsContext(null as never), false);
  assert.equal("correlationId" in openaiAgentsContext("sess" as never), false);
  assert.equal("correlationId" in openaiAgentsContext(12 as never), false);
});

test("non-string candidates are skipped", () => {
  const result = openaiAgentsContext({
    context: { sessionId: 99, conversationId: { id: "nope" } },
  });
  assert.equal(result.correlationId, undefined);
});

test("non-printable session id is rejected and does not mint", () => {
  const result = openaiAgentsContext({ context: { sessionId: "bad\nid" } });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["openai-agents.session"], "bad\nid");
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
    openaiAgentsContext({ context: { sessionId: "" } });
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
    const result = openaiAgentsContext({
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
