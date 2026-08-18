import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

const PEER = "@anthropic-ai/claude-agent-sdk";

function isClaudeImport(specifier: string): boolean {
  return specifier === PEER || specifier.startsWith(`${PEER}/`);
}

test("type-only import scanner works on @anthropic-ai/claude-agent-sdk fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveClaudeImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of the Claude Agent SDK",
      content: `import { tool } from "${PEER}";\nvoid tool;`,
      shouldHaveClaudeImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of the Claude Agent SDK",
      content: `import type { SdkMcpToolDefinition } from "${PEER}";\nvoid 0;`,
      shouldHaveClaudeImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: `import { type Options, tool } from "${PEER}";\nvoid tool;`,
      shouldHaveClaudeImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of the Claude Agent SDK",
      content: `export type { HookCallback } from "${PEER}";`,
      shouldHaveClaudeImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match a different scoped package",
      content: 'import { handler } from "@anthropic-ai/sdk";\nvoid handler;',
      shouldHaveClaudeImport: false,
    },
    {
      name: "detects dynamic import of the Claude Agent SDK",
      content: `const sdk = await import("${PEER}");\nvoid sdk;`,
      shouldHaveClaudeImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const claudeImports = imports.filter((imp) => isClaudeImport(imp.specifier));

    if (fixture.shouldHaveClaudeImport === false) {
      assert.equal(claudeImports.length, 0, `${fixture.name}: should not have claude imports`);
    } else {
      assert.equal(
        claudeImports.length,
        1,
        `${fixture.name}: should have exactly one claude import`,
      );
      assert.equal(
        claudeImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all @anthropic-ai/claude-agent-sdk imports in the namespace are type-only", () => {
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
      if (isClaudeImport(imp.specifier) && !imp.typeOnly) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in claude-agent-sdk namespace:\n${errors.join("\n")}`,
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-claude-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, `import { tool } from "${PEER}";\nvoid tool;`);
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const claudeImports = imports.filter((imp) => isClaudeImport(imp.specifier));
    assert.equal(claudeImports.length, 1);
    assert.equal(claudeImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
