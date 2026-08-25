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

test("@strands-agents/sdk is an optional peer and not a dependency", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));

  const peerDependencies = objectField(packageJson, "peerDependencies");
  assert.ok(peerDependencies);
  assert.equal(peerDependencies["@strands-agents/sdk"], ">=1.1.0 <2");

  const peerDependenciesMeta = objectField(packageJson, "peerDependenciesMeta");
  assert.ok(peerDependenciesMeta);
  const strandsMeta = objectField(peerDependenciesMeta, "@strands-agents/sdk");
  assert.ok(strandsMeta);
  assert.equal(strandsMeta["optional"], true);

  const dependencies = objectField(packageJson, "dependencies");
  assert.ok(!(dependencies && "@strands-agents/sdk" in dependencies));

  // Zod is Strands' peer, not ours: nothing in this namespace types against
  // it, and adding it would force it on every `@arcjet/guard` user.
  assert.ok(!("zod" in peerDependencies));
  assert.ok(!(dependencies && "zod" in dependencies));
});
