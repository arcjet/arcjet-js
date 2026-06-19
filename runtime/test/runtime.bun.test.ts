import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { importWithGlobal } from "./import-with-global.ts";

describe("bun detection", () => {
  test("detects bun if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("../dist/index.js", { Bun: {} });
    assert.equal(runtime(), "bun");
  });
});
