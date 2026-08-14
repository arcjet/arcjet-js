// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { MASTRA_RESOURCE_ID_KEY, MASTRA_THREAD_ID_KEY, mastraAgentContext } from "./context.ts";
import type { MastraRequestContextLike } from "./context.ts";

function contextFrom(values: Record<string, unknown>): MastraRequestContextLike {
  return {
    get(key: string): unknown {
      return values[key];
    },
  };
}

test("reserved key string values match Mastra's documented constants", () => {
  assert.equal(MASTRA_THREAD_ID_KEY, "mastra__threadId");
  assert.equal(MASTRA_RESOURCE_ID_KEY, "mastra__resourceId");
});

test("prefers thread id from MASTRA_THREAD_ID_KEY", () => {
  const result = mastraAgentContext(
    contextFrom({
      [MASTRA_THREAD_ID_KEY]: "thread-abc",
      [MASTRA_RESOURCE_ID_KEY]: "user-1",
    }),
  );

  assert.equal(result.correlationId, "thread-abc");
  assert.equal(result.metadata?.["mastra.thread"], "thread-abc");
  assert.equal(result.metadata?.["mastra.resource"], "user-1");
  assert.equal(result.metadata?.user, "user-1");
});

test("falls back to resource id when thread is absent", () => {
  const result = mastraAgentContext(contextFrom({ [MASTRA_RESOURCE_ID_KEY]: "user-9" }));

  assert.equal(result.correlationId, "user-9");
  assert.equal(result.metadata?.["mastra.resource"], "user-9");
  assert.ok(!("mastra.thread" in (result.metadata ?? {})));
});

test("falls back to workflow.runId when thread and resource are absent", () => {
  const result = mastraAgentContext({
    workflow: { runId: "run-555" },
  });

  assert.equal(result.correlationId, "run-555");
  assert.equal(result.metadata?.["mastra.run"], "run-555");
});

test("reads agent.threadId when the reserved key is unset", () => {
  const result = mastraAgentContext({
    agent: { threadId: "agent-thread", resourceId: "agent-user" },
  });

  assert.equal(result.correlationId, "agent-thread");
  assert.equal(result.metadata?.["mastra.thread"], "agent-thread");
  assert.equal(result.metadata?.["mastra.resource"], "agent-user");
});

test("never mints an id when nothing valid is present", () => {
  const result = mastraAgentContext({});

  assert.equal(result.correlationId, undefined);
  assert.equal("correlationId" in result, false);
});

test("never mints an id when the only candidate is invalid", () => {
  const result = mastraAgentContext(contextFrom({ [MASTRA_THREAD_ID_KEY]: "" }));

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["mastra.thread"], "");
});

test("skips an invalid thread id and uses resource instead of minting", () => {
  const result = mastraAgentContext(
    contextFrom({
      [MASTRA_THREAD_ID_KEY]: "",
      [MASTRA_RESOURCE_ID_KEY]: "user-ok",
    }),
  );

  assert.equal(result.correlationId, "user-ok");
});

test("rejects a thread id over 256 characters and does not mint", () => {
  const longId = "x".repeat(257);
  const result = mastraAgentContext(contextFrom({ [MASTRA_THREAD_ID_KEY]: longId }));

  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["mastra.thread"], longId);
});

test("accepts a RequestContext-like object passed directly", () => {
  const result = mastraAgentContext(contextFrom({ [MASTRA_THREAD_ID_KEY]: "direct-thread" }));
  assert.equal(result.correlationId, "direct-thread");
});

test("caller metadata overrides derived keys", () => {
  const result = mastraAgentContext(contextFrom({ [MASTRA_THREAD_ID_KEY]: "thread-1" }), {
    metadata: { "mastra.thread": "override" },
  });

  assert.equal(result.metadata?.["mastra.thread"], "override");
});

test("derived metadata keys match /^[A-Za-z0-9._-]+$/", () => {
  const result = mastraAgentContext({
    requestContext: contextFrom({
      [MASTRA_THREAD_ID_KEY]: "thread-1",
      [MASTRA_RESOURCE_ID_KEY]: "user-1",
    }),
    workflow: { runId: "run-1" },
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
  const result = mastraAgentContext({
    requestContext: contextFrom({
      [MASTRA_THREAD_ID_KEY]: "thread-1",
      [MASTRA_RESOURCE_ID_KEY]: "user-1",
    }),
    workflow: { runId: "run-1" },
  });

  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["mastra.thread"]);
  assert.ok(metadataJson["mastra.resource"]);
  assert.ok(metadataJson["mastra.run"]);
  assert.ok(metadataJson.user);
});

test("undefined source does not throw and does not mint", () => {
  const result = mastraAgentContext();
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("null and primitive sources do not mint", () => {
  assert.equal("correlationId" in mastraAgentContext(null as never), false);
  assert.equal("correlationId" in mastraAgentContext("thread" as never), false);
  assert.equal("correlationId" in mastraAgentContext(12 as never), false);
});

test("requestContext.get throw is ignored and does not mint", () => {
  const result = mastraAgentContext({
    get(): unknown {
      throw new Error("get failed");
    },
  });
  assert.equal(result.correlationId, undefined);
});

test("non-string candidates are skipped", () => {
  const result = mastraAgentContext(
    contextFrom({
      [MASTRA_THREAD_ID_KEY]: 99,
      [MASTRA_RESOURCE_ID_KEY]: { id: "nope" },
    }),
  );
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata, undefined);
});

test("non-printable thread id is rejected and does not mint", () => {
  const result = mastraAgentContext(contextFrom({ [MASTRA_THREAD_ID_KEY]: "bad\nid" }));
  assert.equal(result.correlationId, undefined);
  assert.equal(result.metadata?.["mastra.thread"], "bad\nid");
});

test("empty resource id is not copied onto user", () => {
  const result = mastraAgentContext(contextFrom({ [MASTRA_RESOURCE_ID_KEY]: "" }));
  assert.equal(result.correlationId, undefined);
  assert.equal("user" in (result.metadata ?? {}), false);
});

test("agent.resourceId can populate user when the reserved key is empty", () => {
  const result = mastraAgentContext({
    requestContext: contextFrom({ [MASTRA_RESOURCE_ID_KEY]: "" }),
    agent: { resourceId: "agent-user" },
  });
  assert.equal(result.metadata?.user, "agent-user");
});

test("object without get is treated as a context source", () => {
  const result = mastraAgentContext({
    agent: { threadId: "from-object" },
  });
  assert.equal(result.correlationId, "from-object");
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
    mastraAgentContext(contextFrom({ [MASTRA_THREAD_ID_KEY]: "" }));
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
    const result = mastraAgentContext(
      contextFrom({
        [MASTRA_THREAD_ID_KEY]: "",
        [MASTRA_RESOURCE_ID_KEY]: "user-ok",
      }),
    );
    assert.equal(result.correlationId, "user-ok");
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
