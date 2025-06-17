import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { importWithGlobal } from "./import-with-global.js";

describe("deno detection", () => {
  test("detects deno if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("../index.js", { Deno: {} });
    assert.equal(runtime(), "deno");
  });
});
