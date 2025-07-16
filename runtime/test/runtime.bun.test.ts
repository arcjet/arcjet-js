import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { importWithGlobal } from "./import-with-global.js";

describe("bun detection", () => {
  test("detects bun if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("@arcjet/runtime", { Bun: {} });
    assert.equal(runtime(), "bun");
  });
});
