import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as eveNamespace from "./index.ts";
import * as agentsBarrel from "../../agents/index.ts";

import {
  sortedKeys,
  EXPECTED_ROOT_KEYS,
  EXPECTED_CONDITIONS,
} from "../../../test/_shared/source-scan.ts";

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

// AC1.2: The agnostic helpers reach users through this namespace and no other,
// so the public path is what must carry them.
test("AC1.2: eve namespace exports the agnostic helpers", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (eveNamespace as Record<string, unknown>)[symbol];
    assert.ok(
      value !== undefined,
      `@arcjet/guard/vercel-eve/v0 must export ${symbol}`,
    );
  }
});

// Proxy identity — shared exports have same function identity
test("Eve namespace re-exports exactly the agents barrel with same identity", () => {
  // Verify the sorted key sets are exactly equal (no superset, no subset)
  assert.deepEqual(
    sortedKeys(eveNamespace),
    sortedKeys(agentsBarrel),
    "eve namespace must re-export exactly the agents barrel in phase 1",
  );

  const eveKeys = Object.keys(eveNamespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      eveKeys.includes(key),
      `agents barrel key "${key}" must be present in eve namespace`,
    );

    // Verify the exported value is the exact same object, not a wrapper
    const eveValue = (eveNamespace as Record<string, unknown>)[key];
    const agentValue = (agentsBarrel as Record<string, unknown>)[key];

    assert.strictEqual(
      eveValue,
      agentValue,
      `${key} must be the same object identity from both imports`,
    );
  }
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

  assert.ok(
    exportKeys.includes("./vercel-eve/v0"),
    'export map must have "./vercel-eve/v0"',
  );
});
