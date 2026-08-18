// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { langgraphAgentContext } from "./context.ts";

test("prefers configurable.thread_id", () => {
  const result = langgraphAgentContext({
    configurable: {
      thread_id: "thread-abc",
      checkpoint_ns: "node:uuid",
      run_id: "run-1",
    },
  });

  assert.equal(result.correlationId, "thread-abc");
  assert.equal(result.metadata?.["langgraph.thread"], "thread-abc");
  assert.equal(result.metadata?.["langgraph.checkpoint_ns"], "node:uuid");
  assert.equal(result.metadata?.["langgraph.run"], "run-1");
});

test("falls back to checkpoint_ns when thread_id is absent", () => {
  const result = langgraphAgentContext({
    configurable: { checkpoint_ns: "subgraph:1" },
  });

  assert.equal(result.correlationId, "subgraph:1");
  assert.equal(result.metadata?.["langgraph.checkpoint_ns"], "subgraph:1");
  assert.ok(!("langgraph.thread" in (result.metadata ?? {})));
});

test("skips empty checkpoint_ns (parent graph) and uses run id", () => {
  const result = langgraphAgentContext({
    configurable: { checkpoint_ns: "", run_id: "run-555" },
  });

  assert.equal(result.correlationId, "run-555");
  assert.equal(result.metadata?.["langgraph.run"], "run-555");
  assert.equal("langgraph.checkpoint_ns" in (result.metadata ?? {}), false);
});

test("reads runId from the config object when configurable has none", () => {
  const result = langgraphAgentContext({ runId: "run-from-config" });
  assert.equal(result.correlationId, "run-from-config");
  assert.equal(result.metadata?.["langgraph.run"], "run-from-config");
});

test("reads nested ToolRuntime.config.configurable.thread_id", () => {
  const result = langgraphAgentContext({
    config: { configurable: { thread_id: "nested-thread" } },
  });
  assert.equal(result.correlationId, "nested-thread");
});

test("accepts a configurable-shaped object passed directly", () => {
  const result = langgraphAgentContext({ thread_id: "direct-thread" });
  assert.equal(result.correlationId, "direct-thread");
});

test("never mints an id when nothing valid is present", () => {
  const result = langgraphAgentContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = langgraphAgentContext({ configurable: { thread_id: "" } });

  assert.equal(result.correlationId, undefined);
  assert.equal("langgraph.thread" in (result.metadata ?? {}), false);
});

test("skips an invalid thread id and uses checkpoint_ns instead of minting", () => {
  const result = langgraphAgentContext({
    configurable: { thread_id: "", checkpoint_ns: "ns-ok" },
  });

  assert.equal(result.correlationId, "ns-ok");
});

test("rejects a thread id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = langgraphAgentContext({ configurable: { thread_id: longId } });

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["langgraph.thread"], longId);
});

test("caller metadata overrides derived keys", () => {
  const result = langgraphAgentContext(
    { configurable: { thread_id: "thread-1" } },
    { metadata: { "langgraph.thread": "override" } },
  );

  assert.equal(result.metadata?.["langgraph.thread"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = langgraphAgentContext({
    configurable: {
      thread_id: "thread-1",
      checkpoint_ns: "ns-1",
      run_id: "run-1",
    },
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
  const result = langgraphAgentContext({
    configurable: {
      thread_id: "thread-1",
      checkpoint_ns: "ns-1",
      run_id: "run-1",
    },
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["langgraph.thread"]);
  assert.ok(metadataJson["langgraph.checkpoint_ns"]);
  assert.ok(metadataJson["langgraph.run"]);
});

test("undefined source does not throw and does not mint", () => {
  const result = langgraphAgentContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in langgraphAgentContext(null as never), false);
  assert.equal("correlationId" in langgraphAgentContext("thread" as never), false);
  assert.equal("correlationId" in langgraphAgentContext(12 as never), false);
});

test("non-string candidates are skipped", () => {
  const result = langgraphAgentContext({
    configurable: { thread_id: 99, checkpoint_ns: { id: "nope" } },
  });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("non-printable thread id is rejected and does not mint", () => {
  const result = langgraphAgentContext({ configurable: { thread_id: "bad\nid" } });
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["langgraph.thread"], "bad\nid");
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
    langgraphAgentContext({ configurable: { thread_id: "" } });
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
    const result = langgraphAgentContext({
      configurable: { thread_id: "", checkpoint_ns: "ns-ok" },
    });
    assert.equal(result.correlationId, "ns-ok");
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
