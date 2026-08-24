import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

function isLangChainPeer(specifier: string): boolean {
  return (
    specifier === "langchain" ||
    specifier.startsWith("langchain/") ||
    specifier === "@langchain/core" ||
    specifier.startsWith("@langchain/core/")
  );
}

/**
 * wrapToolCall's return is not passed through baseHandler. A bare
 * object is the reducer-crash case, so guard-middleware.ts dynamically
 * loads `ToolMessage` on the deny path only. Every other peer import
 * in this namespace must stay type-only.
 */
const ALLOWED_DYNAMIC_DENY_IMPORT = "@langchain/core/messages";

test("type-only import scanner works on langchain fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of langchain",
      content: 'import { createAgent } from "langchain";\nvoid createAgent;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of langchain",
      content: 'import type { createAgent } from "langchain";\nvoid 0;',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: 'import { type createAgent, createMiddleware } from "langchain";\nvoid createMiddleware;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of @langchain/core",
      content: 'export type { StructuredToolInterface } from "@langchain/core/tools";',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match a different scoped package",
      content: 'import { handler } from "@langchain/openai";\nvoid handler;',
      shouldHaveImport: false,
    },
    {
      name: "detects dynamic import of langchain",
      content: 'const agent = await import("langchain");\nvoid agent;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const peerImports = imports.filter((imp) => isLangChainPeer(imp.specifier));

    if (fixture.shouldHaveImport === false) {
      assert.equal(peerImports.length, 0, `${fixture.name}: should not have langchain imports`);
    } else {
      assert.equal(
        peerImports.length,
        1,
        `${fixture.name}: should have exactly one langchain/core import`,
      );
      assert.equal(
        peerImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all langchain / @langchain/core imports in the langchain namespace are type-only except the wrapToolCall ToolMessage load", () => {
  const namespaceDir = resolve(import.meta.dirname, "..");
  const filesToCheck = collectTsFiles(namespaceDir);
  const errors: string[] = [];
  let allowedDynamic = 0;

  for (const filePath of filesToCheck) {
    let content: string;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const imports = extractTypedImportSpecifiers(content);
    for (const imp of imports) {
      if (!isLangChainPeer(imp.specifier) || imp.typeOnly) {
        continue;
      }
      if (
        imp.specifier === ALLOWED_DYNAMIC_DENY_IMPORT &&
        basename(filePath) === "guard-middleware.ts"
      ) {
        allowedDynamic += 1;
        continue;
      }
      errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in langchain namespace:\n${errors.join("\n")}`,
  );
  assert.equal(
    allowedDynamic,
    1,
    "expected exactly one dynamic ToolMessage load in guard-middleware.ts",
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-langchain-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, 'import { createAgent } from "langchain";\nvoid createAgent;');
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const peerImports = imports.filter((imp) => isLangChainPeer(imp.specifier));
    assert.equal(peerImports.length, 1);
    assert.equal(peerImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
