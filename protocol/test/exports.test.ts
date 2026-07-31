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

test('`@arcjet/protocol`: should expose exactly the api surface of "."', async function () {
  const [declaration, documented] = await Promise.all([
    readFile(new URL("../dist/index.d.ts", import.meta.url), "utf8"),
    readFile(new URL("./api-surface/index.ts", import.meta.url), "utf8"),
  ]);

  // Nothing implicit: an `export *` would publish whatever the module it
  // points at happens to export, and the comparison below could not see it.
  assert.doesNotMatch(declaration, /^export \*/m);
  assert.deepEqual(exportedNames(declaration), exportedNames(documented));
});

test('`@arcjet/protocol`: should publish every value of "." as a value', async function () {
  const module = await import("@arcjet/protocol");
  const declaration = await readFile(new URL("../dist/index.d.ts", import.meta.url), "utf8");

  // A name the declarations mark `type` is erased before it reaches a
  // consumer, so they cannot call it, subclass it, or use `instanceof` on it
  // -- however plainly it is there at run time.
  assert.deepEqual(
    typeOnlyNames(declaration).filter((name) => name in module),
    [],
  );
});

test('`@arcjet/protocol`: should expose the value exports of "./client"', async function () {
  const module = await import("@arcjet/protocol/client");

  assert.deepEqual(new Set(Object.keys(module)), new Set(["createClient", "decideTimeout"]));
});

test('`@arcjet/protocol`: should expose exactly the api surface of "./client"', async function () {
  const [declaration, documented] = await Promise.all([
    readFile(new URL("../dist/client.d.ts", import.meta.url), "utf8"),
    readFile(new URL("./api-surface/client.ts", import.meta.url), "utf8"),
  ]);

  // Nothing implicit: an `export *` would publish whatever the module it
  // points at happens to export, and the comparison below could not see it.
  assert.doesNotMatch(declaration, /^export \*/m);
  assert.deepEqual(exportedNames(declaration), exportedNames(documented));
});

test('`@arcjet/protocol`: should publish every value of "./client" as a value', async function () {
  const module = await import("@arcjet/protocol/client");
  const declaration = await readFile(new URL("../dist/client.d.ts", import.meta.url), "utf8");

  // A name the declarations mark `type` is erased before it reaches a
  // consumer, so they cannot call it, subclass it, or use `instanceof` on it
  // -- however plainly it is there at run time.
  assert.deepEqual(
    typeOnlyNames(declaration).filter((name) => name in module),
    [],
  );
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

test('`@arcjet/protocol`: should expose exactly the api surface of "./convert"', async function () {
  const [declaration, documented] = await Promise.all([
    readFile(new URL("../dist/convert.d.ts", import.meta.url), "utf8"),
    readFile(new URL("./api-surface/convert.ts", import.meta.url), "utf8"),
  ]);

  // Nothing implicit: an `export *` would publish whatever the module it
  // points at happens to export, and the comparison below could not see it.
  assert.doesNotMatch(declaration, /^export \*/m);
  assert.deepEqual(exportedNames(declaration), exportedNames(documented));
});

test('`@arcjet/protocol`: should publish every value of "./convert" as a value', async function () {
  const module = await import("@arcjet/protocol/convert");
  const declaration = await readFile(new URL("../dist/convert.d.ts", import.meta.url), "utf8");

  // A name the declarations mark `type` is erased before it reaches a
  // consumer, so they cannot call it, subclass it, or use `instanceof` on it
  // -- however plainly it is there at run time.
  assert.deepEqual(
    typeOnlyNames(declaration).filter((name) => name in module),
    [],
  );
});

test('`@arcjet/protocol`: should expose the value exports of "./well-known-bots"', async function () {
  const module = await import("@arcjet/protocol/well-known-bots");

  assert.deepEqual(new Set(Object.keys(module)), new Set(["categories"]));
});

test('`@arcjet/protocol`: should expose exactly the api surface of "./well-known-bots"', async function () {
  const [declaration, documented] = await Promise.all([
    readFile(new URL("../dist/well-known-bots.d.ts", import.meta.url), "utf8"),
    readFile(new URL("./api-surface/well-known-bots.ts", import.meta.url), "utf8"),
  ]);

  // Nothing implicit: an `export *` would publish whatever the module it
  // points at happens to export, and the comparison below could not see it.
  assert.doesNotMatch(declaration, /^export \*/m);
  assert.deepEqual(exportedNames(declaration), exportedNames(documented));
});

test('`@arcjet/protocol`: should publish every value of "./well-known-bots" as a value', async function () {
  const module = await import("@arcjet/protocol/well-known-bots");
  const declaration = await readFile(
    new URL("../dist/well-known-bots.d.ts", import.meta.url),
    "utf8",
  );

  // A name the declarations mark `type` is erased before it reaches a
  // consumer, so they cannot call it, subclass it, or use `instanceof` on it
  // -- however plainly it is there at run time.
  assert.deepEqual(
    typeOnlyNames(declaration).filter((name) => name in module),
    [],
  );
});

test('`@arcjet/protocol`: should expose the value exports of "./typeid"', async function () {
  const module = await import("@arcjet/protocol/typeid");

  assert.deepEqual(
    new Set(Object.keys(module)),
    new Set(["CROCKFORD_ALPHABET", "typeid", "uuidV7Bytes"]),
  );
});

test('`@arcjet/protocol`: should expose exactly the api surface of "./typeid"', async function () {
  const [declaration, documented] = await Promise.all([
    readFile(new URL("../dist/typeid.d.ts", import.meta.url), "utf8"),
    readFile(new URL("./api-surface/typeid.ts", import.meta.url), "utf8"),
  ]);

  // Nothing implicit: an `export *` would publish whatever the module it
  // points at happens to export, and the comparison below could not see it.
  assert.doesNotMatch(declaration, /^export \*/m);
  assert.deepEqual(exportedNames(declaration), exportedNames(documented));
});

test('`@arcjet/protocol`: should publish every value of "./typeid" as a value', async function () {
  const module = await import("@arcjet/protocol/typeid");
  const declaration = await readFile(new URL("../dist/typeid.d.ts", import.meta.url), "utf8");

  // A name the declarations mark `type` is erased before it reaches a
  // consumer, so they cannot call it, subclass it, or use `instanceof` on it
  // -- however plainly it is there at run time.
  assert.deepEqual(
    typeOnlyNames(declaration).filter((name) => name in module),
    [],
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

/**
 * Every name an `export { … }` clause declares.
 *
 * Kind is deliberately not compared: a `.d.ts` exports an interface and a
 * function through the same clause, so it cannot say which is which. The
 * sibling `api-surface/` files say, and `tsc` checks them.
 */
function exportedNames(source: string): Set<string> {
  return new Set(
    names(source)
      .map((one) => one.name)
      // `default` is covered by the value exports above, and the documented
      // list does not name it.
      .filter((name) => name !== "default"),
  );
}

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
