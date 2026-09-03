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
import * as openaiAgentsNamespace from "./index.ts";
import type { ArcjetDenialResult, GuardToolPolicy, OpenAIAgentsAgentContext } from "./index.ts";

function verifyTypeExports(): void {
  const toolPolicy: GuardToolPolicy<Record<string, unknown>> | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  const agentContext: OpenAIAgentsAgentContext | undefined = undefined;
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

test("exports the two own helpers as functions", () => {
  const ownExports = ["openaiAgentsContext", "guardTool"] as const;

  for (const funcName of ownExports) {
    const func = (openaiAgentsNamespace as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `@arcjet/guard/openai-agents/v0 must export ${funcName} as a function`,
    );
  }
});

test("openai-agents namespace exports the agnostic helpers", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (openaiAgentsNamespace as Record<string, unknown>)[symbol];
    assert.ok(value !== undefined, `@arcjet/guard/openai-agents/v0 must export ${symbol}`);
  }
});

test("agnostic exports have same identity across OpenAI Agents and v7 namespaces", () => {
  const agnosticSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
  ] as const;

  for (const symbol of agnosticSymbols) {
    const openaiAgentsValue = (openaiAgentsNamespace as Record<string, unknown>)[symbol];
    const v7Value = (v7Namespace as Record<string, unknown>)[symbol];

    assert.strictEqual(
      openaiAgentsValue,
      v7Value,
      `${symbol} must be the same object identity from both @arcjet/guard/openai-agents/v0 and @arcjet/guard/vercel-ai/v7`,
    );
  }
});

test("OpenAI Agents namespace is a strict superset of the agents barrel with same identity", () => {
  const openaiAgentsKeys = Object.keys(openaiAgentsNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      openaiAgentsKeys.includes(key),
      `agents barrel key "${key}" must be present in openai-agents namespace`,
    );
    assert.strictEqual(
      (openaiAgentsNamespace as Record<string, unknown>)[key],
      (agentsBarrel as Record<string, unknown>)[key],
      `${key} must be the same object identity from both imports`,
    );
  }

  const expectedAdditions = 2;
  assert.equal(
    openaiAgentsKeys.length,
    agentKeys.length + expectedAdditions,
    `openai-agents namespace must have agents barrel exports plus ${expectedAdditions} own exports`,
  );

  const openaiAgentsOnlyKeys = openaiAgentsKeys.filter((key) => !agentKeys.includes(key));
  const ownExportsArray = ["guardTool", "openaiAgentsContext"];
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const expectedOwnExports: readonly string[] = ownExportsArray.sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const sorted: readonly string[] = openaiAgentsOnlyKeys.sort();
  assert.deepEqual(sorted, expectedOwnExports);
});

test("export map has no unversioned ./openai-agents and no wildcard subpaths", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(!exportKeys.includes("./openai-agents"), 'export map must not have "./openai-agents"');
  assert.ok(exportKeys.includes("./openai-agents/v0"), 'export map must have "./openai-agents/v0"');

  for (const key of exportKeys) {
    if (key.startsWith("./openai-agents/")) {
      assert.equal(
        key,
        "./openai-agents/v0",
        `export map must not have wildcard openai-agents subpaths; found "${key}"`,
      );
    }
  }
});

test("does not export Eve / Mastra / Claude / LangGraph-only APIs", () => {
  const forbidden = [
    "eveAgentContext",
    "mastraAgentContext",
    "claudeAgentContext",
    "langgraphAgentContext",
    "genkitContext",
    "langchainContext",
    "strandsAgentContext",
    "tanstackAiContext",
    "googleAdkContext",
    "guardMiddleware",
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
      (openaiAgentsNamespace as Record<string, unknown>)[key],
      undefined,
      `openai-agents namespace must not export "${key}"`,
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
