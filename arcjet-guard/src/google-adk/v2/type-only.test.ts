import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

function isGoogleAdkPeer(specifier: string): boolean {
  return specifier === "@google/adk" || specifier.startsWith("@google/adk/");
}

test("type-only import scanner works on @google/adk fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of @google/adk",
      content: 'import { Runner } from "@google/adk";\nvoid Runner;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of @google/adk",
      content: 'import type { BasePlugin } from "@google/adk";\nvoid 0;',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: 'import { type BasePlugin, Runner } from "@google/adk";\nvoid Runner;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of @google/adk",
      content: 'export type { BasePlugin } from "@google/adk";',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match a different scoped package",
      content: 'import { GoogleGenAI } from "@google/genai";\nvoid GoogleGenAI;',
      shouldHaveImport: false,
    },
    {
      name: "detects dynamic import of @google/adk",
      content: 'const adk = await import("@google/adk");\nvoid adk;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const peerImports = imports.filter((imp) => isGoogleAdkPeer(imp.specifier));

    if (fixture.shouldHaveImport === false) {
      assert.equal(peerImports.length, 0, `${fixture.name}: should not have @google/adk imports`);
    } else {
      assert.equal(
        peerImports.length,
        1,
        `${fixture.name}: should have exactly one @google/adk import`,
      );
      assert.equal(
        peerImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all @google/adk imports in the google-adk namespace are type-only", () => {
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
      if (isGoogleAdkPeer(imp.specifier) && !imp.typeOnly) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in google-adk namespace:\n${errors.join("\n")}`,
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-google-adk-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, 'import { Runner } from "@google/adk";\nvoid Runner;');
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const peerImports = imports.filter((imp) => isGoogleAdkPeer(imp.specifier));
    assert.equal(peerImports.length, 1);
    assert.equal(peerImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
