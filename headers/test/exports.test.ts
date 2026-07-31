import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("`@arcjet/headers` public API", async function (t) {
  await t.test("should expose the documented export paths", async function () {
    const manifest: unknown = JSON.parse(
      await readFile(new URL("../package.json", import.meta.url), "utf8"),
    );
    assert.ok(manifest !== null && typeof manifest === "object" && "exports" in manifest);
    const exportMap = manifest.exports;
    assert.ok(exportMap !== null && typeof exportMap === "object");

    assert.deepEqual(new Set(Object.keys(exportMap)), new Set([".", "./package.json"]));
  });

  await t.test('should expose the value exports of "."', async function () {
    const module = await import("@arcjet/headers");

    assert.deepEqual(new Set(Object.keys(module)), new Set(["ArcjetHeaders", "default"]));
  });

  await t.test('should expose exactly the api surface of "."', async function () {
    const [declaration, documented] = await Promise.all([
      readFile(new URL("../dist/index.d.ts", import.meta.url), "utf8"),
      readFile(new URL("./api-surface/index.ts", import.meta.url), "utf8"),
    ]);

    // Nothing implicit: an `export *` would publish whatever the module it
    // points at happens to export, and the comparison below could not see it.
    assert.doesNotMatch(declaration, /^export \*/m);
    assert.deepEqual(exportedNames(declaration), exportedNames(documented));
  });

  await t.test('should publish every value of "." as a value', async function () {
    const module = await import("@arcjet/headers");
    const declaration = await readFile(new URL("../dist/index.d.ts", import.meta.url), "utf8");

    // A name the declarations mark `type` is erased before it reaches a
    // consumer, so they cannot call it, subclass it, or use `instanceof` on it
    // -- however plainly it is there at run time.
    assert.deepEqual(
      typeOnlyNames(declaration).filter((name) => name in module),
      [],
    );
  });
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
