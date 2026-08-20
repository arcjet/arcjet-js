import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

function isGenkitPeer(specifier: string): boolean {
  return (
    specifier === "genkit" ||
    specifier.startsWith("genkit/") ||
    specifier === "@genkit-ai/core" ||
    specifier.startsWith("@genkit-ai/core/") ||
    specifier === "@genkit-ai/ai" ||
    specifier.startsWith("@genkit-ai/ai/")
  );
}

test("type-only import scanner works on genkit fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of genkit",
      content: 'import { genkit, z } from "genkit";\nvoid genkit;\nvoid z;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of genkit",
      content: 'import type { ToolAction } from "genkit";\nvoid 0;',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: 'import { type ToolAction, genkit } from "genkit";\nvoid genkit;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of genkit",
      content: 'export type { ToolAction } from "genkit";',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match a different package",
      content: 'import { Agent } from "@openai/agents";\nvoid Agent;',
      shouldHaveImport: false,
    },
    {
      name: "detects dynamic import of genkit",
      content: 'const g = await import("genkit");\nvoid g;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const peerImports = imports.filter((imp) => isGenkitPeer(imp.specifier));

    if (fixture.shouldHaveImport === false) {
      assert.equal(peerImports.length, 0, `${fixture.name}: should not have genkit imports`);
    } else {
      assert.equal(peerImports.length, 1, `${fixture.name}: should have exactly one genkit import`);
      assert.equal(
        peerImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all genkit imports in the genkit namespace are type-only", () => {
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
      if (isGenkitPeer(imp.specifier) && !imp.typeOnly) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }

  assert.equal(errors.length, 0, `Type-only import violations in genkit namespace:\n${errors.join("\n")}`);
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-genkit-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, 'import { genkit } from "genkit";\nvoid genkit;');
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const peerImports = imports.filter((imp) => isGenkitPeer(imp.specifier));
    assert.equal(peerImports.length, 1);
    assert.equal(peerImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
