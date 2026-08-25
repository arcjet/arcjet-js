import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  extractImportSpecifiers,
  collectTsFiles,
  sortedKeys,
} from "../../test/_shared/source-scan.ts";
// Type-only, so the barrel's import graph is untouched and the AI SDK coupling
// scan below is unaffected.
import type { ArcjetGuard } from "../index.ts";
import * as agents from "./index.ts";
import type {
  ArcjetAgentClient,
  ArcjetAgentContext,
  ArcjetDenialResult,
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
  const check8: ArcjetDenialResult | undefined = undefined;
  void [check1, check2, check3, check4, check5, check6, check7, check8];
}

// Ensure the verification function is called
verifyTypeExports();

// `ArcjetAgentClient` is structural, so nothing otherwise ties it to the client
// `launchArcjet()` actually returns: renaming a method on `ArcjetGuard` would
// leave every helper compiling against a shape no real client has. This fails
// typecheck the moment the two drift.
function verifyRealClientSatisfiesAgentClient(guard: ArcjetGuard): ArcjetAgentClient {
  return guard;
}
void verifyRealClientSatisfiesAgentClient;

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

  assert.deepEqual(
    exportedNames,
    expectedRuntimeNames,
    "runtime exports must match expected list exactly",
  );
});

/**
 * Walk the import graph transitively starting from a file.
 * For each file, extract all import specifiers and recursively follow relative ones.
 * Records errors for any forbidden imports (ai, @ai-sdk/*, eve, eve/*).
 * Silently skips files that cannot be read (e.g., missing fixture files in tests).
 */
function walkForForbiddenImports(filePath: string, visited: Set<string>, errors: string[]): void {
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
    // Skip files that cannot be read (e.g., fixture files in tests that don't exist)
    return;
  }

  // Check for forbidden imports (AI SDK and Eve)
  const importSpecifiers = extractImportSpecifiers(content);
  for (const spec of importSpecifiers) {
    // Check for 'ai' package, '@ai-sdk/*' scoped packages, and 'eve' or 'eve/*'
    // Must match the actual import specifier, not JSDoc prose or identifiers
    if (
      spec === "ai" ||
      spec.startsWith("@ai-sdk/") ||
      spec === "eve" ||
      spec.startsWith("eve/") ||
      spec === "@mastra/core" ||
      spec.startsWith("@mastra/core/") ||
      spec === "@anthropic-ai/claude-agent-sdk" ||
      spec.startsWith("@anthropic-ai/claude-agent-sdk/") ||
      spec === "langchain" ||
      spec.startsWith("langchain/") ||
      spec === "@langchain/langgraph" ||
      spec.startsWith("@langchain/langgraph/") ||
      spec === "@langchain/core" ||
      spec.startsWith("@langchain/core/") ||
      spec === "@openai/agents" ||
      spec.startsWith("@openai/agents/") ||
      spec === "genkit" ||
      spec.startsWith("genkit/") ||
      spec === "@genkit-ai/core" ||
      spec.startsWith("@genkit-ai/core/") ||
      spec === "@genkit-ai/ai" ||
      spec.startsWith("@genkit-ai/ai/") ||
      spec === "@strands-agents/sdk" ||
      spec.startsWith("@strands-agents/sdk/")
    ) {
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

      walkForForbiddenImports(resolvedPath, visited, errors);
    }
  }
}

// AC2.1 & AC2.3: Walk the transitive import graph from src/agents/index.ts to verify no
// module imports 'ai', '@ai-sdk/*', 'eve', or 'eve/*'. The layer is internal, so this no longer
// protects a public AI-SDK-free import path — it keeps the layer portable, which
// is the precondition for a second vendor namespace and for promoting it into
// the root export later. The Eve boundary is similarly enforced.
test("no AI SDK or Eve coupling (AC2.1 & AC2.3)", () => {
  const moduleDir = import.meta.dirname;

  // Map of visited files to prevent cycles
  const visited = new Set<string>();
  const errors: string[] = [];

  // Start the walk from index.ts
  walkForForbiddenImports(resolve(moduleDir, "index.ts"), visited, errors);

  assert.equal(errors.length, 0, `Forbidden imports found:\n${errors.join("\n")}`);

  // Fixture-driven assertion: verify the scanner fires when it encounters eve imports.
  // A boundary test that has never been observed failing may be scanning nothing.
  runFixtureDrivenEveImportTest();
});

