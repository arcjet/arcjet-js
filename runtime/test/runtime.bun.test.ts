import { describe, test } from "node:test";
import { expect } from "expect";
import { importWithGlobal } from "./import-with-global.js";

describe("bun detection", () => {
  test("detects bun if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("../index.js", { Bun: {} });
    expect(runtime()).toEqual("bun");
  });
});
