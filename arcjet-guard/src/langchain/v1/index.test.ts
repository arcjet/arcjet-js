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
import * as langchainNamespace from "./index.ts";
import type { ArcjetDenialResult, GuardToolPolicy, LangChainAgentContext } from "./index.ts";

function verifyTypeExports(): void {
  const toolPolicy: GuardToolPolicy<Record<string, unknown>> | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  const agentContext: LangChainAgentContext | undefined = undefined;
  void [toolPolicy, denialResult, agentContext];
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
  const ownExports = ["langchainContext", "guardTool", "guardMiddleware"] as const;

  for (const funcName of ownExports) {
    const func = (langchainNamespace as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `@arcjet/guard/langchain/v1 must export ${funcName} as a function`,
    );
  }
});

test("langchain namespace exports the agnostic helpers", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (langchainNamespace as Record<string, unknown>)[symbol];
    assert.ok(value !== undefined, `@arcjet/guard/langchain/v1 must export ${symbol}`);
  }
});

test("agnostic exports have same identity across LangChain and v7 namespaces", () => {
  const agnosticSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
  ] as const;

  for (const symbol of agnosticSymbols) {
    const langchainValue = (langchainNamespace as Record<string, unknown>)[symbol];
    const v7Value = (v7Namespace as Record<string, unknown>)[symbol];

    assert.strictEqual(
      langchainValue,
      v7Value,
      `${symbol} must be the same object identity from both @arcjet/guard/langchain/v1 and @arcjet/guard/vercel-ai/v7`,
    );
  }
});

test("LangChain namespace is a strict superset of the agents barrel with same identity", () => {
  const langchainKeys = Object.keys(langchainNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      langchainKeys.includes(key),
      `agents barrel key "${key}" must be present in langchain namespace`,
    );
    assert.strictEqual(
      (langchainNamespace as Record<string, unknown>)[key],
      (agentsBarrel as Record<string, unknown>)[key],
      `${key} must be the same object identity from both imports`,
    );
  }

  const expectedAdditions = 3;
  assert.equal(
    langchainKeys.length,
    agentKeys.length + expectedAdditions,
    `langchain namespace must have agents barrel exports plus ${expectedAdditions} own exports`,
  );

  const langchainOnlyKeys = langchainKeys.filter((key) => !agentKeys.includes(key));
  const ownExportsArray = ["guardTool", "guardMiddleware", "langchainContext"];
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const expectedOwnExports: readonly string[] = ownExportsArray.sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const sorted: readonly string[] = langchainOnlyKeys.sort();
  assert.deepEqual(sorted, expectedOwnExports);
});

test("export map has no unversioned ./langchain and no wildcard subpaths", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(!exportKeys.includes("./langchain"), 'export map must not have "./langchain"');
  assert.ok(exportKeys.includes("./langchain/v1"), 'export map must have "./langchain/v1"');

  for (const key of exportKeys) {
    if (key.startsWith("./langchain/")) {
      assert.equal(
        key,
        "./langchain/v1",
        `export map must not have wildcard langchain subpaths; found "${key}"`,
      );
    }
  }
});

test("does not export Eve / Mastra / Claude / LangGraph / OpenAI / Genkit-only APIs", () => {
  const forbidden = [
    "eveAgentContext",
    "mastraAgentContext",
    "claudeAgentContext",
    "langgraphAgentContext",
    "openaiAgentsContext",
    "genkitContext",
    "guardInbound",
    "guardApproval",
    "guardInterrupt",
    "guardHooks",
    "guardToolNode",
    "guardProcessor",
    "arcjetHooks",
    "guardConnection",
    "guardCanUseTool",
  ];
  for (const key of forbidden) {
    assert.equal(
      (langchainNamespace as Record<string, unknown>)[key],
      undefined,
      `langchain namespace must not export "${key}"`,
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
