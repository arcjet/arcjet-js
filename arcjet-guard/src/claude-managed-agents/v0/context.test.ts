import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { claudeManagedAgentsContext } from "./context.ts";

test("uses a caller-owned correlationId", () => {
  const result = claudeManagedAgentsContext({ correlationId: "conversation-1" });
  assert.equal(result.correlationId, "conversation-1");
});

test("never mints an id when nothing is passed", () => {
  const result = claudeManagedAgentsContext();
  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when correlationId is omitted", () => {
  const result = claudeManagedAgentsContext({});
  assert.equal("correlationId" in result, false);
});

test("never mints when the only candidate is invalid", () => {
  const result = claudeManagedAgentsContext({ correlationId: "" });
  assert.equal("correlationId" in result, false);
});

test("rejects a correlationId over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = claudeManagedAgentsContext({ correlationId: longId });
  assert.equal("correlationId" in result, false);
});

test("does not treat Anthropic session ids as correlation", () => {
  const sneaky = {
    correlationId: undefined,
    sessionId: "sesn_011CZkZAtmR3yMPDzynEDxu7",
    session_id: "sesn_011CZkZAtmR3yMPDzynEDxu7",
    id: "sesn_011CZkZAtmR3yMPDzynEDxu7",
  };
  const result = claudeManagedAgentsContext(sneaky);
  assert.equal("correlationId" in result, false);
});

test("does not treat Anthropic event ids as correlation", () => {
  const result = claudeManagedAgentsContext({
    // @ts-expect-error -- event ids are not part of the public init
    eventId: "sevt_011CZkZGOp0iBcp4kaQSihUmy",
    custom_tool_use_id: "sevt_tool",
  });
  assert.equal("correlationId" in result, false);
});

test("never reads or writes traceId", () => {
  const result = claudeManagedAgentsContext({
    correlationId: "owned",
    // @ts-expect-error -- traceId is not accepted
    traceId: "trace-should-be-ignored",
    metadata: { user: "tenant-1" },
  });
  assert.equal(result.correlationId, "owned");
  assert.equal(result.metadata?.["traceId"], undefined);
  assert.equal("traceId" in (result.metadata ?? {}), false);
  assert.equal("traceId" in result, false);
});

test("caller metadata is copied and does not mint", () => {
  const result = claudeManagedAgentsContext({
    metadata: { user: "tenant-1" },
  });
  assert.equal("correlationId" in result, false);
  assert.equal(result.metadata?.["user"], "tenant-1");
});

test("encoder round-trip produces no AJ1017 warnings", () => {
  const result = claudeManagedAgentsContext({
    correlationId: "conversation-1",
    metadata: { user: "tenant-1" },
  });
  assert.ok(result.metadata);
  const { localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
});

test("warns when correlationId is invalid and ARCJET_LOG_LEVEL asks for warnings", () => {
  const previous = process.env["ARCJET_LOG_LEVEL"];
  process.env["ARCJET_LOG_LEVEL"] = "info";
  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    claudeManagedAgentsContext({ correlationId: "" });
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
