import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  sortedKeys,
  EXPECTED_ROOT_KEYS,
  EXPECTED_CONDITIONS,
} from "../../../test/_shared/source-scan.ts";
import * as agentsBarrel from "../../agents/index.ts";
// This file imports vercel-ai/v7/index.ts which imports "ai" at runtime to verify
// proxy identity across both namespaces. This test is not part of the Node-22-without-Eve
// story covered by AC2.2, which applies only to Eve's own files. AC1.2 requires
// cross-namespace assertions that can only be verified when ai is available.
import * as v7Namespace from "../../vercel-ai/v7/index.ts";
import { currentNodeMajor } from "./engine.ts";
import type {
  ArcjetHookFamily,
  ArcjetHooksOptions,
  GuardApprovalPolicy,
  GuardApprovalResponsePolicy,
  GuardInboundOptions,
  GuardToolPolicy,
  InboundVerdict,
  ArcjetDenialResult,
} from "./index.ts";

/**
 * `Object.keys` on a namespace import never lists type-only exports, so assert
 * them at type level instead: this stops compiling if the barrel drops one.
 */
function verifyTypeExports(): void {
  const approvalPolicy: GuardApprovalPolicy | undefined = undefined;
  const approvalResponsePolicy: GuardApprovalResponsePolicy | undefined = undefined;
  const toolPolicy: GuardToolPolicy<Record<string, unknown>> | undefined = undefined;
  const inboundOptions: GuardInboundOptions | undefined = undefined;
  const inboundVerdict: InboundVerdict | undefined = undefined;
  const hookFamily: ArcjetHookFamily | undefined = undefined;
  const hooksOptions: ArcjetHooksOptions | undefined = undefined;
  const denialResult: ArcjetDenialResult | undefined = undefined;
  void [
    approvalPolicy,
    approvalResponsePolicy,
    toolPolicy,
    inboundOptions,
    inboundVerdict,
    hookFamily,
    hooksOptions,
    denialResult,
  ];
}

verifyTypeExports();

const eveSupported = (currentNodeMajor() ?? 0) >= 24;

test("importing the Eve namespace below Node 24 fails with needs Node 24", async (t) => {
  if (eveSupported) {
    t.skip("this engine already meets Eve's floor");
    return;
  }
  await assert.rejects(
    () => import("./index.ts"),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /needs Node 24/);
      return true;
    },
  );
});

/**
 * Read a JSON file as a plain record. `JSON.parse` is untyped by definition, so
 * the boundary is asserted once here rather than at each call site.
 */
function readJsonObject(path: string): Record<string, unknown> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse returns any
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

/**
 * Read a nested object field, or undefined when the field is absent or not an
 * object.
 */
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

// AC1.1: Each of the five own exports (eveAgentContext, guardApproval, guardTool,
// guardInbound, arcjetHooks) must be a function.
test("AC1.1: exports the five own helpers as functions", async (t) => {
  if (!eveSupported) {
    t.skip("Eve namespace needs Node 24");
    return;
  }
  const eveNamespace = await import("./index.ts");
  const ownExports = [
    "eveAgentContext",
    "guardApproval",
    "guardTool",
    "guardInbound",
    "arcjetHooks",
  ] as const;

  for (const funcName of ownExports) {
    const func = (eveNamespace as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `@arcjet/guard/vercel-eve/v0 must export ${funcName} as a function`,
    );
  }
});

// The agnostic helpers reach users through this namespace and no other,
// so the public path is what must carry them.
test("eve namespace exports the agnostic helpers", async (t) => {
  if (!eveSupported) {
    t.skip("Eve namespace needs Node 24");
    return;
  }
  const eveNamespace = await import("./index.ts");
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (eveNamespace as Record<string, unknown>)[symbol];
    assert.ok(value !== undefined, `@arcjet/guard/vercel-eve/v0 must export ${symbol}`);
  }
});

// AC1.2: For each agnostic symbol, the value imported from Eve namespace must
// be the same object identity as the value from vercel-ai/v7 namespace.
test("AC1.2: agnostic exports have same identity across Eve and v7 namespaces", async (t) => {
  if (!eveSupported) {
    t.skip("Eve namespace needs Node 24");
    return;
  }
  const eveNamespace = await import("./index.ts");
  const agnosticSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
  ] as const;

  for (const symbol of agnosticSymbols) {
    const eveValue = (eveNamespace as Record<string, unknown>)[symbol];
    const v7Value = (v7Namespace as Record<string, unknown>)[symbol];

    assert.strictEqual(
      eveValue,
      v7Value,
      `${symbol} must be the same object identity from both @arcjet/guard/vercel-eve/v0 and @arcjet/guard/vercel-ai/v7`,
    );
  }
});

