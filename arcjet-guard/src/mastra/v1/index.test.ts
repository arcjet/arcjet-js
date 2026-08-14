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
import * as mastraNamespace from "./index.ts";
import type {
  ArcjetDenialResult,
  GuardHooksPolicy,
  GuardProcessorPolicy,
  GuardToolPolicy,
  MastraAgentContext,
} from "./index.ts";

function verifyTypeExports(): void {
  const toolPolicy: GuardToolPolicy<Record<string, unknown>> | undefined = undefined;
  const processorPolicy: GuardProcessorPolicy | undefined = undefined;
  const hooksPolicy: GuardHooksPolicy | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  const agentContext: MastraAgentContext | undefined = undefined;
  void [toolPolicy, processorPolicy, hooksPolicy, denialResult, agentContext];
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

test("exports the four own helpers as functions", () => {
  const ownExports = ["mastraAgentContext", "guardTool", "guardProcessor", "guardHooks"] as const;

  for (const funcName of ownExports) {
    const func = (mastraNamespace as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `@arcjet/guard/mastra/v1 must export ${funcName} as a function`,
    );
  }
});

test("mastra namespace exports the agnostic helpers", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (mastraNamespace as Record<string, unknown>)[symbol];
    assert.ok(value !== undefined, `@arcjet/guard/mastra/v1 must export ${symbol}`);
  }
});

test("agnostic exports have same identity across Mastra and v7 namespaces", () => {
  const agnosticSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
  ] as const;

  for (const symbol of agnosticSymbols) {
    const mastraValue = (mastraNamespace as Record<string, unknown>)[symbol];
    const v7Value = (v7Namespace as Record<string, unknown>)[symbol];

    assert.strictEqual(
      mastraValue,
      v7Value,
      `${symbol} must be the same object identity from both @arcjet/guard/mastra/v1 and @arcjet/guard/vercel-ai/v7`,
    );
  }
});

test("Mastra namespace is a strict superset of the agents barrel with same identity", () => {
  const mastraKeys = Object.keys(mastraNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      mastraKeys.includes(key),
      `agents barrel key "${key}" must be present in mastra namespace`,
    );
    assert.strictEqual(
      (mastraNamespace as Record<string, unknown>)[key],
      (agentsBarrel as Record<string, unknown>)[key],
      `${key} must be the same object identity from both imports`,
    );
  }

  const expectedAdditions = 6;
  assert.equal(
    mastraKeys.length,
    agentKeys.length + expectedAdditions,
    `mastra namespace must have agents barrel exports plus ${expectedAdditions} own exports`,
  );

  const mastraOnlyKeys = mastraKeys.filter((key) => !agentKeys.includes(key));
  const ownExportsArray = [
    "MASTRA_RESOURCE_ID_KEY",
    "MASTRA_THREAD_ID_KEY",
    "guardHooks",
    "guardProcessor",
    "guardTool",
    "mastraAgentContext",
  ];
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const expectedOwnExports: readonly string[] = ownExportsArray.sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const sorted: readonly string[] = mastraOnlyKeys.sort();
  assert.deepEqual(sorted, expectedOwnExports);
});

test("export map has no unversioned ./mastra and no wildcard mastra subpaths", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(!exportKeys.includes("./mastra"), 'export map must not have "./mastra"');
  assert.ok(exportKeys.includes("./mastra/v1"), 'export map must have "./mastra/v1"');

  for (const key of exportKeys) {
    if (key.startsWith("./mastra/")) {
      assert.equal(
        key,
        "./mastra/v1",
        `export map must not have wildcard mastra subpaths; found "${key}"`,
      );
    }
  }
});

test("does not export Eve-only APIs onto the Mastra namespace", () => {
  const forbidden = [
    "eveAgentContext",
    "guardInbound",
    "guardApproval",
    "arcjetHooks",
    "guardConnection",
  ];
  for (const key of forbidden) {
    assert.equal(
      (mastraNamespace as Record<string, unknown>)[key],
      undefined,
      `mastra namespace must not export Eve API "${key}"`,
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
