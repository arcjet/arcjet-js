import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

// The proxy-resolution logic is intentionally duplicated between
// `@arcjet/transport` and `@arcjet/guard` (the guard copy stays edge-safe with
// no imports). The two are allowed to differ only in their `detectProxy` entry
// point and in formatting; the shared helpers (`proxyForUrl`, `isNoProxy`,
// `firstValue`) must stay logically identical, per the "keep in sync" comments
// in both files. This test fails if they drift, so a fix applied to one copy
// can't silently miss the other.

// Everything from the first shared helper to the end of the file, with comments
// and all whitespace removed so only the logic (tokens) is compared — line
// wrapping and each package's formatter are ignored.
function sharedHelpers(source: string): string {
  const start = source.indexOf("function proxyForUrl");
  assert.notEqual(start, -1, "could not locate the shared proxy helpers");
  return source
    .slice(start)
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/\/\/.*$/gm, "") // line comments
    .replace(/\s+/g, ""); // all whitespace
}

function read(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8",
  );
}

test("proxy-resolution helpers stay in sync across packages", function () {
  const transport = sharedHelpers(read("../detect-proxy.ts"));
  const guard = sharedHelpers(read("../../arcjet-guard/src/detect-proxy.ts"));

  assert.equal(
    guard,
    transport,
    "The shared proxy helpers in transport/detect-proxy.ts and " +
      "arcjet-guard/src/detect-proxy.ts have drifted. Apply the change to both.",
  );
});
