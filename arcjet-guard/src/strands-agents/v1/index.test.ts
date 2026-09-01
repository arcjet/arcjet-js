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
import * as strandsNamespace from "./index.ts";
import type {
  ArcjetDenialResult,
  GuardHooksPolicy,
  GuardToolPolicy,
  StrandsAgentContext,
} from "./index.ts";

function verifyTypeExports(): void {
  const toolPolicy: GuardToolPolicy<Record<string, unknown>> | undefined = undefined;
  const hooksPolicy: GuardHooksPolicy | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  const agentContext: StrandsAgentContext | undefined = undefined;
  void [toolPolicy, hooksPolicy, denialResult, agentContext];
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
  const ownExports = ["strandsAgentContext", "guardTool", "guardHooks"] as const;

  for (const funcName of ownExports) {
    const func = (strandsNamespace as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `@arcjet/guard/strands-agents/v1 must export ${funcName} as a function`,
    );
  }
});

test("strands-agents namespace exports the agnostic helpers", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (strandsNamespace as Record<string, unknown>)[symbol];
    assert.ok(value !== undefined, `@arcjet/guard/strands-agents/v1 must export ${symbol}`);
  }
});

test("agnostic exports have same identity across Strands and v7 namespaces", () => {
  const agnosticSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
  ] as const;

  for (const symbol of agnosticSymbols) {
    const strandsValue = (strandsNamespace as Record<string, unknown>)[symbol];
    const v7Value = (v7Namespace as Record<string, unknown>)[symbol];

    assert.strictEqual(
      strandsValue,
      v7Value,
      `${symbol} must be the same object identity from both @arcjet/guard/strands-agents/v1 and @arcjet/guard/vercel-ai/v7`,
    );
  }
});

test("Strands namespace is a strict superset of the agents barrel with same identity", () => {
  const strandsKeys = Object.keys(strandsNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      strandsKeys.includes(key),
      `agents barrel key "${key}" must be present in strands-agents namespace`,
    );
    assert.strictEqual(
      (strandsNamespace as Record<string, unknown>)[key],
      (agentsBarrel as Record<string, unknown>)[key],
      `${key} must be the same object identity from both imports`,
    );
  }

  const expectedAdditions = 3;
  assert.equal(
    strandsKeys.length,
    agentKeys.length + expectedAdditions,
    `strands-agents namespace must have agents barrel exports plus ${expectedAdditions} own exports`,
  );

  const strandsOnlyKeys = strandsKeys.filter((key) => !agentKeys.includes(key));
  const ownExportsArray = ["guardTool", "guardHooks", "strandsAgentContext"];
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const expectedOwnExports: readonly string[] = ownExportsArray.sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const sorted: readonly string[] = strandsOnlyKeys.sort();
  assert.deepEqual(sorted, expectedOwnExports);
});

test("export map has no unversioned ./strands-agents and no wildcard subpaths", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(!exportKeys.includes("./strands-agents"), 'export map must not have "./strands-agents"');
  assert.ok(
    exportKeys.includes("./strands-agents/v1"),
    'export map must have "./strands-agents/v1"',
  );

  for (const key of exportKeys) {
    if (key.startsWith("./strands-agents/")) {
      assert.equal(
        key,
        "./strands-agents/v1",
        `export map must not have wildcard strands-agents subpaths; found "${key}"`,
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
    "langchainContext",
    "openaiAgentsContext",
    "genkitContext",
    "tanstackAiContext",
    "guardInbound",
    "guardApproval",
    "guardInterrupt",
    "guardToolNode",
    "guardMiddleware",
    "guardProcessor",
    "arcjetHooks",
    "guardConnection",
    "guardCanUseTool",
  ];
  for (const key of forbidden) {
    assert.equal(
      (strandsNamespace as Record<string, unknown>)[key],
      undefined,
      `strands-agents namespace must not export "${key}"`,
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
