import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import * as v7Namespace from "./index.ts";
import * as agentsBarrel from "../../agents/index.ts";
import type { Tool } from "ai";

import type { ArcjetDenialResult, GuardToolPolicy } from "./index.ts";

// `Object.keys` on a namespace import never lists type-only exports, so assert
// them at type level instead: this stops compiling if the barrel drops one.
function verifyTypeExports(): void {
  const policy: GuardToolPolicy<Tool> | undefined = undefined;
  const denial: ArcjetDenialResult | undefined = undefined;
  void [policy, denial];
}

verifyTypeExports();

/**
 * Comments, template literals and ordinary string literals, in one alternation.
 * Order matters: whichever construct opens first at a given position consumes the
 * rest of itself, so a `/*` inside a string is not read as a comment and a quote
 * inside a comment is not read as a string.
 */
const COMMENT_OR_STRING =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'/g;

/**
 * Blank out anything that can masquerade as an import.
 *
 * Comments become equivalent runs of spaces, preserving newlines so the
 * line-anchored patterns below still see the real line structure. Template
 * literals are emptied, because an import specifier is never written with
 * backticks but a template can contain the text of a whole import statement.
 * Ordinary string literals are left intact — they carry the specifiers we want.
 */
function stripCommentsAndTemplates(source: string): string {
  return source.replaceAll(COMMENT_OR_STRING, (token) => {
    if (token.startsWith("//") || token.startsWith("/*")) {
      return token.replaceAll(/[^\n]/g, " ");
    }
    if (token.startsWith("`")) {
      return "``";
    }
    return token;
  });
}

/**
 * Parse import/export statements from a file and extract specifiers.
 * Matches patterns like:
 * - import { x } from "./foo.ts"
 * - export { x } from "./bar.ts"
 * - import "ai" (bare side-effect import)
 */
function extractImportSpecifiers(content: string): string[] {
  const specifiers: string[] = [];

  const cleanContent = stripCommentsAndTemplates(content);

  // Match import/export statements anchored to line start. `=` is excluded along
  // with `;` so a declaration such as `export const NOTE = "... from 'ai'"` cannot
  // be read as an import of `ai`.
  const importFromRegex = /^[ \t]*(?:import|export)\b[^;=]*?from\s+["']([^"']+)["']/gm;
  // Match bare side-effect imports: import "package"
  const bareImportRegex = /^[ \t]*import\s+["']([^"']+)["']/gm;

  let match: RegExpExecArray | null;

  // Check import...from patterns
  while ((match = importFromRegex.exec(cleanContent)) !== null) {
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }

  // Check bare imports
  while ((match = bareImportRegex.exec(cleanContent)) !== null) {
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.push(specifier);
    }
  }

  return specifiers;
}

// AC1.3: Namespace exports guardTool and aiToolsContext as functions
test("AC1.3: exports guardTool and aiToolsContext", () => {
  assert.equal(typeof v7Namespace.guardTool, "function", "guardTool must be exported as a function");
  assert.equal(
    typeof v7Namespace.aiToolsContext,
    "function",
    "aiToolsContext must be exported as a function",
  );
});

// AC1.4: Proxy identity — shared exports have same function identity
test("AC1.4: shared exports have same function identity", () => {
  // These shared exports must be the same function objects, not wrappers
  const sharedExports = ["guardAction", "captureAction", "securityMetadata", "createAgentContext", "ArcjetDeniedError"] as const;

  for (const exportName of sharedExports) {
    const v7Value = (v7Namespace as Record<string, unknown>)[exportName];
    const agentValue = (agentsBarrel as Record<string, unknown>)[exportName];

    assert.strictEqual(
      v7Value,
      agentValue,
      `${exportName} must be the same object identity from both imports`,
    );
  }

  // Verify namespace is a strict superset of agents barrel
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
  const v7Keys: string[] = Object.keys(v7Namespace).toSorted();
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
  const agentKeys: string[] = Object.keys(agentsBarrel).toSorted();

  for (const key of agentKeys) {
    assert.ok(
      v7Keys.includes(key),
      `agents barrel key "${key}" must be present in v7 namespace (superset requirement)`,
    );
  }

  // v7 has at least the agents keys plus guardTool
  assert.ok(
    v7Keys.length >= agentKeys.length,
    `v7 namespace must be a superset of agents barrel (v7 has ${v7Keys.length}, agents has ${agentKeys.length})`,
  );
});

