import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { runtime } from "../index.js";

describe("node detection", () => {
  test("detects node if appropriate globals are available", () => {
    assert.equal(runtime(), "node");
  });
});
