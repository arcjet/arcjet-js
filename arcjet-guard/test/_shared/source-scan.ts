import { readdirSync } from "node:fs";
import { resolve } from "node:path";

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
export function stripCommentsAndTemplates(source: string): string {
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
 * Spans of ordinary string literals in stripped content. After
 * `stripCommentsAndTemplates` runs, comments are spaces and template literals
 * are `` ` ``-pairs, so re-tokenizing yields the surviving string-literal
 * spans. Expression-position dynamic-import matching discards any match whose
 * keyword falls inside one: a real `import("x")` keyword sits outside every
 * literal, while the same text inside a string is data, not an import.
 *
 * The tokenizer does not model regex literals, so an unbalanced quote inside
 * one (such as `/"/`) opens a phantom span that runs to the next quote. A
 * desynchronized span can be either over- or under-broad, but both failure
 * modes cost at most a spurious detection — never a missed import — which is
 * why spans gate only the expression-position matcher below; the line-anchored
 * matcher stays unfiltered so a phantom span can never suppress a match it
 * catches.
 */
function stringLiteralSpans(cleanContent: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const match of cleanContent.matchAll(COMMENT_OR_STRING)) {
    const token = match[0];
    if ((token.startsWith('"') || token.startsWith("'")) && match.index !== undefined) {
      spans.push([match.index, match.index + token.length]);
    }
  }
  return spans;
}

/**
 * Dynamic `import("x")` and `require("x")` specifiers.
 *
 * Two matchers, unioned by match end offset. The line-anchored matcher runs
 * unfiltered, so tokenizer desync from a regex literal containing a quote can
 * never hide a line-start dynamic import. The expression-position matcher —
 * `return import("eve")` inside a function body counts, because a dynamic
 * import is a runtime load wherever it appears — is additionally gated on
 * {@link stringLiteralSpans} so import text inside a string is not read as an
 * import, and its lookbehind rejects property accesses such as
 * `mock.import("x")`. An expression-position import on a line desynchronized
 * by a preceding unbalanced regex-literal quote (one that pairs with a later
 * quote; `/a "b" c/` is balanced and harmless) is the one form neither
 * matcher sees.
 */
function dynamicImportSpecifiers(cleanContent: string): string[] {
  // Keyed by the match's end offset — both matchers consume through the
  // closing paren, so the same occurrence dedupes even though the anchored
  // match starts at the line's leading whitespace.
  const found = new Map<number, string>();
  let match: RegExpExecArray | null;

  const anchoredRegex = /^[ \t]*(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/gm;
  while ((match = anchoredRegex.exec(cleanContent)) !== null) {
    const specifier = match[1];
    if (specifier !== undefined) {
      found.set(match.index + match[0].length, specifier);
    }
  }

  const spans = stringLiteralSpans(cleanContent);
  const expressionRegex = /(?<![.\w$])(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((match = expressionRegex.exec(cleanContent)) !== null) {
    const keyword = match.index;
    const specifier = match[1];
    if (
      specifier !== undefined &&
      !spans.some(([start, end]) => keyword >= start && keyword < end)
    ) {
      found.set(match.index + match[0].length, specifier);
    }
  }

  return [...found.values()];
}

/**
 * Parse import/export statements from a file and extract specifiers.
 * Matches patterns like:
 * - import { x } from "./foo.ts"
 * - export { x } from "./bar.ts"
 * - export type { T } from "./baz.ts"
 * - import "ai" (bare side-effect import)
 * - import("ai") (dynamic import, in expression position anywhere in a line)
 * - require("ai") (dynamic require, likewise)
 */
export function extractImportSpecifiers(content: string): string[] {
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

  specifiers.push(...dynamicImportSpecifiers(cleanContent));

  return specifiers;
}

/**
 * Recursively collect all .ts files from a directory, including test files.
 * Walks directory tree and collects all .ts file paths.
 */
export function collectTsFiles(dir: string): string[] {
  const filesToCheck: string[] = [];

  function walk(dirPath: string): void {
    try {
      const entries = readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const entryName = entry.name;
        if (entry.isFile() && entryName.endsWith(".ts")) {
          filesToCheck.push(resolve(dirPath, entryName));
        } else if (entry.isDirectory() && !entryName.startsWith(".")) {
          walk(resolve(dirPath, entryName));
        }
      }
    } catch {
      // Ignore missing directories
    }
  }

  walk(dir);
  return filesToCheck;
}

/**
 * Extract import/export specifiers along with whether the statement was
 * type-only.
 *
 * `import type { X } from "eve"` and `export type { X } from "eve"` are erased
 * at compile time; a plain `import { x } from "eve"` is not. The vercel-eve
 * namespace is required to use only the former, so the two must be told apart —
 * which `extractImportSpecifiers` deliberately does not do (the agnostic-layer
 * boundary forbids both forms and never needed the distinction).
 *
 * Inline type modifiers (`import { type X, y } from "eve"`) count as a VALUE
 * import: the statement still emits, because `y` is a value.
 *
 * Dynamic `import("...")` and `require("...")` calls are matched in expression
 * position anywhere in a line and always classified as value imports — a
 * dynamic import emits at runtime wherever it appears.
 */
export function extractTypedImportSpecifiers(
  content: string,
): Array<{ specifier: string; typeOnly: boolean }> {
  const specifiers: Array<{ specifier: string; typeOnly: boolean }> = [];

  const cleanContent = stripCommentsAndTemplates(content);

  // Match import/export statements anchored to line start.
  // First try type-only form: `import type { ... } from "..."`
  const typeOnlyRegex = /^[ \t]*(import|export)\s+type\b[^;=]*?from\s+["']([^"']+)["']/gm;
  let match: RegExpExecArray | null;

  // Check type-only imports
  while ((match = typeOnlyRegex.exec(cleanContent)) !== null) {
    const specifier = match[2];
    if (specifier !== undefined) {
      specifiers.push({ specifier, typeOnly: true });
    }
  }

  // Now match general import/export statements
  const importFromRegex = /^[ \t]*(?:import|export)\b[^;=]*?from\s+["']([^"']+)["']/gm;
  // Match bare side-effect imports: import "package"
  const bareImportRegex = /^[ \t]*import\s+["']([^"']+)["']/gm;

  // Check import...from patterns (but skip those already matched as type-only)
  while ((match = importFromRegex.exec(cleanContent)) !== null) {
    const specifier = match[1];
    if (specifier !== undefined) {
      // Check if this match was already captured as type-only by looking at the full line
      const lineStart = cleanContent.lastIndexOf("\n", match.index) + 1;
      const lineEnd = cleanContent.indexOf("\n", match.index);
      const line = cleanContent.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);

      // If the line starts with "import type" or "export type", skip it (already added above)
      if (!line.trim().startsWith("import type") && !line.trim().startsWith("export type")) {
        specifiers.push({ specifier, typeOnly: false });
      }
    }
  }

  // Check bare imports
  while ((match = bareImportRegex.exec(cleanContent)) !== null) {
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.push({ specifier, typeOnly: false });
    }
  }

  // Dynamic imports and requires always emit at runtime, so they are value imports
  for (const specifier of dynamicImportSpecifiers(cleanContent)) {
    specifiers.push({ specifier, typeOnly: false });
  }

  return specifiers;
}

