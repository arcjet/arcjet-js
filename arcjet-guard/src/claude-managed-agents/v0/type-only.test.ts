import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

const PEER = "@anthropic-ai/sdk";

function isSdkImport(specifier: string): boolean {
  return specifier === PEER || specifier.startsWith(`${PEER}/`);
}

test("type-only import scanner works on @anthropic-ai/sdk fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveSdkImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of the Anthropic SDK",
      content: `import Anthropic from "${PEER}";\nvoid Anthropic;`,
      shouldHaveSdkImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of the Anthropic SDK",
      content: `import type { Anthropic } from "${PEER}";\nvoid 0;`,
      shouldHaveSdkImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match @anthropic-ai/claude-agent-sdk",
      content: 'import { tool } from "@anthropic-ai/claude-agent-sdk";\nvoid tool;',
      shouldHaveSdkImport: false,
    },
    {
      name: "detects dynamic import of the Anthropic SDK",
      content: `const sdk = await import("${PEER}");\nvoid sdk;`,
      shouldHaveSdkImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const sdkImports = imports.filter((imp) => isSdkImport(imp.specifier));

    if (fixture.shouldHaveSdkImport === false) {
      assert.equal(sdkImports.length, 0, `${fixture.name}: should not have sdk imports`);
    } else {
      assert.equal(sdkImports.length, 1, `${fixture.name}: should have exactly one sdk import`);
      assert.equal(
        sdkImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all @anthropic-ai/sdk imports in the namespace are type-only", () => {
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
      if (isSdkImport(imp.specifier) && !imp.typeOnly) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in claude-managed-agents namespace:\n${errors.join("\n")}`,
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-managed-agents-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, `import Anthropic from "${PEER}";\nvoid Anthropic;`);
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const sdkImports = imports.filter((imp) => isSdkImport(imp.specifier));
    assert.equal(sdkImports.length, 1);
    assert.equal(sdkImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
