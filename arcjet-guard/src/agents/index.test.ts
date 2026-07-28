import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as agents from "./index.ts";
import type {
  ArcjetAgentClient,
  ArcjetAgentContext,
  CaptureActionOptions,
  CaptureOptions,
  GuardActionPolicy,
  OnGuardError,
  SecurityMetadataFields,
} from "./index.ts";
import { extractImportSpecifiers, collectTsFiles, sortedKeys } from "../../test/_shared/source-scan.ts";

// Verify type exports exist - test will fail at typecheck if these types don't exist
function verifyTypeExports(): void {
  // Use the types in a function body to satisfy linter
  const check1: OnGuardError = "allow";
  const check2: ArcjetAgentClient | undefined = undefined;
  const check3: ArcjetAgentContext | undefined = undefined;
  const check4: CaptureActionOptions | undefined = undefined;
  const check5: CaptureOptions | undefined = undefined;
  const check6: GuardActionPolicy | undefined = undefined;
  const check7: SecurityMetadataFields | undefined = undefined;
  void [check1, check2, check3, check4, check5, check6, check7];
}

// Ensure the verification function is called
verifyTypeExports();

// AC5.1: Verify the barrel exports exactly the expected runtime values
// Type-only exports (ArcjetAgentContext, etc.) are verified separately via imports
test("exports the correct runtime values (AC5.1)", () => {
  const exportedNames = sortedKeys(agents);
  const expectedRuntimeNames = [
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
    "captureAction",
    "createAgentContext",
    "guardAction",
    "securityMetadata",
  ];

  assert.deepEqual(exportedNames, expectedRuntimeNames, "runtime exports must match expected list exactly");
});

// AC2.1: Walk the transitive import graph from src/agents/index.ts
// to verify no module imports 'ai' or '@ai-sdk/*'
test("no AI SDK coupling (AC2.1)", () => {
  const moduleDir = import.meta.dirname;

  // Map of visited files to prevent cycles
  const visited = new Set<string>();
  const errors: string[] = [];

  /**
   * Walk the import graph transitively starting from a file.
   * For each file, extract all import specifiers and recursively follow relative ones.
   */
  function walkImportGraph(filePath: string): void {
    // Normalize to absolute path
    const absolutePath = resolve(filePath);

    // Skip if already visited or outside source
    if (visited.has(absolutePath)) {
      return;
    }
    visited.add(absolutePath);

    let content: string;
    try {
      content = readFileSync(absolutePath, "utf-8");
    } catch {
      errors.push(`Failed to read file: ${absolutePath}`);
      return;
    }

    // Check for forbidden AI SDK imports
    const importSpecifiers = extractImportSpecifiers(content);
    for (const spec of importSpecifiers) {
      // Check for 'ai' package or '@ai-sdk/*' scoped packages
      // Must match the actual import specifier, not JSDoc prose or identifiers
      if (spec === "ai" || spec.startsWith("@ai-sdk/")) {
        errors.push(`File ${absolutePath} imports forbidden package: "${spec}"`);
      }

      // Follow relative imports
      if (spec.startsWith(".")) {
        const specDir = resolve(absolutePath, "..");
        let resolvedPath = resolve(specDir, spec);

        // Try with .ts extension if not already present
        if (!resolvedPath.endsWith(".ts") && !resolvedPath.endsWith(".d.ts")) {
          const withTs = `${resolvedPath}.ts`;
          try {
            readFileSync(withTs, "utf-8");
            resolvedPath = withTs;
          } catch {
            // Continue with original
          }
        }

        walkImportGraph(resolvedPath);
      }
    }
  }

  // Start the walk from index.ts
  walkImportGraph(resolve(moduleDir, "index.ts"));

  assert.equal(errors.length, 0, `AI SDK coupling found:\n${errors.join("\n")}`);
});

// AC5.2 (partial): No forbidden context identifiers
test("no old context identifiers (AC5.2)", () => {
  const moduleDir = import.meta.dirname;
  const agentsDir = moduleDir;
  const testSharedDir = resolve(moduleDir, "../../test/_shared");

  const errors: string[] = [];

  // Construct needles from parts to avoid matching this test file's assertions.
  // The test must scan itself to close the hole where forbidden identifiers
  // could hide in comments or assertion literals.
  const createAiContextNeedle = ["create", "Ai", "Context"].join("");
  const arcjetAiContextNeedle = ["Arcjet", "Ai", "Context"].join("");

  const filesToCheck = [...collectTsFiles(agentsDir), ...collectTsFiles(testSharedDir)];

  // Check each file for forbidden identifiers
  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    // Check for old context function (whole word match)
    if (new RegExp(`\\b${createAiContextNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${createAiContextNeedle}`);
    }

    // Check for old context type (whole word match)
    if (new RegExp(`\\b${arcjetAiContextNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${arcjetAiContextNeedle}`);
    }
  }

  assert.equal(
    errors.length,
    0,
    `Old context identifiers found in src/agents/ or test/_shared/:\n${errors.join("\n")}`,
  );
});

// AC5.4 (partial): No protect* identifiers (all four variants)
test("no old protect* identifiers (AC5.4)", () => {
  const moduleDir = import.meta.dirname;
  const agentsDir = moduleDir;
  const testSharedDir = resolve(moduleDir, "../../test/_shared");

  const errors: string[] = [];

  // Construct needles from parts to avoid matching this test file's assertions.
  // The test must scan itself to close the hole where forbidden identifiers
  // could hide in comments or assertion literals.
  const protectToolNeedle = ["protect", "Tool"].join("");
  const protectActionNeedle = ["protect", "Action"].join("");
  const protectToolPolicyNeedle = ["Protect", "Tool", "Policy"].join("");
  const protectActionPolicyNeedle = ["Protect", "Action", "Policy"].join("");

  const filesToCheck = [...collectTsFiles(agentsDir), ...collectTsFiles(testSharedDir)];

  // Check each file for all four forbidden identifiers
  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    if (new RegExp(`\\b${protectToolNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${protectToolNeedle}`);
    }

    if (new RegExp(`\\b${protectActionNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${protectActionNeedle}`);
    }

    if (new RegExp(`\\b${protectToolPolicyNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${protectToolPolicyNeedle}`);
    }

    if (new RegExp(`\\b${protectActionPolicyNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${protectActionPolicyNeedle}`);
    }
  }

  assert.equal(
    errors.length,
    0,
    `Old protect* identifiers found in src/agents/ or test/_shared/:\n${errors.join("\n")}`,
  );
});
