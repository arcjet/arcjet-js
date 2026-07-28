import { readFileSync, readdirSync } from "fs";
import { resolve } from "path";
import { test } from "node:test";
import { strict as assert } from "node:assert";

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

/**
 * Parse import/export statements from a file and extract specifiers.
 * Matches patterns like:
 * - import { x } from "./foo.ts"
 * - export { x } from "./bar.ts"
 * - export type { T } from "./baz.ts"
 */
function extractImportSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  // Match any import or export statement followed by 'from "..."'
  // This simpler pattern catches both import and export statements reliably
  // oxlint-disable-next-line unicorn/no-unsafe-regex -- essential for parsing imports
  const importRegex = /from\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- RegExp.exec is safe
  while ((match = importRegex.exec(content)) !== null) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- match[1] is safe when match is non-null
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }
  return specifiers;
}

/**
 * Recursively collect all .ts files from a directory.
 */
function collectTsFiles(dir: string): string[] {
  const filesToCheck: string[] = [];

  function walk(dirPath: string): void {
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryName = entry.name;
        if (entry.isFile() && entryName.endsWith(".ts")) {
          filesToCheck.push(resolve(dirPath, entryName));
        } else if (entry.isDirectory() && !entryName.startsWith(".")) {
          walk(resolve(dirPath, entryName));
        }
      }
    } catch {
      // Ignore missing directories
    }
  }

  walk(dir);
  return filesToCheck;
}

// AC5.1: Verify the barrel exports exactly the expected runtime values
// Type-only exports (ArcjetAgentContext, etc.) are verified separately via imports
test("exports the correct runtime values (AC5.1)", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- Object.keys with namespace imports
  const exportedNames = Object.keys(agents).toSorted();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call -- Array literal is safe
  const expectedRuntimeNames = [
    "ArcjetDeniedError",
    "ArcjetGuardUnavailableError",
    "captureAction",
    "createAgentContext",
    "guardAction",
    "securityMetadata",
  ].toSorted();

  assert.deepEqual(exportedNames, expectedRuntimeNames, "runtime exports must match expected list exactly");
});

// AC2.1: Walk the transitive import graph from src/agents/index.ts
// to verify no module imports 'ai' or '@ai-sdk/*'
test("no AI SDK coupling (AC2.1)", () => {
  // eslint-disable-next-line unicorn/prefer-import-meta-properties -- __dirname-equivalent needed
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

// AC5.2 (partial): No createAiContext or ArcjetAiContext identifiers
test("no old context identifiers (AC5.2)", () => {
  // eslint-disable-next-line unicorn/prefer-import-meta-properties -- __dirname-equivalent needed
  const moduleDir = import.meta.dirname;
  const agentsDir = moduleDir;
  const testSharedDir = resolve(moduleDir, "../../test/_shared");

  const errors: string[] = [];
  const thisTestFile = resolve(moduleDir, "index.test.ts");

  const filesToCheck = [...collectTsFiles(agentsDir), ...collectTsFiles(testSharedDir)].filter(
    (f) => f !== thisTestFile,
  );

  // Check each file for forbidden identifiers
  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    // Check for createAiContext (whole word match)
    if (/\bcreateAiContext\b/.test(content)) {
      errors.push(`${filePath}: contains createAiContext`);
    }

    // Check for ArcjetAiContext (whole word match)
    if (/\bArcjetAiContext\b/.test(content)) {
      errors.push(`${filePath}: contains ArcjetAiContext`);
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
  // eslint-disable-next-line unicorn/prefer-import-meta-properties -- __dirname-equivalent needed
  const moduleDir = import.meta.dirname;
  const agentsDir = moduleDir;
  const testSharedDir = resolve(moduleDir, "../../test/_shared");

  const errors: string[] = [];
  const thisTestFile = resolve(moduleDir, "index.test.ts");

  const filesToCheck = [...collectTsFiles(agentsDir), ...collectTsFiles(testSharedDir)].filter(
    (f) => f !== thisTestFile,
  );

  // Check each file for all four forbidden identifiers
  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    if (/\bprotectTool\b/.test(content)) {
      errors.push(`${filePath}: contains protectTool`);
    }

    if (/\bprotectAction\b/.test(content)) {
      errors.push(`${filePath}: contains protectAction`);
    }

    if (/\bProtectToolPolicy\b/.test(content)) {
      errors.push(`${filePath}: contains ProtectToolPolicy`);
    }

    if (/\bProtectActionPolicy\b/.test(content)) {
      errors.push(`${filePath}: contains ProtectActionPolicy`);
    }
  }

  assert.equal(
    errors.length,
    0,
    `Old protect* identifiers found in src/agents/ or test/_shared/:\n${errors.join("\n")}`,
  );
});
