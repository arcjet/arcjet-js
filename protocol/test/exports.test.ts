import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("`@arcjet/protocol`: should expose the documented export paths", async function () {
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
      "./client",
      "./client.js",
      "./convert",
      "./convert.js",
      "./package.json",
      "./proto/*",
      "./typeid",
      "./typeid.js",
      "./well-known-bots",
      "./well-known-bots.js",
    ]),
  );
});

test('`@arcjet/protocol`: should expose the value exports of "."', async function () {
  const module = await import("@arcjet/protocol");

  assert.deepEqual(
    new Set(Object.keys(module)),
    new Set([
      "ArcjetAllowDecision",
      "ArcjetBotReason",
      "ArcjetChallengeDecision",
      "ArcjetDecision",
      "ArcjetDenyDecision",
      "ArcjetEdgeRuleReason",
      "ArcjetEmailReason",
      "ArcjetErrorDecision",
      "ArcjetErrorReason",
      "ArcjetFilterReason",
      "ArcjetIpDetails",
      "ArcjetPromptInjectionReason",
      "ArcjetRateLimitReason",
      "ArcjetReason",
      "ArcjetRuleResult",
      "ArcjetSensitiveInfoReason",
      "ArcjetShieldReason",
      "botCategories",
    ]),
  );
});

test('`@arcjet/protocol`: should expose the value exports of "./client"', async function () {
  const module = await import("@arcjet/protocol/client");

  assert.deepEqual(new Set(Object.keys(module)), new Set(["createClient", "decideTimeout"]));
});

test('`@arcjet/protocol`: should expose the value exports of "./convert"', async function () {
  const module = await import("@arcjet/protocol/convert");

  assert.deepEqual(
    new Set(Object.keys(module)),
    new Set([
      "ArcjetConclusionFromProtocol",
      "ArcjetConclusionToProtocol",
      "ArcjetDecisionFromProtocol",
      "ArcjetDecisionToProtocol",
      "ArcjetEmailTypeFromProtocol",
      "ArcjetEmailTypeToProtocol",
      "ArcjetIpDetailsFromProtocol",
      "ArcjetModeToProtocol",
      "ArcjetReasonFromProtocol",
      "ArcjetReasonToProtocol",
      "ArcjetRuleResultFromProtocol",
      "ArcjetRuleResultToProtocol",
      "ArcjetRuleStateFromProtocol",
      "ArcjetRuleStateToProtocol",
      "ArcjetRuleToProtocol",
      "ArcjetStackToProtocol",
    ]),
  );
});

test('`@arcjet/protocol`: should expose the value exports of "./well-known-bots"', async function () {
  const module = await import("@arcjet/protocol/well-known-bots");

  assert.deepEqual(new Set(Object.keys(module)), new Set(["categories"]));
});

test('`@arcjet/protocol`: should expose the value exports of "./typeid"', async function () {
  const module = await import("@arcjet/protocol/typeid");

  assert.deepEqual(
    new Set(Object.keys(module)),
    new Set(["CROCKFORD_ALPHABET", "typeid", "uuidV7Bytes"]),
  );
});

test('`@arcjet/protocol`: should expose "./client.js" as an alias of "./client"', async function () {
  // The same module, not a copy of it: one set of module state behind both
  // entrypoints, so `instanceof` holds across them.
  assert.equal(await import("@arcjet/protocol/client.js"), await import("@arcjet/protocol/client"));
});

test('`@arcjet/protocol`: should expose "./convert.js" as an alias of "./convert"', async function () {
  // The same module, not a copy of it: one set of module state behind both
  // entrypoints, so `instanceof` holds across them.
  assert.equal(
    await import("@arcjet/protocol/convert.js"),
    await import("@arcjet/protocol/convert"),
  );
});

test('`@arcjet/protocol`: should expose "./well-known-bots.js" as an alias of "./well-known-bots"', async function () {
  // The same module, not a copy of it: one set of module state behind both
  // entrypoints, so `instanceof` holds across them.
  assert.equal(
    await import("@arcjet/protocol/well-known-bots.js"),
    await import("@arcjet/protocol/well-known-bots"),
  );
});

test('`@arcjet/protocol`: should expose "./typeid.js" as an alias of "./typeid"', async function () {
  // The same module, not a copy of it: one set of module state behind both
  // entrypoints, so `instanceof` holds across them.
  assert.equal(await import("@arcjet/protocol/typeid.js"), await import("@arcjet/protocol/typeid"));
});