// AC1.2: Agents barrel exports the documented symbols
test("AC1.2: agents barrel exports documented symbols", () => {
  const requiredSymbols = [
    "createAgentContext",
    "securityMetadata",
    "guardAction",
    "captureAction",
    "ArcjetDeniedError",
  ] as const;

  for (const symbol of requiredSymbols) {
    const value = (agentsBarrel as Record<string, unknown>)[symbol];
    assert.ok(
      value !== undefined,
      `agents barrel must export ${symbol}`,
    );
  }
});

/**
 * Read a JSON file as a plain record. `JSON.parse` is untyped by definition, so
 * the boundary is asserted once here rather than at each call site.
 */
function readJsonObject(path: string): Record<string, unknown> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- JSON.parse returns any
  return JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
}

/**
 * Read a nested object field, or undefined when the field is absent or not an
 * object.
 */
function objectField(
  source: Record<string, unknown>,
  key: string,
): Record<string, unknown> | undefined {
  const value = source[key];
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- guarded by the checks above
    return value as Record<string, unknown>;
  }
  return undefined;
}

// AC1.5 and AC1.6: Export map verification (static check, no build required)
test("AC1.5 and AC1.6: export map has correct subpaths", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
  const exportKeys = Object.keys(exportsMap).toSorted();

  // AC1.5: ./vercel-ai (unversioned) must NOT exist
  assert.ok(
    // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/strict-boolean-expressions -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
    !exportKeys.includes("./vercel-ai"),
    'export map must not have "./vercel-ai" (unversioned alias prohibited)',
  );

  // AC1.6: ./vercel-ai/v6 must NOT exist
  assert.ok(
    // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/strict-boolean-expressions -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
    !exportKeys.includes("./vercel-ai/v6"),
    'export map must not have "./vercel-ai/v6" (unsupported major version)',
  );

  // AC1.6: No wildcard keys starting with ./vercel-ai/ except v7 literal
  for (const key of exportKeys) {
    // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/strict-boolean-expressions -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
    if (key.startsWith("./vercel-ai/")) {
      assert.equal(
        key,
        "./vercel-ai/v7",
        `export map must not have wildcard vercel-ai subpaths; found "${key}"`,
      );
    }
  }

  // Must have ./vercel-ai/v7
  assert.ok(
    // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/strict-boolean-expressions -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
    exportKeys.includes("./vercel-ai/v7"),
    'export map must have "./vercel-ai/v7"',
  );

  // Must have ./agents
  assert.ok(
    // oxlint-disable-next-line typescript/no-unsafe-call, typescript/no-unsafe-member-access, typescript/strict-boolean-expressions -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
    exportKeys.includes("./agents"),
    'export map must have "./agents"',
  );
});

// AC1.1: Root surface unchanged (three checks)
test("AC1.1: root export map keys and runtime conditions unchanged", () => {
  const packageJson = readJsonObject(resolve(import.meta.dirname, "../../../package.json"));
  const exportsMap = objectField(packageJson, "exports");
  assert.ok(exportsMap, "package.json must have an exports field");

  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
  const exportKeys = Object.keys(exportsMap).toSorted();
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
  const expectedRootKeys = [".", "./agents", "./bun", "./fetch", "./node", "./vercel-ai/v7"].toSorted();

  assert.deepEqual(
    exportKeys,
    expectedRootKeys,
    "root export map keys must exactly match expected set (no additions, no removals)",
  );

  // Check the . entry's runtime conditions
  const rootEntry = objectField(exportsMap, ".");
  assert.ok(rootEntry, 'export map must have "." entry');

  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
  const runtimeConditions = Object.keys(rootEntry).toSorted();
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call -- oxlint has no type for Array#toSorted, which unicorn/no-array-sort requires
  const expectedConditions = ["bun", "default", "deno", "edge-light", "node", "workerd"].toSorted();

  assert.deepEqual(
    runtimeConditions,
    expectedConditions,
    "root . entry runtime conditions must exactly match expected set",
  );
});

