import { describe, test } from "node:test";
import { expect } from "expect";

import { runtime } from "../index.js";

describe("node detection", () => {
  test("detects node if appropriate globals are available", () => {
    expect(runtime()).toEqual("node");
  });
});
