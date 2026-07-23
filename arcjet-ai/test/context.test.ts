import assert from "node:assert/strict";
import { test } from "node:test";

import { createAiContext, aiToolsContext, type ArcjetAiContext } from "../dist/index.js";

test("AC1.1: createAiContext() generates a valid ULID", async () => {
  const ctx = createAiContext();
  assert.match(
    ctx.correlationId,
    /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/,
    "generated ULID must be 26 Crockford base32 characters",
  );
  // Verify it satisfies the printable ASCII ≤256 rule
  assert.match(ctx.correlationId, /^[\x20-\x7e]{1,256}$/);
});

test("AC1.1: consecutive ULIDs are different", async () => {
  const ctx1 = createAiContext();
  const ctx2 = createAiContext();
  assert.notEqual(ctx1.correlationId, ctx2.correlationId, "consecutive ULIDs should differ");
});

test("AC1.2: caller-supplied correlationId is preserved verbatim", async () => {
  const supplied = "review_2026-07-23_00042";
  const ctx = createAiContext({ correlationId: supplied });
  assert.equal(ctx.correlationId, supplied);
});

test("AC1.3: rejects 257-character correlationId", async () => {
  const oversize = "x".repeat(257);
  assert.throws(
    () => createAiContext({ correlationId: oversize }),
    /correlationId.*256.*rejected.*not truncated/,
  );
});

test("AC1.3: rejects correlationId with newline", async () => {
  assert.throws(
    () => createAiContext({ correlationId: "foo\nbar" }),
    /correlationId.*printable ASCII.*rejected.*not truncated/,
  );
});

test("AC1.3: rejects correlationId with non-ASCII character", async () => {
  assert.throws(
    () => createAiContext({ correlationId: "café" }),
    /correlationId.*printable ASCII.*rejected.*not truncated/,
  );
});

test("AC1.3: rejects empty correlationId", async () => {
  assert.throws(
    () => createAiContext({ correlationId: "" }),
    /correlationId.*1-256.*rejected.*not truncated/,
  );
});

test("AC1.4: context survives JSON serialization round-trip", async () => {
  const original = createAiContext({
    correlationId: "custom_id_123",
    metadata: { user: "alice", workflow: "approval" },
  });
  const serialized = JSON.stringify(original);
  const deserialized = JSON.parse(serialized) as ArcjetAiContext;
  assert.deepEqual(deserialized, original);
});

test("aiToolsContext: includes only branded tools", async () => {
  const ctx = createAiContext({ correlationId: "test_123" });
  const brandSymbol = Symbol.for("arcjet:ai:protected-tool");

  // One protected tool, one unprotected
  const tools = {
    protected_tool: {
      [brandSymbol]: true,
      description: "protected",
    },
    unprotected_tool: {
      description: "unprotected",
    },
  };

  const result = aiToolsContext(ctx, tools as any);

  // Result should have context only for the protected tool
  assert.equal(Object.keys(result).length, 1);
  assert.ok("protected_tool" in result);
  assert.equal(result.protected_tool as any, ctx, "should be same reference");
  assert.ok(!("unprotected_tool" in result));
});
