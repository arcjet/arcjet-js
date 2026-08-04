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
 * Parse import/export statements from a file and extract specifiers.
 * Matches patterns like:
 * - import { x } from "./foo.ts"
 * - export { x } from "./bar.ts"
 * - export type { T } from "./baz.ts"
 * - import "ai" (bare side-effect import)
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
