import assert from "node:assert/strict";
import { test } from "node:test";

import {
  REPLACEABLE_BUILTIN_TOOLS,
  canReplaceResult,
  replacementOutput,
  toolResultText,
} from "./tool-results.ts";

const MCP_NAME = "mcp__docs__fetch";

test("canReplaceResult: MCP tools and the listed built-ins", () => {
  assert.equal(canReplaceResult(MCP_NAME), true);
  assert.equal(canReplaceResult("Bash"), true);
  assert.equal(canReplaceResult("Read"), true);
  assert.deepEqual(REPLACEABLE_BUILTIN_TOOLS, new Set(["Bash", "Read"]));
});

test("canReplaceResult: everything else", () => {
  for (const name of ["Write", "Edit", "Agent", "WebFetch", "WebSearch", "", "mcp_x"]) {
    assert.equal(canReplaceResult(name), false, name);
  }
});

test("toolResultText: MCP text blocks in order", () => {
  const response = [
    { type: "text", text: "first" },
    { type: "image", data: "aGk=" },
    { type: "text", text: "last" },
  ];
  assert.equal(toolResultText(MCP_NAME, response), "first\nlast");
});

test("toolResultText: Bash stdout and stderr", () => {
  assert.equal(toolResultText("Bash", { stdout: "out", stderr: "err" }), "out\nerr");
  assert.equal(toolResultText("Bash", { stdout: "out", stderr: "" }), "out");
});

test("toolResultText: Read file content", () => {
  assert.equal(
    toolResultText("Read", { type: "text", file: { filePath: "/x", content: "body" } }),
    "body",
  );
});

test("toolResultText: other tools are serialized whole", () => {
  const response = { result: "fetched", code: 200 };
  assert.deepEqual(JSON.parse(toolResultText("WebFetch", response)), response);
});

test("toolResultText: never shortened", () => {
  const long = "a".repeat(200_000);
  assert.equal(toolResultText("Bash", { stdout: long, stderr: "" }), long);
  assert.equal(toolResultText(MCP_NAME, [{ type: "text", text: long }]), long);
});

test("toolResultText: unexpected shapes fall back to serialized", () => {
  assert.equal(toolResultText("Bash", "plain"), '"plain"');
  assert.equal(toolResultText(MCP_NAME, { not: "a list" }), '{"not":"a list"}');
  assert.equal(toolResultText("Read", { type: "image" }), '{"type":"image"}');
});

test("toolResultText: unserializable values do not throw", () => {
  const circular: Record<string, unknown> = {};
  circular["self"] = circular;
  assert.equal(toolResultText("WebFetch", circular), "[object Object]");
  // A tool that reported no response at all.
  const missing: { response?: unknown } = {};
  assert.equal(toolResultText("WebFetch", missing.response), "undefined");
});

test("replacementOutput: MCP is one text block", () => {
  assert.deepEqual(replacementOutput(MCP_NAME, [], "DENIED"), [{ type: "text", text: "DENIED" }]);
});

test("replacementOutput: Bash stdout", () => {
  assert.deepEqual(replacementOutput("Bash", { stdout: "x" }, "DENIED"), {
    stdout: "DENIED",
    stderr: "",
    interrupted: false,
  });
});

test("replacementOutput: Read keeps the file path", () => {
  const response = { type: "text", file: { filePath: "/repo/a.md", content: "x" } };
  assert.deepEqual(replacementOutput("Read", response, "DENIED"), {
    type: "text",
    file: { filePath: "/repo/a.md", content: "DENIED", numLines: 1, startLine: 1, totalLines: 1 },
  });
  assert.deepEqual(replacementOutput("Read", { type: "image" }, "DENIED"), {
    type: "text",
    file: { filePath: "", content: "DENIED", numLines: 1, startLine: 1, totalLines: 1 },
  });
});

test("replacementOutput: undefined for tools outside the table", () => {
  for (const name of ["Write", "Agent", "WebSearch", ""]) {
    assert.equal(replacementOutput(name, { anything: 1 }, "DENIED"), undefined, name);
  }
});
