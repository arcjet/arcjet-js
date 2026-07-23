import assert from "node:assert/strict";
import { test } from "node:test";

test("@arcjet/ai builds and is importable", async () => {
  const mod = await import("../dist/index.js");
  assert.equal(mod.experimental_placeholder, true);
});
