import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EVE_NODE_ENGINE_MESSAGE,
  assertEveEngine,
  currentNodeMajor,
  eveEngineError,
  nodeMajor,
} from "./engine.ts";

test("Eve engine error is needs Node 24", () => {
  assert.equal(eveEngineError().message, `@arcjet/guard/vercel-eve/v0: ${EVE_NODE_ENGINE_MESSAGE}`);
  assert.equal(EVE_NODE_ENGINE_MESSAGE, "needs Node 24.");
});

test("nodeMajor reads the leading segment", () => {
  assert.equal(nodeMajor({ node: "22.21.0" }), 22);
  assert.equal(nodeMajor({ node: "24.5.0" }), 24);
  assert.equal(nodeMajor({ node: "26.0.0" }), 26);
  assert.equal(nodeMajor({ node: "" }), undefined);
  assert.equal(nodeMajor({}), undefined);
});

test("assertEveEngine accepts Node 24 and above", () => {
  assert.doesNotThrow(() => {
    assertEveEngine({ node: "24.0.0" });
  });
  assert.doesNotThrow(() => {
    assertEveEngine({ node: "24.5.0" });
  });
  assert.doesNotThrow(() => {
    assertEveEngine({ node: "26.3.1" });
  });
});

test("assertEveEngine reads the running process when no versions are passed", () => {
  const major = currentNodeMajor();
  if (major !== undefined && major >= 24) {
    assert.doesNotThrow(() => {
      assertEveEngine();
    });
    return;
  }
  assert.throws(() => {
    assertEveEngine();
  }, /needs Node 24/);
});

test("assertEveEngine fails below Node 24 with needs Node 24", () => {
  assert.throws(() => {
    assertEveEngine({ node: "22.21.0" });
  }, /needs Node 24/);
  assert.throws(() => {
    assertEveEngine({ node: "23.11.0" });
  }, /needs Node 24/);
  assert.throws(() => {
    assertEveEngine({});
  }, /needs Node 24/);
});
