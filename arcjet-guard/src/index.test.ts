import assert from "node:assert/strict";
import { test } from "node:test";

import * as guard from "./index.ts";

test("@arcjet/guard re-exports the implementation from arcjet", () => {
  assert.equal(typeof guard.launchArcjet, "function");
  assert.equal(typeof guard.registerArcjet, "function");
  assert.equal(typeof guard.unregisterArcjet, "function");
});
