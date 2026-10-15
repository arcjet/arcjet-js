import assert from "node:assert/strict";
import test from "node:test";

import { rawPathFromOriginFormTarget } from "../dist/request-target.js";

test("rawPathFromOriginFormTarget preserves the signed path bytes", () => {
  const target = "/a/%2E%2e/../b?x=%2f";
  assert.equal(rawPathFromOriginFormTarget(target), "/a/%2E%2e/../b");
  assert.notEqual(new URL(target, "https://example.com").pathname, "/a/%2E%2e/../b");
  assert.equal(rawPathFromOriginFormTarget("/"), "/");
  assert.equal(rawPathFromOriginFormTarget("/a??b"), "/a");
});

test("rawPathFromOriginFormTarget rejects targets without raw origin-form provenance", () => {
  for (const target of [
    undefined,
    "",
    "*",
    "https://example.com/a",
    "a/b",
    "/a#fragment",
    "/a b",
    "/a\r\nb",
    "/caf\u00e9",
  ]) {
    assert.equal(rawPathFromOriginFormTarget(target), undefined);
  }
});
