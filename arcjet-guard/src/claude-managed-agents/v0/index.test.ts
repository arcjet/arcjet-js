import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  collectTsFiles,
  EXPECTED_CONDITIONS,
  EXPECTED_ROOT_KEYS,
  extractImportSpecifiers,
  sortedKeys,
} from "../../../test/_shared/source-scan.ts";
import * as agentsBarrel from "../../agents/index.ts";
import * as v7Namespace from "../../vercel-ai/v7/index.ts";
import * as managedNamespace from "./index.ts";
import type {
  ArcjetDenialResult,
  ClaudeManagedAgentsContext,
  GuardCustomToolPolicy,
  GuardEventsPolicy,
} from "./index.ts";

function verifyTypeExports(): void {
  const toolPolicy: GuardCustomToolPolicy | undefined = undefined;
  const eventsPolicy: GuardEventsPolicy | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  const agentContext: ClaudeManagedAgentsContext | undefined = undefined;
  void [toolPolicy, eventsPolicy, denialResult, agentContext];
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
  const ownExports = ["claudeManagedAgentsContext", "guardCustomTool", "guardEvents"] as const;

  for (const funcName of ownExports) {
    const func = (managedNamespace as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `@arcjet/guard/claude-managed-agents/v0 must export ${funcName} as a function`,
    );
  }
});

test("managed-agents namespace exports the agnostic helpers", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (managedNamespace as Record<string, unknown>)[symbol];
    assert.ok(value !== undefined, `@arcjet/guard/claude-managed-agents/v0 must export ${symbol}`);
  }
});

test("agnostic exports have same identity across Managed Agents and v7 namespaces", () => {
  const agnosticSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
  ] as const;

  for (const symbol of agnosticSymbols) {
    const managedValue = (managedNamespace as Record<string, unknown>)[symbol];
    const v7Value = (v7Namespace as Record<string, unknown>)[symbol];

    assert.strictEqual(
      managedValue,
      v7Value,
      `${symbol} must be the same object identity from both @arcjet/guard/claude-managed-agents/v0 and @arcjet/guard/vercel-ai/v7`,
    );
  }
});

test("Managed Agents namespace is a strict superset of the agents barrel with same identity", () => {
  const managedKeys = Object.keys(managedNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      managedKeys.includes(key),
      `agents barrel key "${key}" must be present in managed-agents namespace`,
    );
    assert.strictEqual(
      (managedNamespace as Record<string, unknown>)[key],
      (agentsBarrel as Record<string, unknown>)[key],
      `${key} must be the same object identity from both imports`,
    );
  }

  const expectedAdditions = 3;
  assert.equal(
    managedKeys.length,
    agentKeys.length + expectedAdditions,
    `managed-agents namespace must have agents barrel exports plus ${expectedAdditions} own exports`,
  );

  const managedOnlyKeys = managedKeys.filter((key) => !agentKeys.includes(key));
  const ownExportsArray = ["claudeManagedAgentsContext", "guardCustomTool", "guardEvents"];
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const expectedOwnExports: readonly string[] = ownExportsArray.sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const sorted: readonly string[] = managedOnlyKeys.sort();
  assert.deepEqual(sorted, expectedOwnExports);
});

test("export map has no unversioned ./claude-managed-agents, no /v1, and no wildcards", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(
    !exportKeys.includes("./claude-managed-agents"),
    'export map must not have "./claude-managed-agents"',
  );
  assert.ok(
    !exportKeys.includes("./claude-managed-agents/v1"),
    'export map must not have "./claude-managed-agents/v1"',
  );
  assert.ok(
    exportKeys.includes("./claude-managed-agents/v0"),
    'export map must have "./claude-managed-agents/v0"',
  );

  for (const key of exportKeys) {
    if (key.startsWith("./claude-managed-agents/")) {
      assert.equal(
        key,
        "./claude-managed-agents/v0",
        `export map must not have wildcard claude-managed-agents subpaths; found "${key}"`,
      );
    }
  }
});

test("does not export Agent SDK or Eve-only APIs", () => {
  const forbidden = [
    "guardTool",
    "guardHooks",
    "guardInbound",
    "claudeAgentContext",
    "eveAgentContext",
    "guardApproval",
    "arcjetHooks",
    "canUseTool",
    "guardCanUseTool",
    "guardConfirmation",
  ];
  for (const key of forbidden) {
    assert.equal(
      (managedNamespace as Record<string, unknown>)[key],
      undefined,
      `managed-agents namespace must not export "${key}"`,
    );
  }
});

test("namespace source never imports the Claude Agent SDK", () => {
  const namespaceDir = resolve(import.meta.dirname, "..");
  const errors: string[] = [];
  for (const filePath of collectTsFiles(namespaceDir)) {
    if (filePath.endsWith(".test.ts")) {
      continue;
    }
    const content = readFileSync(filePath, "utf-8");
    for (const specifier of extractImportSpecifiers(content)) {
      if (
        specifier === "@anthropic-ai/claude-agent-sdk" ||
        specifier.startsWith("@anthropic-ai/claude-agent-sdk/")
      ) {
        errors.push(`${filePath}: ${specifier}`);
      }
      if (specifier.includes("/claude-agent-sdk/")) {
        errors.push(`${filePath}: sibling Agent SDK namespace via ${specifier}`);
      }
    }
  }
  assert.deepEqual(errors, [], `Agent SDK imports found:\n${errors.join("\n")}`);
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
