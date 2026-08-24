import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import { test } from "node:test";

import { collectTsFiles, extractImportSpecifiers } from "../test/_shared/source-scan.ts";

/**
 * One vendor SDK must never appear in another vendor namespace's shipped
 * import graph. Every SDK is an optional peer, so installing `@arcjet/guard`
 * for Mastra must not need `ai`, `eve`, or `@langchain/core` present.
 *
 * This used to hold by construction: every namespace declared its own copy of
 * the denial payload precisely so it never reached for a sibling's module. The
 * payload is shared now, which is why the property needs a test rather than a
 * convention — the shared module lives in the agnostic layer, whose own
 * SDK-free graph is proven separately by `agents/index.test.ts`.
 *
 * Test files are excluded on purpose: they are not shipped, and one of them
 * (`vercel-eve/v0/index.test.ts`) imports the `vercel-ai/v7` namespace
 * deliberately to assert shared-export identity across the two.
 */
const NAMESPACES = [
  { dir: "vercel-ai", packages: ["ai", "@ai-sdk"] },
  { dir: "vercel-eve", packages: ["eve"] },
  { dir: "mastra", packages: ["@mastra/core"] },
  { dir: "claude-agent-sdk", packages: ["@anthropic-ai/claude-agent-sdk"] },
  { dir: "langchain", packages: ["langchain", "@langchain/core"] },
  { dir: "langgraph", packages: ["@langchain/langgraph", "@langchain/core"] },
  { dir: "openai-agents", packages: ["@openai/agents"] },
  { dir: "genkit", packages: ["genkit", "@genkit-ai"] },
] as const;

/**
 * Whether `specifier` imports one of `packages`, as the package itself or a
 * subpath of it. `@ai-sdk` is a scope rather than a package, and matches the
 * same way: every package under it is a subpath.
 */
function importsAnyOf(specifier: string, packages: readonly string[]): boolean {
  return packages.some((name) => specifier === name || specifier.startsWith(`${name}/`));
}

function foreignImports(
  namespaceDir: string,
  ownPackages: readonly string[],
  content: string,
): string[] {
  const found: string[] = [];

  for (const specifier of extractImportSpecifiers(content)) {
    if (importsAnyOf(specifier, ownPackages)) {
      continue;
    }
    for (const other of NAMESPACES) {
      if (other.dir === namespaceDir) {
        continue;
      }
      if (importsAnyOf(specifier, other.packages)) {
        found.push(`${other.dir}'s SDK via "${specifier}"`);
      }
    }
    // A relative hop into a sibling namespace drags that namespace's SDK in
    // transitively, which the package-name check above cannot see.
    if (specifier.startsWith(".")) {
      for (const other of NAMESPACES) {
        if (other.dir !== namespaceDir && specifier.includes(`/${other.dir}/`)) {
          found.push(`the ${other.dir} namespace via "${specifier}"`);
        }
      }
    }
  }

  return found;
}

test("no vendor namespace imports another vendor's SDK", () => {
  const srcDir = import.meta.dirname;
  const errors: string[] = [];
  let scanned = 0;

  for (const namespace of NAMESPACES) {
    for (const filePath of collectTsFiles(resolve(srcDir, namespace.dir))) {
      if (filePath.endsWith(".test.ts")) {
        continue;
      }
      let content: string;
      try {
        content = readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }
      scanned++;
      for (const foreign of foreignImports(namespace.dir, namespace.packages, content)) {
        errors.push(`${relative(srcDir, filePath)} imports ${foreign}`);
      }
    }
  }

  assert.deepEqual(errors, [], `cross-vendor imports found:\n${errors.join("\n")}`);
  // A boundary scan that walked nothing would pass silently.
  assert.ok(scanned > NAMESPACES.length, `expected to scan every namespace, saw ${scanned} files`);
});

test("the scanner detects a cross-vendor import when one is introduced", () => {
  const cases = [
    { from: "mastra", content: 'import { jsonSchema } from "ai";\nvoid jsonSchema;' },
    { from: "langgraph", content: 'import type { ToolDefinition } from "eve/tools";\nvoid 0;' },
    { from: "openai-agents", content: 'export type { X } from "@mastra/core/tools";' },
    { from: "vercel-ai", content: 'const m = await import("@openai/agents");\nvoid m;' },
    { from: "genkit", content: 'import { tool } from "@openai/agents";\nvoid tool;' },
    {
      from: "mastra",
      content: 'import { denialResult } from "../../langgraph/v1/denial.ts";\nvoid denialResult;',
    },
  ] as const;

  for (const testCase of cases) {
    const namespace = NAMESPACES.find((entry) => entry.dir === testCase.from);
    assert.ok(namespace);
    const found = foreignImports(namespace.dir, namespace.packages, testCase.content);
    assert.ok(found.length > 0, `expected a violation for ${testCase.from}: ${testCase.content}`);
  }

  // A namespace importing its own SDK, or the agnostic layer, is not a violation.
  const mastra = NAMESPACES.find((entry) => entry.dir === "mastra");
  assert.ok(mastra);
  assert.deepEqual(
    foreignImports(mastra.dir, mastra.packages, 'import type { Tool } from "@mastra/core/tools";'),
    [],
  );
  assert.deepEqual(
    foreignImports(
      mastra.dir,
      mastra.packages,
      'import { denialResult } from "../../agents/denial.ts";',
    ),
    [],
  );
});

test("the scanner reads real files, not just fixtures", () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), "arcjet-vendor-isolation-"));
  try {
    const filePath = resolve(tempDir, "leak.ts");
    writeFileSync(filePath, 'import { generateText } from "ai";\nvoid generateText;');
    const mastra = NAMESPACES.find((entry) => entry.dir === "mastra");
    assert.ok(mastra);
    const found = foreignImports(mastra.dir, mastra.packages, readFileSync(filePath, "utf-8"));
    assert.deepEqual(found, ['vercel-ai\'s SDK via "ai"']);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