// Proxy identity — shared exports have same function identity
test("Eve namespace is a strict superset of the agents barrel with same identity for shared exports", async (t) => {
  if (!eveSupported) {
    t.skip("Eve namespace needs Node 24");
    return;
  }
  const eveNamespace = await import("./index.ts");
  const eveKeys = Object.keys(eveNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  // Verify all agents barrel keys are present in eve namespace
  for (const key of agentKeys) {
    assert.ok(eveKeys.includes(key), `agents barrel key "${key}" must be present in eve namespace`);

    // Verify the exported value is the exact same object, not a wrapper
    const eveValue = (eveNamespace as Record<string, unknown>)[key];
    const agentValue = (agentsBarrel as Record<string, unknown>)[key];

    assert.strictEqual(
      eveValue,
      agentValue,
      `${key} must be the same object identity from both imports`,
    );
  }

  // eve has exactly the agents keys plus five own exports: eveAgentContext,
  // guardApproval, guardTool, guardInbound, arcjetHooks.
  // Type-only exports (GuardApprovalPolicy, GuardApprovalResponsePolicy, GuardToolPolicy, GuardInboundOptions,
  // InboundVerdict, ArcjetHookFamily, ArcjetHooksOptions, ArcjetDenialResult)
  // do not appear at runtime.
  const expectedAdditions = 5;
  assert.equal(
    eveKeys.length,
    agentKeys.length + expectedAdditions,
    `eve namespace must have agents barrel exports plus ${expectedAdditions} own exports (eve has ${eveKeys.length}, agents has ${agentKeys.length}, expected ${agentKeys.length + expectedAdditions})`,
  );

  // Verify the extra keys are exactly the five own exports
  const eveOnlyKeys = eveKeys.filter((key) => !agentKeys.includes(key));
  const ownExportsArray = [
    "arcjetHooks",
    "eveAgentContext",
    "guardApproval",
    "guardInbound",
    "guardTool",
  ];
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const expectedOwnExports: readonly string[] = ownExportsArray.sort();
  // oxlint-disable-next-line unicorn/no-array-sort -- sort is necessary for comparison
  const sorted: readonly string[] = eveOnlyKeys.sort();
  assert.deepEqual(
    sorted,
    expectedOwnExports,
    `eve namespace's own exports must be exactly [${expectedOwnExports.join(", ")}]`,
  );
});

// AC1.3: Ensure no unversioned or other-versioned vercel-eve keys exist
test("AC1.3: export map has no unversioned ./vercel-eve or unsupported ./vercel-eve/v1", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  // AC1.3: ./vercel-eve (unversioned) must NOT exist
  assert.ok(
    !exportKeys.includes("./vercel-eve"),
    'export map must not have "./vercel-eve" (unversioned alias prohibited)',
  );

  // AC1.3: ./vercel-eve/v1 must NOT exist (Eve is pre-1.0)
  assert.ok(
    !exportKeys.includes("./vercel-eve/v1"),
    'export map must not have "./vercel-eve/v1" (Eve has not reached 1.0)',
  );

  // AC1.3: No wildcard keys starting with ./vercel-eve/ except v0 literal
  for (const key of exportKeys) {
    if (key.startsWith("./vercel-eve/")) {
      assert.equal(
        key,
        "./vercel-eve/v0",
        `export map must not have wildcard vercel-eve subpaths; found "${key}"`,
      );
    }
  }
});

// AC1.4: Root surface has correct keys and conditions
test("AC1.4: root export map keys and runtime conditions are correct", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = sortedKeys(exportsMap);

  assert.deepEqual(
    exportKeys,
    EXPECTED_ROOT_KEYS,
    "root export map keys must exactly match expected set (no additions, no removals)",
  );

  // Check the . entry's runtime conditions
  const rootEntry = objectField(exportsMap, ".");
  assert.ok(rootEntry, 'export map must have "." entry');

  const runtimeConditions = sortedKeys(rootEntry);

  assert.deepEqual(
    runtimeConditions,
    EXPECTED_CONDITIONS,
    "root . entry runtime conditions must exactly match expected set",
  );
});

// AC1.4: ./agents must NOT exist
test("AC1.4: export map must not have ./agents", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(
    !exportKeys.includes("./agents"),
    'export map must not have "./agents" (the agnostic layer is internal)',
  );
});

// Positive assertion: ./vercel-eve/v0 must be present
test("./vercel-eve/v0 must be present in export map", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  assert.ok(exportKeys.includes("./vercel-eve/v0"), 'export map must have "./vercel-eve/v0"');
});
