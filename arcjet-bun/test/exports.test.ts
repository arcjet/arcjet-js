import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

// Bun provides the `bun` module, so Node needs it stubbed to import
// the built module at all. These tests also run under Bun itself,
// where the module is real and there are no loader hooks to register.
if (!("Bun" in globalThis)) {
  const { register } = await import("node:module");

  register(new URL("./_shared/runtime-stub-hooks.mts", import.meta.url));
}

test("`@arcjet/bun`: should expose the documented export paths", async function () {
  const manifest: unknown = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.ok(manifest !== null && typeof manifest === "object" && "exports" in manifest);
  const exportMap = manifest.exports;
  assert.ok(exportMap !== null && typeof exportMap === "object");

  assert.deepEqual(new Set(Object.keys(exportMap)), new Set([".", "./package.json"]));
});

test('`@arcjet/bun`: should expose the value exports of "."', async function () {
  const module = await import("@arcjet/bun");

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
      "cloudflare",
      "createRemoteClient",
      "default",
      "detectBot",
      "detectPromptInjection",
      "experimental_detectPromptInjection",
      "filter",
      "fixedWindow",
      "protectSignup",
      "sensitiveInfo",
      "shield",
      "slidingWindow",
      "tokenBucket",
      "validateEmail",
    ]),
  );
});
