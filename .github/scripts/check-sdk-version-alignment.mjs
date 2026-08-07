/**
 * Fail when a vendor SDK resolves to more than one version across the
 * repository.
 *
 * The examples install separately from the workspace root and pin their own
 * lockfiles, while `@arcjet/guard` reaches them by path — so TypeScript resolves
 * the SDK for guard's declarations from the root and for an example's own code
 * from that example. Two copies are two nominally distinct declarations of the
 * same type, and every value passed across the boundary stops assigning. The
 * install succeeds and the failure surfaces much later as an unrelated-looking
 * type error, which is why this is worth a dedicated check.
 *
 * The watched set is `@arcjet/guard`'s peer dependencies. Those are exactly the
 * packages whose types cross that boundary, and deriving the set means a new
 * vendor namespace is covered the day its peer is declared rather than whenever
 * someone remembers to update this file.
 *
 * Reads lockfiles rather than `node_modules` so it needs no install and can run
 * in the lint job.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const GUARD_MANIFEST = "arcjet-guard/package.json";

/** Every resolved version of `name` recorded in one lockfile, including nested copies. */
function versionsIn(lockfilePath, name) {
  if (!existsSync(lockfilePath)) return [];
  const lock = JSON.parse(readFileSync(lockfilePath, "utf8"));
  const found = [];
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    // "node_modules/ai" and "node_modules/x/node_modules/ai" both count; a path
    // ending in the name is the package itself rather than something beneath it.
    if (path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`)) {
      if (typeof entry.version === "string") found.push({ path, version: entry.version });
    }
  }
  return found;
}

const watched = Object.keys(
  JSON.parse(readFileSync(GUARD_MANIFEST, "utf8")).peerDependencies ?? {},
);

if (watched.length === 0) {
  console.error(`No peer dependencies found in ${GUARD_MANIFEST}; nothing to check.`);
  process.exit(1);
}

const lockfiles = ["package-lock.json"];
for (const dir of readdirSync("examples")) {
  const lock = join("examples", dir, "package-lock.json");
  if (existsSync(lock)) lockfiles.push(lock);
}

let failed = false;

for (const name of watched) {
  /** @type {Map<string, string[]>} version -> where it was found */
  const byVersion = new Map();
  for (const lockfile of lockfiles) {
    for (const { path, version } of versionsIn(lockfile, name)) {
      const where = `${lockfile} (${path})`;
      byVersion.set(version, [...(byVersion.get(version) ?? []), where]);
    }
  }

  if (byVersion.size <= 1) {
    const only = [...byVersion.keys()][0];
    console.log(`ok  ${name}: ${only ?? "not installed anywhere"}`);
    continue;
  }

  failed = true;
  console.error(`\nFAIL ${name} resolves to ${byVersion.size} different versions:`);
  for (const [version, locations] of [...byVersion].sort()) {
    console.error(`  ${version}`);
    for (const location of locations) console.error(`    ${location}`);
  }
}

if (failed) {
  console.error(
    "\nA vendor SDK must resolve to one version everywhere. @arcjet/guard is linked\n" +
      "into the examples by path, so a version that differs between an example and the\n" +
      "workspace root gives TypeScript two declarations of the same type and every\n" +
      "value crossing that boundary fails to assign.\n\n" +
      "Align the versions — usually by pinning the example to whatever the root\n" +
      "resolves — and re-run `npm install` in that example.",
  );
  process.exit(1);
}

console.log("\nAll vendor SDKs resolve to a single version.");
