import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { AI_PEERS_INSTALL_MESSAGE, importAi, missingAiPeersError } from "./peers.ts";

test("missing ai names both packages", () => {
  assert.equal(
    missingAiPeersError().message,
    `@arcjet/guard/vercel-ai/v7: ${AI_PEERS_INSTALL_MESSAGE}`,
  );
  assert.equal(AI_PEERS_INSTALL_MESSAGE, "install ai and @ai-sdk/provider-utils.");
});

test("importAi returns the ai module when the peers are installed", async () => {
  const ai = await importAi();
  assert.equal(typeof ai.jsonSchema, "function");
});

test("importing the v7 namespace without ai peers throws the install line", () => {
  const dir = mkdtempSync(join(tmpdir(), "arcjet-ai-peers-"));
  try {
    const hookPath = join(dir, "hook.mjs");
    const registerPath = join(dir, "register.mjs");
    writeFileSync(
      hookPath,
      `
export async function resolve(specifier, context, nextResolve) {
  if (
    specifier === "ai" ||
    specifier.startsWith("ai/") ||
    specifier === "@ai-sdk/provider-utils" ||
    specifier.startsWith("@ai-sdk/provider-utils/")
  ) {
    const error = new Error("Cannot find package '" + specifier + "'");
    error.code = "ERR_MODULE_NOT_FOUND";
    throw error;
  }
  return nextResolve(specifier, context);
}
`,
    );
    writeFileSync(
      registerPath,
      `
import { register } from "node:module";
register(new URL("./hook.mjs", import.meta.url));
`,
    );

    const namespaceUrl = pathToFileURL(join(import.meta.dirname, "index.ts")).href;
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        pathToFileURL(registerPath).href,
        "--input-type=module",
        "-e",
        `
try {
  await import(${JSON.stringify(namespaceUrl)});
  console.error("expected the v7 namespace import to fail");
  process.exit(1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("install ai and @ai-sdk/provider-utils.")) {
    console.error(error);
    process.exit(2);
  }
}
`,
      ],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
