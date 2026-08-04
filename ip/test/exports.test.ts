import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("`@arcjet/ip`: should expose the documented export paths", async function () {
  const manifest: unknown = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.ok(manifest !== null && typeof manifest === "object" && "exports" in manifest);
  const exportMap = manifest.exports;
  assert.ok(exportMap !== null && typeof exportMap === "object");

  assert.deepEqual(
    new Set(Object.keys(exportMap)),
    new Set([".", "./cloudflare", "./cloudflare.js", "./package.json"]),
  );
});

test('`@arcjet/ip`: should expose the value exports of "."', async function () {
  const module = await import("@arcjet/ip");

  assert.deepEqual(
    new Set(Object.keys(module)),
    new Set(["cloudflare", "default", "findIp", "parseProxies", "parseProxy"]),
  );
});

test('`@arcjet/ip`: should expose the value exports of "./cloudflare"', async function () {
  const module = await import("@arcjet/ip/cloudflare");

  assert.deepEqual(
    new Set(Object.keys(module)),
    new Set(["cloudflare", "cloudflareIpv4Ranges", "cloudflareIpv6Ranges"]),
  );
});

test('`@arcjet/ip`: should expose "./cloudflare.js" as an alias of "./cloudflare"', async function () {
  // The same module, not a copy of it: one set of module state behind both
  // entrypoints, so `instanceof` holds across them.
  assert.equal(await import("@arcjet/ip/cloudflare.js"), await import("@arcjet/ip/cloudflare"));
});
