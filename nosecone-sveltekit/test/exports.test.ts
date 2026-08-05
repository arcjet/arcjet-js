import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("`@nosecone/sveltekit`: should expose the documented export paths", async function () {
  const manifest: unknown = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.ok(manifest !== null && typeof manifest === "object" && "exports" in manifest);
  const exportMap = manifest.exports;
  assert.ok(exportMap !== null && typeof exportMap === "object");

  assert.deepEqual(new Set(Object.keys(exportMap)), new Set([".", "./package.json"]));
});

test('`@nosecone/sveltekit`: should expose the value exports of "."', async function () {
  const module = await import("@nosecone/sveltekit");

  assert.deepEqual(
    new Set(Object.keys(module)),
    new Set(["createHook", "csp", "default", "defaults", "nosecone", "withVercelToolbar"]),
  );
});
