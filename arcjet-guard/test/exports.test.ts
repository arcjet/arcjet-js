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

test('`@arcjet/guard`: should expose exactly the api surface of "."', async function () {
    const [declaration, documented] = await Promise.all([
      readFile(new URL("../dist/node.d.ts", import.meta.url), "utf8"),
      readFile(new URL("./api-surface/index.ts", import.meta.url), "utf8"),
    ]);

    // Nothing implicit: an `export *` would publish whatever the module it
    // points at happens to export, and the comparison below could not see it.
    assert.doesNotMatch(declaration, /^export \*/m);
    assert.deepEqual(exportedNames(declaration), exportedNames(documented));
  });

test('`@arcjet/guard`: should publish every value of "." as a value', async function () {
    const module = await import("@arcjet/guard");
    const declaration = await readFile(new URL("../dist/node.d.ts", import.meta.url), "utf8");

    // A name the declarations mark `type` is erased before it reaches a
    // consumer, so they cannot call it, subclass it, or use `instanceof` on it
    // -- however plainly it is there at run time.
    assert.deepEqual(
      typeOnlyNames(declaration).filter((name) => name in module),
      [],
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

test('`@arcjet/guard`: should expose exactly the api surface of "./bun"', async function () {
    const [declaration, documented] = await Promise.all([
      readFile(new URL("../dist/bun.d.ts", import.meta.url), "utf8"),
      readFile(new URL("./api-surface/bun.ts", import.meta.url), "utf8"),
    ]);

    // Nothing implicit: an `export *` would publish whatever the module it
    // points at happens to export, and the comparison below could not see it.
    assert.doesNotMatch(declaration, /^export \*/m);
    assert.deepEqual(exportedNames(declaration), exportedNames(documented));
  });

test('`@arcjet/guard`: should publish every value of "./bun" as a value', async function () {
    const module = await import("@arcjet/guard/bun");
    const declaration = await readFile(new URL("../dist/bun.d.ts", import.meta.url), "utf8");

    // A name the declarations mark `type` is erased before it reaches a
    // consumer, so they cannot call it, subclass it, or use `instanceof` on it
    // -- however plainly it is there at run time.
    assert.deepEqual(
      typeOnlyNames(declaration).filter((name) => name in module),
      [],
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

test('`@arcjet/guard`: should expose exactly the api surface of "./fetch"', async function () {
    const [declaration, documented] = await Promise.all([
      readFile(new URL("../dist/fetch.d.ts", import.meta.url), "utf8"),
      readFile(new URL("./api-surface/fetch.ts", import.meta.url), "utf8"),
    ]);

    // Nothing implicit: an `export *` would publish whatever the module it
    // points at happens to export, and the comparison below could not see it.
    assert.doesNotMatch(declaration, /^export \*/m);
    assert.deepEqual(exportedNames(declaration), exportedNames(documented));
  });

test('`@arcjet/guard`: should publish every value of "./fetch" as a value', async function () {
    const module = await import("@arcjet/guard/fetch");
    const declaration = await readFile(new URL("../dist/fetch.d.ts", import.meta.url), "utf8");

    // A name the declarations mark `type` is erased before it reaches a
    // consumer, so they cannot call it, subclass it, or use `instanceof` on it
    // -- however plainly it is there at run time.
    assert.deepEqual(
      typeOnlyNames(declaration).filter((name) => name in module),
      [],
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
