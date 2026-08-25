import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  EXPECTED_CONDITIONS,
  EXPECTED_ROOT_KEYS,
  sortedKeys,
} from "../../../test/_shared/source-scan.ts";
import * as agentsBarrel from "../../agents/index.ts";
import * as v7Namespace from "../../vercel-ai/v7/index.ts";
import * as langgraphNamespace from "./index.ts";
import type {
  ArcjetDenialResult,
  GuardToolNodePolicy,
  GuardToolPolicy,
  LangGraphAgentContext,
} from "./index.ts";

function verifyTypeExports(): void {
  const toolPolicy: GuardToolPolicy<Record<string, unknown>> | undefined = undefined;
  const nodePolicy: GuardToolNodePolicy | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  const agentContext: LangGraphAgentContext | undefined = undefined;
  void [toolPolicy, nodePolicy, denialResult, agentContext];
}

verifyTypeExports();

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

test("exports the three own helpers as functions", () => {
  const ownExports = ["langgraphAgentContext", "guardTool", "guardToolNode"] as const;

  for (const funcName of ownExports) {
    const func = (langgraphNamespace as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `@arcjet/guard/langgraph/v1 must export ${funcName} as a function`,
    );
  }
});

test("langgraph namespace exports the agnostic helpers", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (langgraphNamespace as Record<string, unknown>)[symbol];
    assert.ok(value !== undefined, `@arcjet/guard/langgraph/v1 must export ${symbol}`);
  }
});

test("agnostic exports have same identity across LangGraph and v7 namespaces", () => {
  const agnosticSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
  ] as const;

  for (const symbol of agnosticSymbols) {
    const langgraphValue = (langgraphNamespace as Record<string, unknown>)[symbol];
    const v7Value = (v7Namespace as Record<string, unknown>)[symbol];

    assert.strictEqual(
      langgraphValue,
      v7Value,
      `${symbol} must be the same object identity from both @arcjet/guard/langgraph/v1 and @arcjet/guard/vercel-ai/v7`,
    );
  }
});

test("LangGraph namespace is a strict superset of the agents barrel with same identity", () => {
  const langgraphKeys = Object.keys(langgraphNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      langgraphKeys.includes(key),
      `agents barrel key "${key}" must be present in langgraph namespace`,
    );
    assert.strictEqual(
      (langgraphNamespace as Record<string, unknown>)[key],
      (agentsBarrel as Record<string, unknown>)[key],
      `${key} must be the same object identity from both imports`,
    );
  }

  const expectedAdditions = 3;
  assert.equal(
    langgraphKeys.length,
    agentKeys.length + expectedAdditions,
    `langgraph namespace must have agents barrel exports plus ${expectedAdditions} own exports`,
  );

  const langgraphOnlyKeys = langgraphKeys.filter((key) => !agentKeys.includes(key));
  const ownExportsArray = ["guardTool", "guardToolNode", "langgraphAgentContext"];
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const expectedOwnExports: readonly string[] = ownExportsArray.sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const sorted: readonly string[] = langgraphOnlyKeys.sort();
  assert.deepEqual(sorted, expectedOwnExports);
});

test("export map has no unversioned ./langgraph and no wildcard langgraph subpaths", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(!exportKeys.includes("./langgraph"), 'export map must not have "./langgraph"');
  assert.ok(exportKeys.includes("./langgraph/v1"), 'export map must have "./langgraph/v1"');

  for (const key of exportKeys) {
    if (key.startsWith("./langgraph/")) {
      assert.equal(
        key,
        "./langgraph/v1",
        `export map must not have wildcard langgraph subpaths; found "${key}"`,
      );
    }
  }
});

test("does not export Eve / Mastra-only APIs onto the LangGraph namespace", () => {
  const forbidden = [
    "eveAgentContext",
    "mastraAgentContext",
    "genkitContext",
    "langchainContext",
    "strandsAgentContext",
    "guardMiddleware",
    "guardInbound",
    "guardApproval",
    "guardInterrupt",
    "guardProcessor",
    "arcjetHooks",
    "guardConnection",
  ];
  for (const key of forbidden) {
    assert.equal(
      (langgraphNamespace as Record<string, unknown>)[key],
      undefined,
      `langgraph namespace must not export "${key}"`,
    );
  }
});

test("export map must not have ./agents", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap);
  assert.ok(!Object.keys(exportsMap).includes("./agents"));
});

test("root export map keys and runtime conditions are correct", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap);

  assert.deepEqual(sortedKeys(exportsMap), EXPECTED_ROOT_KEYS);

  const rootEntry = objectField(exportsMap, ".");
  assert.ok(rootEntry);
  assert.deepEqual(sortedKeys(rootEntry), EXPECTED_CONDITIONS);
});
