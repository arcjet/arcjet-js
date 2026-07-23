import assert from "node:assert/strict";
import { test } from "node:test";

test("@arcjet/ai builds and is importable", async () => {
  const mod = await import("../dist/index.js");
  assert.equal(typeof mod.createAiContext, "function");
  assert.equal(typeof mod.aiToolsContext, "function");
  assert.equal(typeof mod.securityMetadata, "function");
});
