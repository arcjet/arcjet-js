#!/usr/bin/env node
/**
 * Run @tanstack/intent's CLI by file path.
 *
 * The `intent` bin name is also claimed by `@tanstack/devtools-event-client`,
 * so `npx intent` / `npm exec intent` can invoke the wrong package.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const entry = fileURLToPath(import.meta.resolve("@tanstack/intent"));
const cli = join(dirname(entry), "cli.mjs");
const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status === null ? 1 : result.status);
