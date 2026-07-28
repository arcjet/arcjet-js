import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as v7Namespace from "./index.ts";
import * as agentsBarrel from "../../agents/index.ts";
import type { Tool } from "ai";

import type { ArcjetDenialResult, GuardToolPolicy } from "./index.ts";
import {
  collectTsFiles,
  extractImportSpecifiers,
  sortedKeys,
} from "../../../test/_shared/source-scan.ts";

// `Object.keys` on a namespace import never lists type-only exports, so assert
// them at type level instead: this stops compiling if the barrel drops one.
function verifyTypeExports(): void {
  const policy: GuardToolPolicy<Tool> | undefined = undefined;
  const denial: ArcjetDenialResult | undefined = undefined;
  void [policy, denial];
}

verifyTypeExports();

// AC1.3: Namespace exports guardTool and aiToolsContext as functions
test("AC1.3: exports guardTool and aiToolsContext", () => {
  assert.equal(typeof v7Namespace.guardTool, "function", "guardTool must be exported as a function");
  assert.equal(
    typeof v7Namespace.aiToolsContext,
    "function",
    "aiToolsContext must be exported as a function",
  );
});

// AC1.4: Proxy identity — shared exports have same function identity
test("AC1.4: shared exports have same function identity", () => {
  // These shared exports must be the same function objects, not wrappers
  const sharedExports = ["guardAction", "captureAction", "securityMetadata", "createAgentContext", "ArcjetDeniedError"] as const;

  for (const exportName of sharedExports) {
    const v7Value = (v7Namespace as Record<string, unknown>)[exportName];
    const agentValue = (agentsBarrel as Record<string, unknown>)[exportName];

    assert.strictEqual(
      v7Value,
      agentValue,
      `${exportName} must be the same object identity from both imports`,
    );
  }

  // Verify namespace is a strict superset of agents barrel
  const v7Keys = Object.keys(v7Namespace);
  const agentKeys = Object.keys(agentsBarrel);

  for (const key of agentKeys) {
    assert.ok(
      v7Keys.includes(key),
      `agents barrel key "${key}" must be present in v7 namespace (superset requirement)`,
    );
  }

  // v7 has exactly the agents keys plus guardTool and aiToolsContext (2 additions)
  assert.equal(
    v7Keys.length,
    agentKeys.length + 2,
    `v7 namespace must have agents barrel exports plus guardTool and aiToolsContext (v7 has ${v7Keys.length}, agents has ${agentKeys.length}, expected ${agentKeys.length + 2})`,
  );
});

// AC1.2: Agents barrel exports the documented symbols
test("AC1.2: agents barrel exports documented symbols", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (agentsBarrel as Record<string, unknown>)[symbol];
    assert.ok(
      value !== undefined,
      `agents barrel must export ${symbol}`,
    );
  }
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

// AC1.5 and AC1.6: Export map verification (static check, no build required)
test("AC1.5 and AC1.6: export map has correct subpaths", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = Object.keys(exportsMap);

  // AC1.5: ./vercel-ai (unversioned) must NOT exist
  assert.ok(
    !exportKeys.includes("./vercel-ai"),
    'export map must not have "./vercel-ai" (unversioned alias prohibited)',
  );

  // AC1.6: ./vercel-ai/v6 must NOT exist
  assert.ok(
    !exportKeys.includes("./vercel-ai/v6"),
    'export map must not have "./vercel-ai/v6" (unsupported major version)',
  );

  // AC1.6: No wildcard keys starting with ./vercel-ai/ except v7 literal
  for (const key of exportKeys) {
    if (key.startsWith("./vercel-ai/")) {
      assert.equal(
        key,
        "./vercel-ai/v7",
        `export map must not have wildcard vercel-ai subpaths; found "${key}"`,
      );
    }
  }

  // Must have ./vercel-ai/v7
  assert.ok(
    exportKeys.includes("./vercel-ai/v7"),
    'export map must have "./vercel-ai/v7"',
  );

  // Must have ./agents
  assert.ok(
    exportKeys.includes("./agents"),
    'export map must have "./agents"',
  );
});

// AC1.1: Root surface unchanged (three checks)
test("AC1.1: root export map keys and runtime conditions unchanged", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  const exportKeys = sortedKeys(exportsMap);
  const expectedRootKeys = [".", "./agents", "./bun", "./fetch", "./node", "./vercel-ai/v7"];

  assert.deepEqual(
    exportKeys,
    expectedRootKeys,
    "root export map keys must exactly match expected set (no additions, no removals)",
  );

  // Check the . entry's runtime conditions
  const rootEntry = objectField(exportsMap, ".");
  assert.ok(rootEntry, 'export map must have "." entry');

  const runtimeConditions = sortedKeys(rootEntry);
  const expectedConditions = ["bun", "default", "deno", "edge-light", "node", "workerd"];

  assert.deepEqual(
    runtimeConditions,
    expectedConditions,
    "root . entry runtime conditions must exactly match expected set",
  );
});

