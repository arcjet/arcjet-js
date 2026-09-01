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
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const against = process.argv.includes("--against")
  ? process.argv[process.argv.indexOf("--against") + 1]
  : undefined;

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
 * @param {string} text
 * @returns {string[]}
 */
function readSources(text) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
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
    if (!item) {
      break;
    }
    sources.push(item[1]);
  }
  return sources;
}

/**
 * @returns {Set<string>}
 */
function changedFiles() {
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
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

const changed = changedFiles();
/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const reviews = [];

for (const skillFile of findFiles(repoRoot, "SKILL.md")) {
  const packageRoot = dirname(dirname(skillFile));
  const pkgFile = join(packageRoot, "package.json");
  if (!existsSync(pkgFile)) {
    continue;
  }
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
  const keywords = Array.isArray(pkg.keywords) ? pkg.keywords : [];
  if (!keywords.includes("tanstack-intent")) {
    continue;
  }

  const text = readFileSync(skillFile, "utf8");
  const sources = readSources(text);
  const skillRel = relative(repoRoot, skillFile);
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
    const sourceRel = relative(repoRoot, sourcePath);
    if (against && changed.has(sourceRel) && !skillChanged) {
      reviews.push(
        `${skillRel}: source ${sourceRel} changed; review the skill (a changed source is a signal, not proof it is wrong)`,
      );
    }
  }
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
    ? `Skill sources exist; no unreviewed source edits against ${against}.`
    : "Skill sources exist.",
);
