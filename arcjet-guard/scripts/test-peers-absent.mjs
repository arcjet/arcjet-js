/**
 * Prove each type-only vendor namespace still runs when its optional peer is
 * gone. A static scan (`type-only.test.ts`) proves the imports are written
 * `import type`; this proves the consequence, catching a build step that
 * re-emits one as a value import.
 *
 * Only `src/<namespace>` is globbed. Suites that exercise the real SDK
 * value-import the peer, so they live under `test/<namespace>` and run in
 * `npm run test-unit`, where the peer is installed.
 *
 * `vercel-ai` is omitted on purpose: its `src/` tests value-import `ai`,
 * and it has no `type-only.test.ts`. Adding that file without adding a
 * check here fails the discovery assertion below.
 *
 * Eve is last because it deletes a shared devDependency. The floor-pin
 * step in CI also needs eve on disk, so it runs before this script.
 *
 * A failing check does not stop the run: each check only needs its own peer
 * gone, so reporting all of them beats the one-at-a-time YAML steps this
 * replaced, where the first failure hid the rest.
 *
 * Usage: `node scripts/test-peers-absent.mjs [name...]`
 * With no names, every check runs.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(SCRIPT_DIR, "..");
const WORKSPACE_ROOT = join(PACKAGE_ROOT, "..");
const SRC_ROOT = join(PACKAGE_ROOT, "src");
const MIN_TEST_FILES = 5;

/**
 * One check per namespace that imports its SDK for types only.
 * `dir` is the folder under `src/`. `remove` may include a scope
 * (`@genkit-ai`) so nested copies of the peer disappear too.
 */
const CHECKS = [
  {
    name: "claude-agent-sdk",
    dir: "claude-agent-sdk",
    version: "v0",
    remove: ["@anthropic-ai/claude-agent-sdk"],
    resolve: ["@anthropic-ai/claude-agent-sdk"],
  },
  {
    name: "langgraph",
    dir: "langgraph",
    version: "v1",
    remove: ["@langchain/langgraph", "@langchain/core"],
    resolve: ["@langchain/langgraph", "@langchain/core"],
  },
  {
    name: "langchain",
    dir: "langchain",
    version: "v1",
    remove: ["langchain", "@langchain/core"],
    resolve: ["langchain", "@langchain/core"],
  },
  {
    name: "genkit",
    dir: "genkit",
    version: "v1",
    remove: ["genkit", "@genkit-ai"],
    resolve: ["genkit"],
  },
  {
    name: "openai-agents",
    dir: "openai-agents",
    version: "v0",
    remove: ["@openai/agents"],
    resolve: ["@openai/agents"],
  },
  {
    name: "mastra",
    dir: "mastra",
    version: "v1",
    remove: ["@mastra/core"],
    resolve: ["@mastra/core"],
  },
  {
    name: "strands-agents",
    dir: "strands-agents",
    version: "v1",
    remove: ["@strands-agents/sdk"],
    resolve: ["@strands-agents/sdk"],
  },
  {
    name: "tanstack-ai",
    dir: "tanstack-ai",
    version: "v0",
    remove: ["@tanstack/ai"],
    resolve: ["@tanstack/ai"],
  },
  {
    name: "google-adk",
    dir: "google-adk",
    version: "v2",
    remove: ["@google/adk"],
    resolve: ["@google/adk"],
  },
  // Last: deletes a shared devDependency.
  {
    name: "eve",
    dir: "vercel-eve",
    version: "v0",
    remove: ["eve"],
    resolve: ["eve"],
  },
];

function nodeModulesCopies(id) {
  return [join(WORKSPACE_ROOT, "node_modules", id), join(PACKAGE_ROOT, "node_modules", id)];
}

function removeFromDisk(id) {
  for (const target of nodeModulesCopies(id)) {
    rmSync(target, { recursive: true, force: true });
  }
}

function assertUnresolved(specifier, resolveFrom) {
  const resolver = createRequire(join(resolveFrom, "dummy.js"));
  try {
    resolver.resolve(specifier);
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      return;
    }
    throw error;
  }
  throw new Error(`${specifier} still resolves`);
}

