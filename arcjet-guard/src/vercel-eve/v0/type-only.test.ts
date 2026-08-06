import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  extractTypedImportSpecifiers,
  collectTsFiles,
} from "../../../test/_shared/source-scan.ts";

// AC2.1: Verify the type-only import scan itself (fixture-driven)
test("type-only import scanner works on fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveEveImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of eve",
      content: 'import { defineTool } from "eve/tools";\nvoid defineTool;',
      shouldHaveEveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of eve",
      content: 'import type { ToolDefinition } from "eve/tools";\nvoid 0;',
      shouldHaveEveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: 'import { type ToolDefinition, defineTool } from "eve/tools";\nvoid defineTool;',
      shouldHaveEveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of eve",
      content: 'export type { Approval } from "eve/tools";',
      shouldHaveEveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match specifiers containing eve (false positive prevention)",
      content: 'import { handler } from "./eventsource.ts";\nvoid handler;',
      shouldHaveEveImport: false,
    },
    {
      name: "detects bare import of eve",
      content: 'import "eve";\nvoid 0;',
      shouldHaveEveImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const eveImports = imports.filter(
      (imp) => imp.specifier === "eve" || imp.specifier.startsWith("eve/"),
    );

    if (fixture.shouldHaveEveImport === false) {
      // This fixture should not have any eve imports
      assert.equal(eveImports.length, 0, `${fixture.name}: should not have eve imports`);
    } else {
      // This fixture should have exactly one eve import
      assert.equal(eveImports.length, 1, `${fixture.name}: should have exactly one eve import`);

      const eveImport = eveImports[0];
      const expectedTypeOnly = fixture.shouldBeTypeOnly ?? true;
      assert.equal(
        eveImport?.typeOnly,
        expectedTypeOnly,
        `${fixture.name}: typeOnly should be ${expectedTypeOnly}`,
      );
    }
  }
});

// AC2.1: Every file in src/vercel-eve/ must have type-only eve imports (or none at all)
test("AC2.1: all eve imports in vercel-eve namespace are type-only", () => {
  const namespaceDir = resolve(import.meta.dirname, "..");
  const filesToCheck = collectTsFiles(namespaceDir);

  const errors: string[] = [];

  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const imports = extractTypedImportSpecifiers(content);

    for (const imp of imports) {
      // Check for eve imports (bare or subpath)
      if ((imp.specifier === "eve" || imp.specifier.startsWith("eve/")) && !imp.typeOnly) {
        errors.push(
          `${filePath}: value import of "${imp.specifier}" found; must be type-only`,
        );
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in vercel-eve namespace:\n${errors.join("\n")}`,
  );
});

// RED-GREEN: verify the check actually catches value imports
test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-eve-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");

    // Write a file with a value import
    writeFileSync(testFile, 'import { defineTool } from "eve/tools";\nvoid defineTool;');

    const imports = extractTypedImportSpecifiers(
      readFileSync(testFile, "utf-8"),
    );

    const eveImports = imports.filter(
      (imp) => imp.specifier === "eve" || imp.specifier.startsWith("eve/"),
    );
    assert.equal(eveImports.length, 1, "Should detect eve import");
    assert.equal(eveImports[0]?.typeOnly, false, "Should detect it as value import");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
