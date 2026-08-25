import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

const PEER = "@strands-agents/sdk";

function isStrandsPeer(specifier: string): boolean {
  return specifier === PEER || specifier.startsWith(`${PEER}/`);
}

/**
 * `addHook` keys the registry by constructor identity, so hooks.ts
 * dynamically loads `BeforeToolCallEvent` / `HookOrder` inside
 * `initAgent` only. Every other peer import in this namespace must
 * stay type-only.
 */
const ALLOWED_DYNAMIC_INIT_IMPORT = PEER;

test("type-only import scanner works on @strands-agents/sdk fixtures", () => {
  const fixtures: Array<{
    name: string;
    content: string;
    shouldHaveImport?: boolean;
    shouldBeTypeOnly?: boolean;
  }> = [
    {
      name: "detects value import of @strands-agents/sdk",
      content: `import { Agent, tool } from "${PEER}";\nvoid Agent;\nvoid tool;`,
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts type-only import of @strands-agents/sdk",
      content: `import type { Plugin } from "${PEER}";\nvoid 0;`,
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "detects mixed type and value import (counts as value)",
      content: `import { type Plugin, Agent } from "${PEER}";\nvoid Agent;`,
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
    {
      name: "accepts export type of @strands-agents/sdk",
      content: `export type { Plugin } from "${PEER}";`,
      shouldHaveImport: true,
      shouldBeTypeOnly: true,
    },
    {
      name: "does not match a different scoped package",
      content: 'import { Agent } from "@strands-agents/tools";\nvoid Agent;',
      shouldHaveImport: false,
    },
    {
      name: "detects dynamic import of @strands-agents/sdk",
      content: `const sdk = await import("${PEER}");\nvoid sdk;`,
      shouldHaveImport: true,
      shouldBeTypeOnly: false,
    },
  ];

  for (const fixture of fixtures) {
    const imports = extractTypedImportSpecifiers(fixture.content);
    const peerImports = imports.filter((imp) => isStrandsPeer(imp.specifier));

    if (fixture.shouldHaveImport === false) {
      assert.equal(peerImports.length, 0, `${fixture.name}: should not have strands imports`);
    } else {
      assert.equal(peerImports.length, 1, `${fixture.name}: should have exactly one strands import`);
      assert.equal(
        peerImports[0]?.typeOnly,
        fixture.shouldBeTypeOnly ?? true,
        `${fixture.name}: typeOnly should be ${fixture.shouldBeTypeOnly ?? true}`,
      );
    }
  }
});

test("all @strands-agents/sdk imports in the namespace are type-only except the initAgent load", () => {
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
      if (!isStrandsPeer(imp.specifier) || imp.typeOnly) {
        continue;
      }
      if (imp.specifier === ALLOWED_DYNAMIC_INIT_IMPORT && basename(filePath) === "hooks.ts") {
        allowedDynamic += 1;
        continue;
      }
      errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
    }
  }

  assert.equal(
    errors.length,
    0,
    `Type-only import violations in strands-agents namespace:\n${errors.join("\n")}`,
  );
  assert.equal(
    allowedDynamic,
    1,
    "expected exactly one dynamic @strands-agents/sdk load in hooks.ts",
  );
});

test("scanner detects value imports when temporarily added", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-strands-type-only-"));
  try {
    const testFile = resolve(tempDir, "test.ts");
    writeFileSync(testFile, `import { Agent } from "${PEER}";\nvoid Agent;`);
    const imports = extractTypedImportSpecifiers(readFileSync(testFile, "utf-8"));
    const peerImports = imports.filter((imp) => isStrandsPeer(imp.specifier));
    assert.equal(peerImports.length, 1);
    assert.equal(peerImports[0]?.typeOnly, false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
