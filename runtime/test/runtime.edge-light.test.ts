import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { importWithGlobal } from "./import-with-global.js";

describe("edge-light detection", () => {
  test("detects edge-light if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("@arcjet/runtime", {
      EdgeRuntime: {},
    });
    assert.equal(runtime(), "edge-light");
  });
});
