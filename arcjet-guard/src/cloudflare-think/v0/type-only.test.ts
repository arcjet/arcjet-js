import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

function isCloudflareThinkPeer(specifier: string): boolean {
  return specifier === "@cloudflare/think" || specifier.startsWith("@cloudflare/think/");
}

test("type-only import scanner works on @cloudflare/think fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of @cloudflare/think",
      content: 'import { Think } from "@cloudflare/think";\nvoid Think;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of @cloudflare/think",
      content: 'import type { ToolCallDecision } from "@cloudflare/think";\nvoid 0;',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: 'import { type ToolCallDecision, Think } from "@cloudflare/think";\nvoid Think;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of @cloudflare/think",
      content: 'export type { ToolCallDecision } from "@cloudflare/think";',
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match a different scoped package",
      content: 'import { Agent } from "agents";\nvoid Agent;',
      shouldHaveImport: false,
    },
    {
      name: "detects dynamic import of @cloudflare/think",
      content: 'const think = await import("@cloudflare/think");\nvoid think;',
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const peerImports = imports.filter((imp) => isCloudflareThinkPeer(imp.specifier));

    if (fixture.shouldHaveImport === false) {
      assert.equal(
        peerImports.length,
        0,
        `${fixture.name}: should not have @cloudflare/think imports`,
      );
    } else {
      assert.equal(
        peerImports.length,
        1,
        `${fixture.name}: should have exactly one @cloudflare/think import`,
      );
      assert.equal(
        peerImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all @cloudflare/think imports in the cloudflare-think namespace are type-only", () => {
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
      if (isCloudflareThinkPeer(imp.specifier) && !imp.typeOnly) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in cloudflare-think namespace:\n${errors.join("\n")}`,
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-cloudflare-think-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, 'import { Think } from "@cloudflare/think";\nvoid Think;');
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const peerImports = imports.filter((imp) => isCloudflareThinkPeer(imp.specifier));
    assert.equal(peerImports.length, 1);
    assert.equal(peerImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
