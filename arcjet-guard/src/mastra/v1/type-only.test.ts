import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

test("type-only import scanner works on @mastra/core fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveMastraImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of @mastra/core",
      content: 'import { createTool } from "@mastra/core/tools";\nvoid createTool;',
      shouldHaveMastraImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of @mastra/core",
      content: 'import type { Processor } from "@mastra/core/processors";\nvoid 0;',
      shouldHaveMastraImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: 'import { type Processor, createTool } from "@mastra/core/tools";\nvoid createTool;',
      shouldHaveMastraImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of @mastra/core",
      content: 'export type { Tool } from "@mastra/core/tools";',
      shouldHaveMastraImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match a different scoped package",
      content: 'import { handler } from "@mastra/memory";\nvoid handler;',
      shouldHaveMastraImport: false,
    },
    {
      name: "detects dynamic import of @mastra/core",
      content: 'const tools = await import("@mastra/core/tools");\nvoid tools;',
      shouldHaveMastraImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const mastraImports = imports.filter(
      (imp) => imp.specifier === "@mastra/core" || imp.specifier.startsWith("@mastra/core/"),
    );

    if (fixture.shouldHaveMastraImport === false) {
      assert.equal(mastraImports.length, 0, `${fixture.name}: should not have mastra imports`);
    } else {
      assert.equal(mastraImports.length, 1, `${fixture.name}: should have exactly one mastra import`);
      assert.equal(
        mastraImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all @mastra/core imports in the mastra namespace are type-only", () => {
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
      if (
        (imp.specifier === "@mastra/core" || imp.specifier.startsWith("@mastra/core/")) &&
        !imp.typeOnly
      ) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in mastra namespace:\n${errors.join("\n")}`,
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-mastra-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, 'import { createTool } from "@mastra/core/tools";\nvoid createTool;');
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const mastraImports = imports.filter(
      (imp) => imp.specifier === "@mastra/core" || imp.specifier.startsWith("@mastra/core/"),
    );
    assert.equal(mastraImports.length, 1);
    assert.equal(mastraImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