// AC1.1: Root barrel named exports are importable and are functions
test("AC1.1: root barrel exports launchArcjet and rule builders", async () => {
  // launchArcjet is exported from the conditional exports (node.ts, fetch.ts, bun.ts)
  // which resolve via the root export condition
  const nodeRuntime = await import("../../node.ts");
  assert.equal(
    typeof nodeRuntime.launchArcjet,
    "function",
    "root entry (@arcjet/guard) must export launchArcjet as a function",
  );

  // The rule builders are exported directly from src/index.ts.
  const rootBarrel = await import("../../index.ts");
  const requiredFunctions = ["tokenBucket", "fixedWindow", "slidingWindow"] as const;

  for (const funcName of requiredFunctions) {
    const func = (rootBarrel as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `root barrel must export ${funcName} as a function`,
    );
  }
});

// AC2.3: Static precondition — guard-tool.ts and tools-context.ts import from ai/@ai-sdk/provider-utils
test("AC2.3: guard-tool and tools-context have ai SDK dependencies (static check)", () => {
  const guardToolPath = resolve(import.meta.dirname, "./guard-tool.ts");
  const toolsContextPath = resolve(import.meta.dirname, "./tools-context.ts");

  const errors: string[] = [];

  // Read guard-tool.ts and verify it imports from ai
  let guardToolContent: string;
  try {
    guardToolContent = readFileSync(guardToolPath, "utf-8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    assert.fail(`Failed to read guard-tool.ts: ${message}`);
  }

  const guardToolImports = extractImportSpecifiers(guardToolContent);
  if (!guardToolImports.includes("ai")) {
    errors.push("guard-tool.ts must import from 'ai'");
  }

  // Read tools-context.ts and verify it imports from @ai-sdk/provider-utils
  let toolsContextContent: string;
  try {
    toolsContextContent = readFileSync(toolsContextPath, "utf-8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    assert.fail(`Failed to read tools-context.ts: ${message}`);
  }

  const toolsContextImports = extractImportSpecifiers(toolsContextContent);
  if (!toolsContextImports.includes("@ai-sdk/provider-utils")) {
    errors.push("tools-context.ts must import from '@ai-sdk/provider-utils'");
  }

  assert.equal(
    errors.length,
    0,
    `AC2.3 static precondition failed (v7 imports fail without ai peer):\n${errors.join("\n")}`,
  );
});

// AC5.4: no pre-rename identifiers and no dependency on the old package name
// anywhere under src/vercel-ai/. Needles are built from parts so this file does
// not match itself and can be swept along with everything else.
test("AC5.4: no old identifiers in src/vercel-ai/", () => {
  const vercelAiDir = resolve(import.meta.dirname, "..");
  const errors: string[] = [];

  // Construct needles from parts to avoid matching this test file's assertions
  const protectToolNeedle = ["protect", "Tool"].join("");
  const protectToolPolicyNeedle = ["Protect", "Tool", "Policy"].join("");
  const arcjetAiNeedle = ["@arcjet", "ai"].join("/");
  const createAiContextNeedle = ["create", "Ai", "Context"].join("");
  const arcjetAiContextNeedle = ["Arcjet", "Ai", "Context"].join("");

  // Scan every file, this one included: the needles above are built from parts
  // so nothing here matches itself, which closes the hole where a forbidden
  // identifier could hide in a comment or an assertion literal.
  const filesToCheck = collectTsFiles(vercelAiDir);
  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      // Ignore files that can't be read
      continue;
    }

    // Check for the old protect-tool naming
    if (new RegExp(`\\b${protectToolNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${protectToolNeedle}`);
    }

    if (new RegExp(`\\b${protectToolPolicyNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${protectToolPolicyNeedle}`);
    }

    // Check for a dependency on the old package name
    if (content.includes(arcjetAiNeedle)) {
      errors.push(`${filePath}: contains ${arcjetAiNeedle}`);
    }

    if (new RegExp(`\\b${createAiContextNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${createAiContextNeedle}`);
    }

    if (new RegExp(`\\b${arcjetAiContextNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${arcjetAiContextNeedle}`);
    }
  }

  assert.equal(
    errors.length,
    0,
    `forbidden identifiers found in src/vercel-ai/:\n${errors.join("\n")}`,
  );
});