function countTestFiles(dir) {
  return readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((name) =>
    name.endsWith(".test.ts"),
  ).length;
}

/**
 * Namespaces that already have a type-only scan must have a check here, and
 * every check must have that scan. Otherwise a new vendor can land a
 * `type-only.test.ts` (or a YAML-era check) and CI will keep passing.
 */
function discoverTypeOnlyNamespaces() {
  const found = [];
  for (const entry of readdirSync(SRC_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const nsDir = join(SRC_ROOT, entry.name);
    for (const version of readdirSync(nsDir, { withFileTypes: true })) {
      if (!version.isDirectory()) {
        continue;
      }
      if (existsSync(join(nsDir, version.name, "type-only.test.ts"))) {
        found.push({ dir: entry.name, version: version.name });
      }
    }
  }
  return found;
}

function assertChecksMatchSource() {
  if (CHECKS.at(-1)?.dir !== "vercel-eve") {
    throw new Error("eve must run last: it deletes a shared devDependency");
  }

  const discovered = discoverTypeOnlyNamespaces();
  const missing = discovered.filter(
    (ns) => !CHECKS.some((check) => check.dir === ns.dir && check.version === ns.version),
  );
  const extra = CHECKS.filter(
    (check) => !discovered.some((ns) => ns.dir === check.dir && ns.version === check.version),
  );

  const errors = [];
  if (missing.length > 0) {
    errors.push(
      `type-only namespaces with no peer-absent check: ${missing
        .map((ns) => `${ns.dir}/${ns.version}`)
        .join(", ")}`,
    );
  }
  if (extra.length > 0) {
    errors.push(
      `peer-absent checks with no type-only.test.ts: ${extra
        .map((check) => `${check.dir}/${check.version}`)
        .join(", ")}`,
    );
  }
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}

function beginGroup(title) {
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log(`::group::${title}`);
  } else {
    console.log(`\n=== ${title} ===`);
  }
}

function endGroup() {
  if (process.env.GITHUB_ACTIONS === "true") {
    console.log("::endgroup::");
  }
}

function runCheck(check) {
  const title = `Unit tests with ${check.name} absent`;
  beginGroup(title);
  try {
    for (const id of check.remove) {
      removeFromDisk(id);
    }

    const resolveFrom = join(PACKAGE_ROOT, "src", check.dir, check.version);
    for (const specifier of check.resolve) {
      assertUnresolved(specifier, resolveFrom);
    }

    const testDir = join(PACKAGE_ROOT, "src", check.dir);
    const count = countTestFiles(testDir);
    if (count < MIN_TEST_FILES) {
      throw new Error(`only ${count} ${check.name} test files matched; the glob has gone stale`);
    }

    // Node expands the glob itself; `spawnSync` without a shell passes it through
    // literally, which is what the quoting did in the YAML this replaced.
    const glob = `src/${check.dir}/**/*.test.ts`;
    const result = spawnSync(process.execPath, ["--test", glob], {
      cwd: PACKAGE_ROOT,
      stdio: "inherit",
    });
    if (result.error) {
      throw new Error(`${title} could not start: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const how = result.signal === null ? `exit ${result.status}` : `signal ${result.signal}`;
      throw new Error(`${title} failed (${how})`);
    }
    console.log(`${title}: ${count} files, peers gone`);
  } finally {
    endGroup();
  }
}

const requested = process.argv.slice(2);
const selected =
  requested.length === 0
    ? CHECKS
    : requested.map((name) => {
        const check = CHECKS.find((entry) => entry.name === name);
        if (!check) {
          throw new Error(
            `unknown peer-absent check "${name}"; known: ${CHECKS.map((entry) => entry.name).join(", ")}`,
          );
        }
        return check;
      });

assertChecksMatchSource();

const failures = [];
for (const check of selected) {
  try {
    runCheck(check);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}

if (failures.length > 0) {
  console.error(`\n${failures.length} peer-absent check(s) failed:`);
  for (const message of failures) {
    console.error(`  ${message}`);
  }
  // Not `process.exit`: that can drop buffered stdout when it is a pipe, which
  // is exactly where this summary is read from under Actions.
  process.exitCode = 1;
}
