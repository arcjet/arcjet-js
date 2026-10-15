import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

function isTanStackAiPeer(specifier: string): boolean {
  return specifier === "@tanstack/ai" || specifier.startsWith("@tanstack/ai/");
}

test("type-only import scanner works on @tanstack/ai fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of @tanstack/ai",
      content: 'import { chat } from "@tanstack/ai";\nvoid chat;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of @tanstack/ai",
      content: 'import type { ChatMiddleware } from "@tanstack/ai";\nvoid 0;',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: 'import { type ChatMiddleware, chat } from "@tanstack/ai";\nvoid chat;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of @tanstack/ai",
      content: 'export type { ChatMiddleware } from "@tanstack/ai";',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match a different scoped package",
      content: 'import { chat } from "@tanstack/start";\nvoid chat;',
      shouldHaveImport: false,
    },
    {
      name: "detects dynamic import of @tanstack/ai",
      content: 'const ai = await import("@tanstack/ai");\nvoid ai;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const peerImports = imports.filter((imp) => isTanStackAiPeer(imp.specifier));

    if (fixture.shouldHaveImport === false) {
      assert.equal(peerImports.length, 0, `${fixture.name}: should not have @tanstack/ai imports`);
    } else {
      assert.equal(
        peerImports.length,
        1,
        `${fixture.name}: should have exactly one @tanstack/ai import`,
      );
      assert.equal(
        peerImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all @tanstack/ai imports in the tanstack-ai namespace are type-only", () => {
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
      if (isTanStackAiPeer(imp.specifier) && !imp.typeOnly) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in tanstack-ai namespace:\n${errors.join("\n")}`,
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-tanstack-ai-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, 'import { chat } from "@tanstack/ai";\nvoid chat;');
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const peerImports = imports.filter((imp) => isTanStackAiPeer(imp.specifier));
    assert.equal(peerImports.length, 1);
    assert.equal(peerImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
