import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { importWithGlobal } from "./import-with-global.ts";

describe("edge-light detection", () => {
  test("detects edge-light if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("../dist/index.js", {
      EdgeRuntime: {},
    });
    assert.equal(runtime(), "edge-light");
  });
});
