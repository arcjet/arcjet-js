import assert from "node:assert/strict";
import test from "node:test";

import { rawPathForUrl, rawPathFromOriginFormTarget } from "../dist/request-target.js";

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

test("rawPathForUrl returns the raw path of a target for the same URL", () => {
  assert.equal(rawPathForUrl("/a?x=1", "https://example.com/a?x=1"), "/a");
  assert.equal(rawPathForUrl("/a", new URL("https://example.com/a")), "/a");
  assert.equal(rawPathForUrl("/", "https://example.com"), "/");
});

test("rawPathForUrl forwards escapes and dot segments byte for byte", () => {
  const target = "/a/%2E%2e/../b?x=%2f";
  assert.equal(rawPathForUrl(target, "https://example.com" + target), "/a/%2E%2e/../b");
  assert.equal(rawPathForUrl(target, "https://example.com/b?x=%2f"), "/a/%2E%2e/../b");
  assert.equal(rawPathForUrl("/signed/%2F", "https://example.com/signed/%2F"), "/signed/%2F");
});

test("rawPathForUrl rejects a target for another URL", () => {
  assert.equal(rawPathForUrl("/page/%2F", "https://example.com/api/data"), undefined);
  assert.equal(rawPathForUrl("/page?a", "https://example.com/page?b"), undefined);
  assert.equal(rawPathForUrl("/page", "https://example.com/page?a"), undefined);
  assert.equal(rawPathForUrl("/api/signed", "https://example.com/signed"), undefined);
});

test("rawPathForUrl rejects targets that are not origin-form", () => {
  for (const target of [undefined, "", "*", "https://example.com/a", "a", "/a#b", "/a b"]) {
    assert.equal(rawPathForUrl(target, "https://example.com/a"), undefined);
  }
});

test("rawPathForUrl rejects an invalid URL", () => {
  assert.equal(rawPathForUrl("/a", "not a url"), undefined);
  assert.equal(rawPathForUrl("/a", "data:text/plain,a"), undefined);
});
