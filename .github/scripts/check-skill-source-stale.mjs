#!/usr/bin/env node
/**
 * Conservative stale check for TanStack Intent skills.
 *
 * Intent's `stale` command flags missing source SHAs and coverage gaps. This
 * script only fails when a declared source file is missing, or — on a pull
 * request — when a source changed and its SKILL.md did not. A changed source
 * is a review signal, not proof the skill is wrong.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string[]} argv
 * @returns {string | undefined}
 */
export function readAgainstArg(argv) {
  const index = argv.indexOf("--against");
  if (index === -1) {
    return undefined;
  }
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new Error("check-skill-source-stale: --against requires a git ref");
  }
  return value;
}

/**
 * @param {string} dir
 * @param {string} name
 * @returns {string[]}
 */
function findFiles(dir, name) {
  /** @type {string[]} */
  const out = [];
  if (!existsSync(dir)) {
    return out;
  }
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") {
        continue;
      }
      out.push(...findFiles(path, name));
    } else if (entry.name === name) {
      out.push(path);
    }
  }
  return out;
}

/**
 * Walk from a SKILL.md up to the nearest package.json, stopping at `stopAt`.
 * Skills live at `skills/<name>/SKILL.md`, three levels below the workspace
 * manifest — do not assume a fixed number of `dirname` calls.
 *
 * @param {string} skillFile
 * @param {string} stopAt
 * @returns {string | undefined}
 */
export function findNearestPackageRoot(skillFile, stopAt) {
  const root = resolve(stopAt);
  let dir = dirname(resolve(skillFile));
  for (;;) {
    if (existsSync(join(dir, "package.json"))) {
      return dir;
    }
    if (dir === root) {
      return undefined;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

/**
 * Git prints repo-relative paths with `/`. `path.relative` uses `path.sep`.
 *
 * @param {string} from
 * @param {string} to
 * @returns {string}
 */
export function toRepoRel(from, to) {
  return relative(from, to).split(sep).join("/");
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function readSources(text) {
  const normalized = text.replaceAll("\r\n", "\n");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(normalized);
  if (!match) {
    return [];
  }
  const block = match[1];
  const sourcesIndex = block.search(/^sources:\s*$/m);
  if (sourcesIndex === -1) {
    return [];
  }
  /** @type {string[]} */
  const sources = [];
  for (const line of block.slice(sourcesIndex).split("\n").slice(1)) {
    const item = /^\s+-\s+(\S+)\s*$/.exec(line);
    if (item) {
      sources.push(item[1]);
      continue;
    }
    if (/^\s*(?:#.*)?$/.test(line)) {
      continue;
    }
    // Another top-level key ends the list. Keep going past indented
    // non-items so a later key does not silently truncate sources.
    if (/^\S/.test(line)) {
      break;
    }
  }
  return sources;
}

/**
 * @param {string | undefined} against
 * @returns {Set<string>}
 */
function changedFiles(against) {
  if (!against) {
    return new Set();
  }
  const output = execFileSync("git", ["diff", "--name-only", against, "--"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return new Set(
    output
      .split("\n")
      .map((line) => line.trim().replaceAll("\\", "/"))
      .filter(Boolean),
  );
}

function invokedAsCli() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return fileURLToPath(import.meta.url) === resolve(entry);
}

function main() {
  const against = readAgainstArg(process.argv);
  const changed = changedFiles(against);
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const reviews = [];
  let checked = 0;

  for (const skillFile of findFiles(repoRoot, "SKILL.md")) {
    const packageRoot = findNearestPackageRoot(skillFile, repoRoot);
    if (!packageRoot) {
      continue;
    }
    const pkgFile = join(packageRoot, "package.json");
    const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
    const keywords = Array.isArray(pkg.keywords) ? pkg.keywords : [];
    if (!keywords.includes("tanstack-intent")) {
      continue;
    }

    checked += 1;
    const text = readFileSync(skillFile, "utf8");
    const sources = readSources(text);
    const skillRel = toRepoRel(repoRoot, skillFile);
    const skillChanged = changed.has(skillRel);

    if (sources.length === 0) {
      errors.push(`${skillRel}: missing sources list`);
      continue;
    }

    for (const source of sources) {
      const sourcePath = join(packageRoot, source);
      if (!existsSync(sourcePath) || !statSync(sourcePath).isFile()) {
        errors.push(`${skillRel}: source not found: ${source}`);
        continue;
      }
      const sourceRel = toRepoRel(repoRoot, sourcePath);
      if (against && changed.has(sourceRel) && !skillChanged) {
        reviews.push(
          `${skillRel}: source ${sourceRel} changed; review the skill (a changed source is a signal, not proof it is wrong)`,
        );
      }
    }
  }

  if (checked === 0) {
    console.error(
      "Skill source check found no TanStack Intent skills. Expected SKILL.md under a package with the tanstack-intent keyword.",
    );
    process.exit(1);
  }

  if (errors.length > 0) {
    console.error("Skill source check failed:\n" + errors.map((e) => `- ${e}`).join("\n"));
    process.exit(1);
  }

  if (reviews.length > 0) {
    console.error(
      "Conservative stale check — declared sources changed without a skill edit:\n" +
        reviews.map((e) => `- ${e}`).join("\n"),
    );
    process.exit(1);
  }

  console.log(
    against
      ? `Checked ${checked} Intent skills; sources exist; no unreviewed source edits against ${against}.`
      : `Checked ${checked} Intent skills; sources exist.`,
  );
}

if (invokedAsCli()) {
  main();
}