// AC1.1: Root barrel named exports are importable and are functions
test("AC1.1: root barrel exports rule builders", async () => {
  // Use dynamic import to load the root barrel
  const rootBarrel = await import("../../index.ts");

  // The rule builders are exported directly from src/index.ts.
  // launchArcjet is not exported from index.ts (it's in the conditional exports node.ts/fetch.ts),
  // so we test the rule builders which ARE in the root barrel.
  const requiredFunctions = ["tokenBucket", "fixedWindow", "slidingWindow"] as const;

  for (const funcName of requiredFunctions) {
    const func = (rootBarrel as Record<string, unknown>)[funcName];
    assert.equal(
      typeof func,
      "function",
      `root barrel must export ${funcName} as a function`,
    );
  }
});

// AC2.3: Static precondition — guard-tool.ts and tools-context.ts import from ai/@ai-sdk/provider-utils
test("AC2.3: guard-tool and tools-context have ai SDK dependencies (static check)", () => {
  const guardToolPath = resolve(import.meta.dirname, "./guard-tool.ts");
  const toolsContextPath = resolve(import.meta.dirname, "./tools-context.ts");

  const errors: string[] = [];

  // Read guard-tool.ts and verify it imports from ai
  let guardToolContent: string;
  try {
    guardToolContent = readFileSync(guardToolPath, "utf-8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    assert.fail(`Failed to read guard-tool.ts: ${message}`);
  }

  const guardToolImports = extractImportSpecifiers(guardToolContent);
  if (!guardToolImports.includes("ai")) {
    errors.push("guard-tool.ts must import from 'ai'");
  }

  // Read tools-context.ts and verify it imports from @ai-sdk/provider-utils
  let toolsContextContent: string;
  try {
    toolsContextContent = readFileSync(toolsContextPath, "utf-8");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    assert.fail(`Failed to read tools-context.ts: ${message}`);
  }

  const toolsContextImports = extractImportSpecifiers(toolsContextContent);
  if (!toolsContextImports.includes("@ai-sdk/provider-utils")) {
    errors.push("tools-context.ts must import from '@ai-sdk/provider-utils'");
  }

  assert.equal(
    errors.length,
    0,
    `AC2.3 static precondition failed (v7 imports fail without ai peer):\n${errors.join("\n")}`,
  );
});

// AC5.4: No protectTool or ProtectToolPolicy identifiers under src/vercel-ai/
test("AC5.4: no old protectTool identifiers in src/vercel-ai/", () => {
  const vercelAiDir = resolve(import.meta.dirname, "..");
  const errors: string[] = [];

  // Construct needles from parts to avoid matching this test file's assertions
  const protectToolNeedle = ["protect", "Tool"].join("");
  const protectToolPolicyNeedle = ["Protect", "Tool", "Policy"].join("");

  // Walk src/vercel-ai/ looking for .ts files (excluding test files to focus on source)
  function walkDir(dirPath: string): void {
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryName = entry.name;
        if (entry.isFile() && entryName.endsWith(".ts") && !entryName.endsWith(".test.ts")) {
          const filePath = resolve(dirPath, entryName);
          let content: string;
          try {
            content = readFileSync(filePath, "utf-8");
          } catch {
            // Ignore files that can't be read
            continue;
          }

          if (new RegExp(`\\b${protectToolNeedle}\\b`).test(content)) {
            errors.push(`${filePath}: contains ${protectToolNeedle}`);
          }

          if (new RegExp(`\\b${protectToolPolicyNeedle}\\b`).test(content)) {
            errors.push(`${filePath}: contains ${protectToolPolicyNeedle}`);
          }
        }
      }
    } catch {
      // Ignore missing directories
    }
  }

  walkDir(vercelAiDir);

  assert.equal(
    errors.length,
    0,
    `protectTool identifiers found in src/vercel-ai/:\n${errors.join("\n")}`,
  );
});
