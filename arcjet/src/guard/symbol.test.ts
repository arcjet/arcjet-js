import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { symbolArcjetInternal } from "./symbol.ts";

describe("kInternal (symbol)", () => {
  test("is a symbol", () => {
    assert.equal(typeof symbolArcjetInternal, "symbol");
  });

  test("is consistent via Symbol.for", () => {
    assert.equal(symbolArcjetInternal, Symbol.for("arcjet.guard.internal"));
  });
});
