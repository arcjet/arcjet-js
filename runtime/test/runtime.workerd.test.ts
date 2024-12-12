import { describe, test } from "node:test";
import { expect } from "expect";
import { importWithGlobal } from "./import-with-global.js";

describe("workerd detection", () => {
  test("detects workerd if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("../index.js", {
      navigator: { userAgent: "Cloudflare-Workers" },
    });
    expect(runtime()).toEqual("workerd");
  });
});