/**
 * Sort object keys using Array#toSorted().
 *
 * oxlint's type-aware checker has no signature for Array#toSorted(), which
 * causes spurious errors under unicorn/no-array-sort even though the call
 * is valid. This boundary confines the disable directive to a single location.
 */
export function sortedKeys(source: object): string[] {
  // oxlint-disable-next-line typescript/no-unsafe-return, typescript/no-unsafe-call -- oxlint's type-aware checker has no signature for Array#toSorted, which unicorn/no-array-sort requires
  return Object.keys(source).toSorted();
}

/**
 * Read back a call the stub client recorded. The stub stores them as `unknown`
 * because it accepts whatever the caller passed.
 */
export function recorded(call: unknown): Record<string, unknown> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- recorded calls are untyped by construction
  return call as Record<string, unknown>;
}

/**
 * Read a wrapped tool's result as a denial payload. The SDK types the result as
 * the tool's own output, so narrowing to the denial shape is the test's job.
 *
 * The type parameter has no default on purpose: defaulting it to an index
 * signature would let a misspelled field compile and silently pass.
 */
export function asDenial<TResult>(value: unknown): TResult {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the SDK types results as the tool's output union
  return value as TResult;
}

/**
 * Expected root export keys in arcjet-guard/package.json exports map.
 * Shared by both vercel-ai/v7 and vercel-eve/v0 test files.
 */
export const EXPECTED_ROOT_KEYS = [
  ".",
  "./bun",
  "./claude-agent-sdk/v0",
  "./claude-managed-agents/v0",
  "./fetch",
  "./genkit/v1",
  "./google-adk/v2",
  "./langchain/v1",
  "./langgraph/v1",
  "./mastra/v1",
  "./node",
  "./openai-agents/v0",
  "./package.json",
  "./strands-agents/v1",
  "./tanstack-ai/v0",
  // The in-memory client for application tests. Deliberately a single entry
  // rather than a runtime-conditional one: it has no transport, so there is
  // nothing for a condition to select.
  "./testing",
  "./vercel-ai/v7",
  "./vercel-eve/v0",
] as const;

/**
 * Expected runtime conditions in arcjet-guard/package.json exports["."] entry.
 * Shared by both vercel-ai/v7 and vercel-eve/v0 test files.
 */
export const EXPECTED_CONDITIONS = [
  "bun",
  "default",
  "deno",
  "edge-light",
  "node",
  "workerd",
] as const;
