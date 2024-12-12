import { describe, test } from "node:test";
import { expect } from "expect";
import { importWithGlobal } from "./import-with-global.js";

describe("edge-light detection", () => {
  test("detects edge-light if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("../index.js", {
      EdgeRuntime: {},
    });
    expect(runtime()).toEqual("edge-light");
  });
});
