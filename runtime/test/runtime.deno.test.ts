import { describe, test } from "node:test";
import { expect } from "expect";
import { importWithGlobal } from "./import-with-global.js";

describe("deno detection", () => {
  test("detects deno if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("../index.js", { Deno: {} });
    expect(runtime()).toEqual("deno");
  });
});
