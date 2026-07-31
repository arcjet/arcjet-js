import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("`@arcjet/fastify`: should expose the documented export paths", async function () {
  const manifest: unknown = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  assert.ok(manifest !== null && typeof manifest === "object" && "exports" in manifest);
  const exportMap = manifest.exports;
  assert.ok(exportMap !== null && typeof exportMap === "object");

  assert.deepEqual(new Set(Object.keys(exportMap)), new Set([".", "./package.json"]));
});

test('`@arcjet/fastify`: should expose the value exports of "."', async function () {
  const module = await import("@arcjet/fastify");

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

test('`@arcjet/fastify`: should publish every value of "." as a value', async function () {
  const module = await import("@arcjet/fastify");
  const declaration = await readFile(new URL("../dist/index.d.ts", import.meta.url), "utf8");

  // A name the declarations mark `type` is erased before it reaches a
  // consumer, so they cannot call it, subclass it, or use `instanceof` on it
  // -- however plainly it is there at run time.
  assert.deepEqual(
    typeOnlyNames(declaration).filter((name) => name in module),
    [],
  );
});

/** Every name an `export { … }` clause marks as type-only. */
function typeOnlyNames(source: string): string[] {
  return names(source)
    .filter((one) => one.typeOnly)
    .map((one) => one.name);
}

function names(source: string): Array<{ name: string; typeOnly: boolean }> {
  return [...source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)].flatMap(function (match) {
    const clauseIsTypeOnly = match[1] !== undefined;

    return (match[2] ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part !== "")
      .map(function (part) {
        const inline = part.startsWith("type ");
        const renamed = part.replace(/^type\s+/, "").split(/\s+as\s+/);

        return { name: renamed.at(-1) ?? part, typeOnly: clauseIsTypeOnly || inline };
      });
  });
}