function runFixtureDrivenEveImportTest(): void {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-eve-boundary-"));
  try {
    const fixtureTests = [
      {
        name: "detects value import of eve",
        content: 'import { defineTool } from "eve/tools";\nvoid defineTool;',
        shouldFail: true,
      },
      {
        name: "detects type-only import of eve (forbidden in agnostic layer)",
        content: 'import type { ToolDefinition } from "eve/tools";\nvoid 0;',
        shouldFail: true,
      },
      {
        name: "detects mixed type and value import",
        content: 'import { type ToolDefinition, defineTool } from "eve/tools";\nvoid defineTool;',
        shouldFail: true,
      },
      {
        name: "detects export type of eve (forbidden in agnostic layer)",
        content: 'export type { Approval } from "eve/tools";',
        shouldFail: true,
      },
      {
        name: "does not match specifiers containing eve (false positive prevention)",
        content: 'import { handler } from "./eventsource.ts";\nvoid handler;',
        shouldFail: false,
      },
      {
        name: "detects bare import of eve",
        content: 'import { someExport } from "eve";\nvoid someExport;',
        shouldFail: true,
      },
      {
        name: "detects dynamic import of eve in expression position",
        content: 'export async function loadEve() {\n  return import("eve");\n}',
        shouldFail: true,
      },
      {
        name: "does not match dynamic-import text inside a string literal",
        content: "const code = 'import(\"eve\")';\nvoid code;",
        shouldFail: false,
      },
      {
        name: "regex literal with a quote does not hide a following dynamic import",
        content: 'const re = /"/;\nimport("eve");\nvoid re;',
        shouldFail: true,
      },
    ];

    for (const fixtureTest of fixtureTests) {
      const fixturePath = resolve(tempDir, "fixture.ts");
      writeFileSync(fixturePath, fixtureTest.content);

      const fixtureVisited = new Set<string>();
      const fixtureErrors: string[] = [];

      walkForForbiddenImports(fixturePath, fixtureVisited, fixtureErrors);

      if (fixtureTest.shouldFail) {
        assert.ok(
          fixtureErrors.length > 0,
          `Expected scanner to detect eve import in: ${fixtureTest.name}`,
        );
      } else {
        assert.equal(
          fixtureErrors.length,
          0,
          `Expected scanner to NOT detect eve import in: ${fixtureTest.name}`,
        );
      }
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

// AC5.2 (partial): No forbidden context identifiers
test("no old context identifiers (AC5.2)", () => {
  const moduleDir = import.meta.dirname;
  const agentsDir = moduleDir;
  const testSharedDir = resolve(moduleDir, "../../test/_shared");

  const errors: string[] = [];

  // Construct needles from parts to avoid matching this test file's assertions.
  // The test must scan itself to close the hole where forbidden identifiers
  // could hide in comments or assertion literals.
  const oldContextFactoryNeedle = ["create", "Ai", "Context"].join("");
  const oldContextTypeNeedle = ["Arcjet", "Ai", "Context"].join("");

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
    if (new RegExp(`\\b${oldContextFactoryNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${oldContextFactoryNeedle}`);
    }

    // Check for old context type (whole word match)
    if (new RegExp(`\\b${oldContextTypeNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${oldContextTypeNeedle}`);
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
  const oldToolWrapperNeedle = ["protect", "Tool"].join("");
  const oldActionWrapperNeedle = ["protect", "Action"].join("");
  const oldToolPolicyNeedle = ["Protect", "Tool", "Policy"].join("");
  const oldActionPolicyNeedle = ["Protect", "Action", "Policy"].join("");

  const filesToCheck = [...collectTsFiles(agentsDir), ...collectTsFiles(testSharedDir)];

  // Check each file for all four forbidden identifiers
  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    if (new RegExp(`\\b${oldToolWrapperNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${oldToolWrapperNeedle}`);
    }

    if (new RegExp(`\\b${oldActionWrapperNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${oldActionWrapperNeedle}`);
    }

    if (new RegExp(`\\b${oldToolPolicyNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${oldToolPolicyNeedle}`);
    }

    if (new RegExp(`\\b${oldActionPolicyNeedle}\\b`).test(content)) {
      errors.push(`${filePath}: contains ${oldActionPolicyNeedle}`);
    }
  }

  assert.equal(
    errors.length,
    0,
    `Old protect* identifiers found in src/agents/ or test/_shared/:\n${errors.join("\n")}`,
  );
});
