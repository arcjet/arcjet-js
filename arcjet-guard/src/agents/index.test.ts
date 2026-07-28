import { readFileSync, readdirSync } from "node:fs";
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
 * Comments, template literals and ordinary string literals, in one alternation.
 * Order matters: whichever construct opens first at a given position consumes the
 * rest of itself, so a `/*` inside a string is not read as a comment and a quote
 * inside a comment is not read as a string.
 */
const COMMENT_OR_STRING =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'/g;

/**
 * Blank out anything that can masquerade as an import.
 *
 * Comments become equivalent runs of spaces, preserving newlines so the
 * line-anchored patterns below still see the real line structure. Template
 * literals are emptied, because an import specifier is never written with
 * backticks but a template can contain the text of a whole import statement.
 * Ordinary string literals are left intact — they carry the specifiers we want.
 */
function stripCommentsAndTemplates(source: string): string {
  return source.replaceAll(COMMENT_OR_STRING, (token) => {
    if (token.startsWith("//") || token.startsWith("/*")) {
      return token.replaceAll(/[^\n]/g, " ");
    }
    if (token.startsWith("`")) {
      return "``";
    }
    return token;
  });
}

/**
 * Parse import/export statements from a file and extract specifiers.
 * Matches patterns like:
 * - import { x } from "./foo.ts"
 * - export { x } from "./bar.ts"
 * - export type { T } from "./baz.ts"
 * - import "ai" (bare side-effect import)
 */
function extractImportSpecifiers(content: string): string[] {
  const specifiers: string[] = [];

  const cleanContent = stripCommentsAndTemplates(content);

  // Match import/export statements anchored to line start. `=` is excluded along
  // with `;` so a declaration such as `export const NOTE = "... from 'ai'"` cannot
  // be read as an import of `ai`.
  const importFromRegex = /^[ \t]*(?:import|export)\b[^;=]*?from\s+["']([^"']+)["']/gm;
  // Match bare side-effect imports: import "package"
  const bareImportRegex = /^[ \t]*import\s+["']([^"']+)["']/gm;

  let match: RegExpExecArray | null;

  // Check import...from patterns
  while ((match = importFromRegex.exec(cleanContent)) !== null) {
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }

  // Check bare imports
  while ((match = bareImportRegex.exec(cleanContent)) !== null) {
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
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- Object.keys with namespace imports, then toSorted
  const exportedNames = Object.keys(agents).toSorted();
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- Array literal is safe, then toSorted
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
