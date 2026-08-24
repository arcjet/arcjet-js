// oxlint-disable eslint/no-unsafe-type-assertion, eslint/explicit-function-return-type -- test infrastructure
import assert from "node:assert/strict";
import { test } from "node:test";

import { encodeMetadata } from "../../metadata.ts";
import { langchainContext } from "./context.ts";

test("prefers configurable.thread_id", () => {
  const result = langchainContext({
    configurable: { thread_id: "thread-abc" },
    sessionId: "sess-fallback",
    conversationId: "conv-fallback",
  });

  assert.equal(result.correlationId, "thread-abc");
  assert.equal(result.metadata?.["langchain.thread"], "thread-abc");
  assert.equal(result.metadata?.["langchain.session"], "sess-fallback");
  assert.equal(result.metadata?.["langchain.conversation"], "conv-fallback");
});

test("reads thread_id from wrapToolCall runtime.configurable", () => {
  const result = langchainContext({
    configurable: { thread_id: "from-runtime" },
  });
  assert.equal(result.correlationId, "from-runtime");
  assert.equal(result.metadata?.["langchain.thread"], "from-runtime");
});

test("reads thread_id from a nested runtime.configurable", () => {
  const result = langchainContext({
    runtime: { configurable: { thread_id: "nested-runtime" } },
  });
  assert.equal(result.correlationId, "nested-runtime");
});

test("reads thread_id from config.configurable", () => {
  const result = langchainContext({
    config: { configurable: { thread_id: "from-config" } },
  });
  assert.equal(result.correlationId, "from-config");
});

test("accepts a bare thread_id field", () => {
  const result = langchainContext({ thread_id: "direct-thread" });
  assert.equal(result.correlationId, "direct-thread");
});

// A caller threading a partially-built config can carry an empty
// `configurable` alongside the real id. Reading the empty one and stopping
// would send the decision out uncorrelated with no way to notice.
test("an empty configurable does not shadow a thread_id living elsewhere", () => {
  assert.equal(
    langchainContext({ configurable: {}, config: { configurable: { thread_id: "t-config" } } })
      .correlationId,
    "t-config",
  );
  assert.equal(
    langchainContext({ configurable: {}, runtime: { configurable: { thread_id: "t-runtime" } } })
      .correlationId,
    "t-runtime",
  );
  assert.equal(langchainContext({ configurable: {}, thread_id: "t-bare" }).correlationId, "t-bare");
});

test("the first configurable carrying a thread_id wins", () => {
  const result = langchainContext({
    configurable: { thread_id: "outer" },
    config: { configurable: { thread_id: "inner" } },
  });
  assert.equal(result.correlationId, "outer");
  assert.equal(result.metadata?.["langchain.thread"], "outer");
});

// An invalid id is an answer, not a miss: falling through to the next
// candidate would silently swap the id the caller believes they set.
test("an invalid thread_id is reported rather than skipped for the next candidate", () => {
  const result = langchainContext({
    configurable: { thread_id: "bad\nid" },
    config: { configurable: { thread_id: "good-id" } },
  });
  assert.equal("correlationId" in result, false);
});

test("falls back to caller-owned sessionId when thread_id is absent", () => {
  const result = langchainContext({ sessionId: "sess-1", conversationId: "conv-1" });
  assert.equal(result.correlationId, "sess-1");
  assert.equal(result.metadata?.["langchain.session"], "sess-1");
  assert.equal(result.metadata?.["langchain.conversation"], "conv-1");
});

test("falls back to conversationId when sessionId is absent", () => {
  const result = langchainContext({ conversationId: "conv-only" });
  assert.equal(result.correlationId, "conv-only");
  assert.equal(result.metadata?.["langchain.conversation"], "conv-only");
});

test("reads sessionId from nested context / runtime.context", () => {
  const result = langchainContext({
    context: { sessionId: "sess-app" },
  });
  assert.equal(result.correlationId, "sess-app");

  const fromRuntime = langchainContext({
    runtime: { context: { conversationId: "conv-rt" } },
  });
  assert.equal(fromRuntime.correlationId, "conv-rt");
});

test("init.sessionId is a last-resort fallback", () => {
  const result = langchainContext({}, { sessionId: "init-sess" });
  assert.equal(result.correlationId, "init-sess");
  assert.equal(result.metadata?.["langchain.session"], "init-sess");
});

test("does not mint a correlation id when nothing is present", () => {
  const result = langchainContext({});
  assert.equal("correlationId" in result, false);
});

test("skips an empty thread_id", () => {
  const result = langchainContext({ configurable: { thread_id: "" } });
  assert.equal("correlationId" in result, false);
  assert.equal("langchain.thread" in (result.metadata ?? {}), false);
});

test("skips a thread_id with a newline and warns", () => {
  const result = langchainContext({ configurable: { thread_id: "bad\nid" } });
  assert.equal("correlationId" in result, false);
  assert.equal(result.metadata?.["langchain.thread"], "bad\nid");
});

test("accepts a 256-character thread_id", () => {
  const longId = "t".repeat(256);
  const result = langchainContext({ configurable: { thread_id: longId } });
  assert.equal(result.correlationId, longId);
  assert.equal(result.metadata?.["langchain.thread"], longId);
});

test("init metadata overrides derived keys", () => {
  const result = langchainContext(
    { configurable: { thread_id: "thread-1" } },
    { metadata: { "langchain.thread": "override" } },
  );
  assert.equal(result.metadata?.["langchain.thread"], "override");
});

test("never reads traceId or interrupt / resume", () => {
  const result = langchainContext({
    traceId: "trace-minted",
    interrupt: "hitl",
    resumed: true,
    sessionId: "sess-real",
  } as never);
  assert.equal(result.correlationId, "sess-real");
  assert.equal("langchain.trace" in (result.metadata ?? {}), false);
});

test("null / non-object sources leave the call uncorrelated", () => {
  assert.equal("correlationId" in langchainContext(null as never), false);
  assert.equal("correlationId" in langchainContext("thread" as never), false);
  assert.equal("correlationId" in langchainContext(12 as never), false);
});

test("undefined source is uncorrelated", () => {
  const result = langchainContext();
  assert.equal("correlationId" in result, false);
});

test("derived metadata is encodeMetadata-safe", () => {
  const result = langchainContext({
    configurable: { thread_id: "thread-abc" },
    sessionId: "sess-1",
    conversationId: "conv-1",
  });
  assert.ok(result.metadata);
  const { metadataJson, localWarnings } = encodeMetadata(result.metadata);
  assert.equal(localWarnings.length, 0);
  assert.ok(metadataJson["langchain.thread"]);
  assert.ok(metadataJson["langchain.session"]);
  assert.ok(metadataJson["langchain.conversation"]);
});

test("configurable null does not throw", () => {
  const result = langchainContext({ configurable: null as never });
  assert.equal("correlationId" in result, false);
});
