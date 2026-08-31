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

test("@tanstack/ai is an optional peer and not a dependency", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));

  const peerDependencies = objectField(packageJson, "peerDependencies");
  assert.ok(peerDependencies);
  assert.equal(peerDependencies["@tanstack/ai"], ">=0.8.0 <1");

  const peerDependenciesMeta = objectField(packageJson, "peerDependenciesMeta");
  assert.ok(peerDependenciesMeta);
  const tanstackMeta = objectField(peerDependenciesMeta, "@tanstack/ai");
  assert.ok(tanstackMeta);
  assert.equal(tanstackMeta["optional"], true);

  const dependencies = objectField(packageJson, "dependencies");
  assert.ok(!(dependencies && "@tanstack/ai" in dependencies));

  const devDependencies = objectField(packageJson, "devDependencies");
  assert.ok(devDependencies);
  assert.equal(
    devDependencies["@tanstack/ai"],
    "0.52.0",
    'devDependencies["@tanstack/ai"] must be pinned to "0.52.0"',
  );

  const engines = objectField(packageJson, "engines");
  assert.ok(engines);
  assert.equal(engines["node"], ">=22.21.0 <23 || >=24.5.0");
});
