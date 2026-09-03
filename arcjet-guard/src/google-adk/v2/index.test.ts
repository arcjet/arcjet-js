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
import * as googleAdkNamespace from "./index.ts";
import type { ArcjetDenialResult, GoogleAdkAgentContext, GuardPluginPolicy } from "./index.ts";

function verifyTypeExports(): void {
  const policy: GuardPluginPolicy | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  const agentContext: GoogleAdkAgentContext | undefined = undefined;
  void [policy, denialResult, agentContext];
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
  const ownExports = ["googleAdkContext", "guardPlugin"] as const;

  for (const funcName of ownExports) {
    const func = (googleAdkNamespace as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `@arcjet/guard/google-adk/v2 must export ${funcName} as a function`,
    );
  }
});

test("google-adk namespace exports the agnostic helpers", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (googleAdkNamespace as Record<string, unknown>)[symbol];
    assert.ok(value !== undefined, `@arcjet/guard/google-adk/v2 must export ${symbol}`);
  }
});

test("agnostic exports have same identity across Google ADK and v7 namespaces", () => {
  const agnosticSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
  ] as const;

  for (const symbol of agnosticSymbols) {
    const googleAdkValue = (googleAdkNamespace as Record<string, unknown>)[symbol];
    const v7Value = (v7Namespace as Record<string, unknown>)[symbol];

    assert.strictEqual(
      googleAdkValue,
      v7Value,
      `${symbol} must be the same object identity from both @arcjet/guard/google-adk/v2 and @arcjet/guard/vercel-ai/v7`,
    );
  }
});

test("Google ADK namespace is a strict superset of the agents barrel with same identity", () => {
  const googleAdkKeys = Object.keys(googleAdkNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      googleAdkKeys.includes(key),
      `agents barrel key "${key}" must be present in google-adk namespace`,
    );
    assert.strictEqual(
      (googleAdkNamespace as Record<string, unknown>)[key],
      (agentsBarrel as Record<string, unknown>)[key],
      `${key} must be the same object identity from both imports`,
    );
  }

  const expectedAdditions = 2;
  assert.equal(
    googleAdkKeys.length,
    agentKeys.length + expectedAdditions,
    `google-adk namespace must have agents barrel exports plus ${expectedAdditions} own exports`,
  );

  const googleAdkOnlyKeys = googleAdkKeys.filter((key) => !agentKeys.includes(key));
  const ownExportsArray = ["googleAdkContext", "guardPlugin"];
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const expectedOwnExports: readonly string[] = ownExportsArray.sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const sorted: readonly string[] = googleAdkOnlyKeys.sort();
  assert.deepEqual(sorted, expectedOwnExports);
});

test("export map has no unversioned ./google-adk, no ./google-adk/v0, and no wildcard subpaths", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(!exportKeys.includes("./google-adk"), 'export map must not have "./google-adk"');
  assert.ok(!exportKeys.includes("./google-adk/v0"), 'export map must not have "./google-adk/v0"');
  assert.ok(!exportKeys.includes("./google-adk/v1"), 'export map must not have "./google-adk/v1"');
  assert.ok(exportKeys.includes("./google-adk/v2"), 'export map must have "./google-adk/v2"');

  for (const key of exportKeys) {
    if (key.startsWith("./google-adk/")) {
      assert.equal(
        key,
        "./google-adk/v2",
        `export map must not have wildcard google-adk subpaths; found "${key}"`,
      );
    }
  }
});

test("does not export guardTool, inbound, approval, or sibling-only APIs", () => {
  const forbidden = [
    "guardTool",
    "guardInbound",
    "guardApproval",
    "guardMiddleware",
    "eveAgentContext",
    "mastraAgentContext",
    "claudeAgentContext",
    "langgraphAgentContext",
    "langchainContext",
    "openaiAgentsContext",
    "genkitContext",
    "strandsAgentContext",
    "tanstackAiContext",
    "guardInterrupt",
    "guardHooks",
    "guardToolNode",
    "guardProcessor",
    "arcjetHooks",
    "guardConnection",
    "guardCanUseTool",
    "SecurityPlugin",
  ];
  for (const key of forbidden) {
    assert.equal(
      (googleAdkNamespace as Record<string, unknown>)[key],
      undefined,
      `google-adk namespace must not export "${key}"`,
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
