import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractTypedImportSpecifiers } from "../../../test/_shared/source-scan.ts";

function isEve(specifier: string): boolean {
  return specifier === "eve" || specifier.startsWith("eve/");
}

function isEveV0Alias(specifier: string): boolean {
  return specifier === "eve-v0" || specifier.startsWith("eve-v0/");
}

// `/v1` imports `/v0` modules, so the scan covers the whole namespace rather
// than `v1/` alone.
const namespaceFiles = collectTsFiles(resolve(import.meta.dirname, ".."));

test("all eve imports reachable from vercel-eve/v1 are type-only", () => {
  const errors: string[] = [];
  for (const filePath of namespaceFiles) {
    for (const imp of extractTypedImportSpecifiers(readFileSync(filePath, "utf-8"))) {
      if (isEve(imp.specifier) && !imp.typeOnly) {
        errors.push(`${filePath}: value import of "${imp.specifier}" found; must be type-only`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("no vercel-eve source imports the eve-v0 development alias", () => {
  const errors: string[] = [];
  for (const filePath of namespaceFiles) {
    for (const imp of extractTypedImportSpecifiers(readFileSync(filePath, "utf-8"))) {
      if (isEveV0Alias(imp.specifier)) {
        errors.push(`${filePath}: imports "${imp.specifier}"; users never install that alias`);
      }
    }
  }
  assert.deepEqual(errors, []);
});

test("vercel-eve/v1 never imports the /v0 modules that are bound to Eve 0.x", () => {
  const errors: string[] = [];
  const sources = collectTsFiles(import.meta.dirname).filter((path) => !path.endsWith(".test.ts"));
  for (const filePath of sources) {
    for (const imp of extractTypedImportSpecifiers(readFileSync(filePath, "utf-8"))) {
      if (imp.specifier === "../v0/index.ts" || imp.specifier === "../v0/hooks.ts") {
        errors.push(`${filePath}: imports "${imp.specifier}", which types against Eve 0.x hooks`);
      }
    }
  }
  assert.deepEqual(errors, []);
});
