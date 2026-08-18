import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

function isLangGraphPeer(specifier: string): boolean {
  return (
    specifier === "@langchain/langgraph" ||
    specifier.startsWith("@langchain/langgraph/") ||
    specifier === "@langchain/core" ||
    specifier.startsWith("@langchain/core/")
  );
}

test("type-only import scanner works on @langchain/langgraph fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of @langchain/langgraph",
      content: 'import { StateGraph } from "@langchain/langgraph";\nvoid StateGraph;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of @langchain/langgraph",
      content: 'import type { ToolNode } from "@langchain/langgraph/prebuilt";\nvoid 0;',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content:
        'import { type ToolNode, StateGraph } from "@langchain/langgraph";\nvoid StateGraph;',
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
      name: "detects dynamic import of @langchain/langgraph",
      content: 'const graph = await import("@langchain/langgraph");\nvoid graph;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const peerImports = imports.filter((imp) => isLangGraphPeer(imp.specifier));

    if (fixture.shouldHaveImport === false) {
      assert.equal(peerImports.length, 0, `${fixture.name}: should not have langgraph imports`);
    } else {
      assert.equal(
        peerImports.length,
        1,
        `${fixture.name}: should have exactly one langgraph/core import`,
      );
      assert.equal(
        peerImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all @langchain/langgraph and @langchain/core imports in the langgraph namespace are type-only", () => {
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
      if (isLangGraphPeer(imp.specifier) && !imp.typeOnly) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in langgraph namespace:\n${errors.join("\n")}`,
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-langgraph-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, 'import { StateGraph } from "@langchain/langgraph";\nvoid StateGraph;');
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const peerImports = imports.filter((imp) => isLangGraphPeer(imp.specifier));
    assert.equal(peerImports.length, 1);
    assert.equal(peerImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
