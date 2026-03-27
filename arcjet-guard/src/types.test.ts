import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { symbolArcjetInternal } from "./symbol.ts";

describe("kInternal", () => {
  test("is a symbol", () => {
    assert.equal(typeof symbolArcjetInternal, "symbol");
  });

  test("is consistent via Symbol.for", () => {
    assert.equal(symbolArcjetInternal, Symbol.for("arcjet.guard.internal"));
  });

  test("is not enumerable on objects", () => {
    const obj = { [symbolArcjetInternal]: { configId: "abc" }, type: "TOKEN_BUCKET" };
    assert.deepEqual(Object.keys(obj), ["type"]);
  });

  test("is hidden from JSON.stringify", () => {
    const obj = { [symbolArcjetInternal]: { configId: "abc" }, type: "TOKEN_BUCKET" };
    const json = JSON.stringify(obj);
    assert.equal(json, '{"type":"TOKEN_BUCKET"}');
  });

  test("is accessible via bracket notation", () => {
    const obj = { [symbolArcjetInternal]: { configId: "abc", inputId: "def" } };
    assert.equal(obj[symbolArcjetInternal].configId, "abc");
    assert.equal(obj[symbolArcjetInternal].inputId, "def");
  });

  test("does not appear in for...in", () => {
    const obj = { [symbolArcjetInternal]: { configId: "abc" }, visible: true };
    const keys: string[] = [];
    for (const k in obj) {
      keys.push(k);
    }
    assert.deepEqual(keys, ["visible"]);
  });
});
