import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { runtime } from "@arcjet/runtime";

describe("node detection", () => {
  test("detects node if appropriate globals are available", () => {
    assert.equal(runtime(), "node");
  });
});
