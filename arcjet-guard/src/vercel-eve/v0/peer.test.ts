import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Read a JSON file as a plain record. `JSON.parse` is untyped by definition, so
 * the boundary is asserted once here rather than at each call site.
 */
function readJsonObject(path: string): Record<string, unknown> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse returns any
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

/**
 * Read a nested object field, or undefined when the field is absent or not an
 * object.
 */
function objectField(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = source[key];
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- guarded by the checks above
    return value as Record<string, unknown>;
  }
  return undefined;
}

// AC1.5: eve is an optional peer dependency, not a required runtime dependency
test("AC1.5: eve is an optional peer and not a dependency", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));

  // Static assertion 1: peerDependencies.eve is exactly ">=0.30 <1"
  const peerDependencies = objectField(packageJson, "peerDependencies");
  assert.ok(peerDependencies, "package.json must have peerDependencies");

  const eveVersion = peerDependencies["eve"];
  assert.equal(
    eveVersion,
    ">=0.30 <1",
    'peerDependencies.eve must be exactly ">=0.30 <1"',
  );

  // Static assertion 2: peerDependenciesMeta.eve.optional is true
  const peerDependenciesMeta = objectField(packageJson, "peerDependenciesMeta");
  assert.ok(peerDependenciesMeta, "package.json must have peerDependenciesMeta");

  const eveMeta = objectField(peerDependenciesMeta, "eve");
  assert.ok(eveMeta, "peerDependenciesMeta must have an eve field");

  const isOptional = eveMeta["optional"];
  assert.equal(
    isOptional,
    true,
    "peerDependenciesMeta.eve.optional must be true",
  );

  // Static assertion 3: eve is NOT in dependencies
  const dependencies = objectField(packageJson, "dependencies");
  assert.ok(
    !(dependencies && "eve" in dependencies),
    "eve must not be in dependencies (it is a peer only)",
  );
});
