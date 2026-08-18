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

test("@langchain/langgraph and @langchain/core are optional peers and not dependencies", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));

  const peerDependencies = objectField(packageJson, "peerDependencies");
  assert.ok(peerDependencies);
  assert.equal(peerDependencies["@langchain/langgraph"], ">=1 <2");
  assert.equal(peerDependencies["@langchain/core"], ">=1 <2");

  const peerDependenciesMeta = objectField(packageJson, "peerDependenciesMeta");
  assert.ok(peerDependenciesMeta);
  const langgraphMeta = objectField(peerDependenciesMeta, "@langchain/langgraph");
  assert.ok(langgraphMeta);
  assert.equal(langgraphMeta["optional"], true);
  const coreMeta = objectField(peerDependenciesMeta, "@langchain/core");
  assert.ok(coreMeta);
  assert.equal(coreMeta["optional"], true);

  const dependencies = objectField(packageJson, "dependencies");
  assert.ok(!(dependencies && "@langchain/langgraph" in dependencies));
  assert.ok(!(dependencies && "@langchain/core" in dependencies));
});
