import assert from "node:assert/strict";
import { test } from "node:test";

import { createAgentContext, type ArcjetAgentContext } from "./context.ts";

test("AC1.1: createAgentContext() generates a valid ULID", () => {
  const ctx = createAgentContext();
  assert.match(
    ctx.correlationId,
    /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/,
    "generated ULID must be 26 Crockford base32 characters",
  );
  // Verify it satisfies the printable ASCII ≤256 rule
  assert.match(ctx.correlationId, /^[ -~]{1,256}$/);
});

test("AC1.1: consecutive ULIDs are different", () => {
  const ctx1 = createAgentContext();
  const ctx2 = createAgentContext();
  assert.notEqual(ctx1.correlationId, ctx2.correlationId, "consecutive ULIDs should differ");
});

test("AC1.2: caller-supplied correlationId is preserved verbatim", () => {
  const supplied = "review_2026-07-23_00042";
  const ctx = createAgentContext({ correlationId: supplied });
  assert.equal(ctx.correlationId, supplied);
});

test("AC1.2: undefined correlationId generates a ULID instead of throwing", () => {
  const ctx = createAgentContext({
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- an untyped caller can pass undefined explicitly
    correlationId: undefined as unknown as string,
  });
  assert.match(
    ctx.correlationId,
    /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/,
    "undefined correlationId should generate a ULID, not throw",
  );
});

test("AC1.3: rejects 257-character correlationId", () => {
  const oversize = "x".repeat(257);
  assert.throws(
    () => createAgentContext({ correlationId: oversize }),
    /correlationId.*256.*rejected.*not truncated/,
  );
});

test("AC1.3: rejects correlationId with newline", () => {
  assert.throws(
    () => createAgentContext({ correlationId: "foo\nbar" }),
    /correlationId.*printable ASCII.*rejected.*not truncated/,
  );
});

test("AC1.3: rejects correlationId with non-ASCII character", () => {
  assert.throws(
    () => createAgentContext({ correlationId: "café" }),
    /correlationId.*printable ASCII.*rejected.*not truncated/,
  );
});

test("AC1.3: rejects non-string correlationId at runtime", () => {
  assert.throws(
    () =>
      createAgentContext({
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- intentional: test that runtime rejects non-strings
        correlationId: 123 as unknown as string,
      }),
    /correlationId.*printable ASCII.*type number.*rejected.*not truncated/,
  );
});

test("AC1.3: rejects empty correlationId", () => {
  assert.throws(
    () => createAgentContext({ correlationId: "" }),
    /correlationId.*1-256.*rejected.*not truncated/,
  );
});

test("AC1.4: context survives JSON serialization round-trip", () => {
  const original = createAgentContext({
    correlationId: "custom_id_123",
    metadata: { user: "alice", workflow: "approval" },
  });
  const serialized = JSON.stringify(original);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse result is untyped by default
  const deserialized = JSON.parse(serialized) as ArcjetAgentContext;
  assert.deepEqual(deserialized, original);
});
