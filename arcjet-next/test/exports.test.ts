import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("`@arcjet/next`: should expose the documented export paths", async function () {
  const manifest: unknown = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.ok(manifest !== null && typeof manifest === "object" && "exports" in manifest);
  const exportMap = manifest.exports;
  assert.ok(exportMap !== null && typeof exportMap === "object");

  assert.deepEqual(new Set(Object.keys(exportMap)), new Set([".", "./package.json"]));
});

test('`@arcjet/next`: should expose the value exports of "."', async function () {
  const module = await import("@arcjet/next");

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
      "createMiddleware",
      "createRemoteClient",
      "default",
      "detectBot",
      "detectPromptInjection",
      "experimental_detectPromptInjection",
      "filter",
      "fixedWindow",
      "protectSignup",
      "request",
      "sensitiveInfo",
      "shield",
      "slidingWindow",
      "tokenBucket",
      "validateEmail",
      "withArcjet",
    ]),
  );
});
