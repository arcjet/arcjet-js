import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { importWithGlobal } from "./import-with-global.ts";

describe("workerd detection", () => {
  test("detects workerd if appropriate globals are available", async () => {
    const { runtime } = await importWithGlobal("../dist/index.js", {
      navigator: { userAgent: "Cloudflare-Workers" },
    });
    assert.equal(runtime(), "workerd");
  });
});
