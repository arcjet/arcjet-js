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

test("langchain and @langchain/core are optional peers and not dependencies", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));

  const peerDependencies = objectField(packageJson, "peerDependencies");
  assert.ok(peerDependencies);
  assert.equal(peerDependencies["langchain"], ">=1.2.0 <2");
  // `@langchain/core` stays at the range langgraph/v1 already shipped.
  // Tightening it to >=1.2.0 would constrain langgraph-only consumers for a
  // reason that applies to neither namespace: @langchain/langgraph@1.4.10
  // itself peer-requires ^1.1.48, and anyone using this namespace installs
  // `langchain`, whose own ^1.2.9 peer on core is the binding constraint.
  assert.equal(peerDependencies["@langchain/core"], ">=1 <2");
  // This namespace does not add @langchain/langgraph as a new peer.
  // langgraph/v1 already declared it.
  assert.equal(peerDependencies["@langchain/langgraph"], ">=1 <2");

  const peerDependenciesMeta = objectField(packageJson, "peerDependenciesMeta");
  assert.ok(peerDependenciesMeta);
  const langchainMeta = objectField(peerDependenciesMeta, "langchain");
  assert.ok(langchainMeta);
  assert.equal(langchainMeta["optional"], true);
  const coreMeta = objectField(peerDependenciesMeta, "@langchain/core");
  assert.ok(coreMeta);
  assert.equal(coreMeta["optional"], true);

  const dependencies = objectField(packageJson, "dependencies");
  assert.ok(!(dependencies && "langchain" in dependencies));
  assert.ok(!(dependencies && "@langchain/core" in dependencies));
  assert.ok(!(dependencies && "@langchain/langgraph" in dependencies));
});
