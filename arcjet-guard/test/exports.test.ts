import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
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

test('`@arcjet/guard`: should expose exactly the api surface of "."', async function () {
    const [declaration, documented] = await Promise.all([
      readFile(new URL("../dist/exports/node.d.ts", import.meta.url), "utf8"),
      readFile(new URL("./api-surface/index.ts", import.meta.url), "utf8"),
    ]);

    // Nothing implicit: an `export *` would publish whatever the module it
    // points at happens to export, and the comparison below could not see it.
    assert.doesNotMatch(declaration, /^export \*/m);
    assert.deepEqual(exportedNames(declaration), exportedNames(documented));
  });

test('`@arcjet/guard`: should publish every value of "." as a value', async function () {
    const module = await import("@arcjet/guard");
    const declaration = await readFile(new URL("../dist/exports/node.d.ts", import.meta.url), "utf8");

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
      readFile(new URL("../dist/exports/bun.d.ts", import.meta.url), "utf8"),
      readFile(new URL("./api-surface/bun.ts", import.meta.url), "utf8"),
    ]);

    // Nothing implicit: an `export *` would publish whatever the module it
    // points at happens to export, and the comparison below could not see it.
    assert.doesNotMatch(declaration, /^export \*/m);
    assert.deepEqual(exportedNames(declaration), exportedNames(documented));
  });

test('`@arcjet/guard`: should publish every value of "./bun" as a value', async function () {
    const module = await import("@arcjet/guard/bun");
    const declaration = await readFile(new URL("../dist/exports/bun.d.ts", import.meta.url), "utf8");

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
      readFile(new URL("../dist/exports/fetch.d.ts", import.meta.url), "utf8"),
      readFile(new URL("./api-surface/fetch.ts", import.meta.url), "utf8"),
    ]);

    // Nothing implicit: an `export *` would publish whatever the module it
    // points at happens to export, and the comparison below could not see it.
    assert.doesNotMatch(declaration, /^export \*/m);
    assert.deepEqual(exportedNames(declaration), exportedNames(documented));
  });

test('`@arcjet/guard`: should publish every value of "./fetch" as a value', async function () {
    const module = await import("@arcjet/guard/fetch");
    const declaration = await readFile(new URL("../dist/exports/fetch.d.ts", import.meta.url), "utf8");

    // A name the declarations mark `type` is erased before it reaches a
    // consumer, so they cannot call it, subclass it, or use `instanceof` on it
    // -- however plainly it is there at run time.
    assert.deepEqual(
      typeOnlyNames(declaration).filter((name) => name in module),
      [],
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

test('`@arcjet/guard`: should expose exactly the api surface of "./vercel-ai/v7"', async function () {
    const [declaration, documented] = await Promise.all([
      readFile(new URL("../dist/exports/vercel-ai/v7/index.d.ts", import.meta.url), "utf8"),
      readFile(new URL("./api-surface/vercel-ai-v7.ts", import.meta.url), "utf8"),
    ]);

    // Nothing implicit: an `export *` would publish whatever the module it
    // points at happens to export, and the comparison below could not see it.
    assert.doesNotMatch(declaration, /^export \*/m);
    assert.deepEqual(exportedNames(declaration), exportedNames(documented));
  });

test('`@arcjet/guard`: should publish every value of "./vercel-ai/v7" as a value', async function () {
    const module = await import("@arcjet/guard/vercel-ai/v7");
    const declaration = await readFile(new URL("../dist/exports/vercel-ai/v7/index.d.ts", import.meta.url), "utf8");

    // A name the declarations mark `type` is erased before it reaches a
    // consumer, so they cannot call it, subclass it, or use `instanceof` on it
    // -- however plainly it is there at run time.
    assert.deepEqual(
      typeOnlyNames(declaration).filter((name) => name in module),
      [],
    );
  });

test("`@arcjet/guard`: should not republish another package's internals", async function () {
    const directory = new URL("../src/exports/", import.meta.url);
    const files = await readdir(directory, { recursive: true });

    for (const file of files.filter((name) => name.endsWith(".ts"))) {
      const source = await readFile(new URL(file, directory), "utf8");

      // An `/internal` entrypoint carries no compatibility guarantee, so
      // nothing a consumer can reach may be built out of one. See
      // `docs/PUBLIC_API.md`.
      assert.doesNotMatch(source, /from "(?!\.)[^"]*\/internal(?:\/[^"]*)?"/);
    }
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
