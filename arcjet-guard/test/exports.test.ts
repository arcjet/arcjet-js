import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("`@arcjet/guard`: should expose the documented export paths", async function () {
    const manifest: unknown = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    );
    assert.ok(manifest !== null && typeof manifest === "object" && "exports" in manifest);
    const exportMap = manifest.exports;
    assert.ok(exportMap !== null && typeof exportMap === "object");

    assert.deepEqual(
      new Set(Object.keys(exportMap)),
      new Set([
        ".",
        "./bun",
        "./fetch",
        "./node",
        "./vercel-ai/v7",
      ]),
    );
  });

test('`@arcjet/guard`: should expose the value exports of "."', async function () {
    const module = await import("@arcjet/guard");

    assert.deepEqual(
      new Set(Object.keys(module)),
      new Set([
        "_launchWithTransportFactory",
        "createTransport",
        "defineCustomRule",
        "detectPromptInjection",
        "experimental_moderateContent",
        "fixedWindow",
        "launchArcjet",
        "launchArcjetWithTransport",
        "localDetectSensitiveInfo",
        "slidingWindow",
        "tokenBucket",
      ]),
    );
  });

test('`@arcjet/guard`: should expose the value exports of "./bun"', async function () {
    const module = await import("@arcjet/guard/bun");

    assert.deepEqual(
      new Set(Object.keys(module)),
      new Set([
        "_launchWithTransportFactory",
        "createTransport",
        "defineCustomRule",
        "detectPromptInjection",
        "experimental_moderateContent",
        "fixedWindow",
        "launchArcjet",
        "launchArcjetWithTransport",
        "localDetectSensitiveInfo",
        "slidingWindow",
        "tokenBucket",
      ]),
    );
  });

test('`@arcjet/guard`: should expose the value exports of "./fetch"', async function () {
    const module = await import("@arcjet/guard/fetch");

    assert.deepEqual(
      new Set(Object.keys(module)),
      new Set([
        "_launchWithTransportFactory",
        "createTransport",
        "defineCustomRule",
        "detectPromptInjection",
        "experimental_moderateContent",
        "fixedWindow",
        "launchArcjet",
        "launchArcjetWithTransport",
        "localDetectSensitiveInfo",
        "slidingWindow",
        "tokenBucket",
      ]),
    );
  });

test('`@arcjet/guard`: should expose the value exports of "./vercel-ai/v7"', async function () {
    const module = await import("@arcjet/guard/vercel-ai/v7");

    assert.deepEqual(
      new Set(Object.keys(module)),
      new Set([
        "ArcjetDeniedError",
        "ArcjetGuardUnavailableError",
        "aiToolsContext",
        "captureAction",
        "createAgentContext",
        "guardAction",
        "guardTool",
        "securityMetadata",
      ]),
    );
  });

test('`@arcjet/guard`: should expose "./node" as an alias of "."', async function () {
    // The same module, not a copy of it: one set of module state behind both
    // entrypoints, so `instanceof` holds across them.
    assert.equal(
      await import("@arcjet/guard/node"),
      await import("@arcjet/guard"),
    );
  });

