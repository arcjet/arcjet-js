// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { claudeAgentContext } from "./context.ts";

test("prefers hook session_id over sessionId and options.sessionId", () => {
  const result = claudeAgentContext(
    { session_id: "hook-session", sessionId: "source-session", agent_id: "agent-1" },
    { sessionId: "options-session" },
  );

  assert.equal(result.correlationId, "hook-session");
  assert.equal(result.metadata?.["claude.session"], "hook-session");
  assert.equal(result.metadata?.["claude.agent"], "agent-1");
});

test("falls back to source sessionId when session_id is absent", () => {
  const result = claudeAgentContext({ sessionId: "options-shaped" });

  assert.equal(result.correlationId, "options-shaped");
  assert.equal(result.metadata?.["claude.session"], "options-shaped");
});

test("falls back to init.sessionId (options.sessionId) when the source has none", () => {
  const result = claudeAgentContext({}, { sessionId: "query-session" });

  assert.equal(result.correlationId, "query-session");
  assert.equal(result.metadata?.["claude.session"], "query-session");
});

test("agent_id is metadata only and is never used as correlationId", () => {
  const result = claudeAgentContext({ agent_id: "subagent-9", agent_type: "explore" });

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
  assert.equal(result.metadata?.["claude.agent"], "subagent-9");
  assert.equal(result.metadata?.["claude.agent-type"], "explore");
});

test("never mints an id when nothing valid is present", () => {
  const result = claudeAgentContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = claudeAgentContext({ session_id: "" });

  assert.equal(result.correlationId, undefined);
  assert.equal("claude.session" in (result.metadata ?? {}), false);
});

test("skips an invalid session_id and uses options.sessionId instead of minting", () => {
  const result = claudeAgentContext({ session_id: "" }, { sessionId: "fallback-ok" });

  assert.equal(result.correlationId, "fallback-ok");
});

test("rejects a session id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = claudeAgentContext({ session_id: longId });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["claude.session"], longId);
});

test("caller metadata overrides derived keys", () => {
  const result = claudeAgentContext(
    { session_id: "session-1" },
    {
      metadata: { "claude.session": "override" },
    },
  );

  assert.equal(result.metadata?.["claude.session"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = claudeAgentContext({
    session_id: "session-1",
    agent_id: "agent-1",
    agent_type: "explore",
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
  const result = claudeAgentContext({
    session_id: "session-1",
    agent_id: "agent-1",
    agent_type: "explore",
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["claude.session"]);
  assert.ok(metadataJson["claude.agent"]);
  assert.ok(metadataJson["claude.agent-type"]);
});

test("undefined source does not throw and does not mint", () => {
  const result = claudeAgentContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in claudeAgentContext(null as never), false);
  assert.equal("correlationId" in claudeAgentContext("session" as never), false);
  assert.equal("correlationId" in claudeAgentContext(12 as never), false);
});

test("non-string candidates are skipped", () => {
  const result = claudeAgentContext({ session_id: 99, sessionId: { id: "nope" } });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("non-printable session id is rejected and does not mint", () => {
  const result = claudeAgentContext({ session_id: "bad\nid" });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["claude.session"], "bad\nid");
});

test("empty agent_id is not copied onto metadata", () => {
  const result = claudeAgentContext({ session_id: "session-1", agent_id: "" });
  assert.equal(result.correlationId, "session-1");
  assert.equal("claude.agent" in (result.metadata ?? {}), false);
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
    claudeAgentContext({ session_id: "" });
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
    const result = claudeAgentContext({ session_id: "" }, { sessionId: "fallback-ok" });
    assert.equal(result.correlationId, "fallback-ok");
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
