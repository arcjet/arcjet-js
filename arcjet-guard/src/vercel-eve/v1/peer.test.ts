import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

function readJsonObject(path: string): Record<string, unknown> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse returns any
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

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

test("eve is an optional peer covering 1.x and not a dependency", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));

  const peerDependencies = objectField(packageJson, "peerDependencies");
  assert.ok(peerDependencies);
  // One peer entry covers both namespaces: v0 targets 0.x and v1 targets 1.x.
  assert.equal(peerDependencies["eve"], ">=0.34.0 <2");

  const peerDependenciesMeta = objectField(packageJson, "peerDependenciesMeta");
  assert.ok(peerDependenciesMeta);
  const eveMeta = objectField(peerDependenciesMeta, "eve");
  assert.ok(eveMeta);
  assert.equal(eveMeta["optional"], true);

  const dependencies = objectField(packageJson, "dependencies");
  assert.ok(!(dependencies && "eve" in dependencies));
  assert.ok(!(dependencies && "eve-v0" in dependencies));

  // The pin is v1's floor, so the unit tests and type check run v1 at the
  // lowest Eve it supports.
  const devDependencies = objectField(packageJson, "devDependencies");
  assert.ok(devDependencies);
  assert.equal(devDependencies["eve"], "1.0.0", 'devDependencies.eve must be pinned to "1.0.0"');
});
