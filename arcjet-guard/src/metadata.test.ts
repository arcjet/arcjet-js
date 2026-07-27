import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  type ArcjetMetadata,
  METADATA_ENCODE_FAILED_CODE,
  encodeMetadata,
} from "./metadata.ts";

describe("encodeMetadata", () => {
  test("return empty fields for missing metadata", () => {
    const none: ArcjetMetadata | undefined = undefined;
    assert.deepEqual(encodeMetadata(none), { metadataJson: {}, localWarnings: [] });
    assert.deepEqual(encodeMetadata({}), { metadataJson: {}, localWarnings: [] });
  });

  test("ignore metadata that is not a plain object", () => {
    // Arrays would encode as numeric string keys, and exotic objects have no own
    // enumerable entries, so both would silently send nothing.
    const notPlainObjects: unknown[] = [[1, 2], new Map([["a", 1]]), new Date(), "nope", 7];
    for (const value of notPlainObjects) {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- testing runtime behavior on wrong types
      assert.deepEqual(encodeMetadata(value as ArcjetMetadata), {
        metadataJson: {},
        localWarnings: [],
      });
    }
  });

  test("not throw when reading the object throws", () => {
    // A getter or proxy trap runs during iteration, before any JSON.stringify.
    const withGetter = {
      get boom(): never {
        throw new Error("nope");
      },
    };
    assert.deepEqual(encodeMetadata(withGetter), { metadataJson: {}, localWarnings: [] });

    const proxy = new Proxy(
      {},
      {
        ownKeys(): never {
          throw new Error("nope");
        },
      },
    );
    assert.deepEqual(encodeMetadata(proxy), { metadataJson: {}, localWarnings: [] });
  });

  test("JSON-encode string values", () => {
    // Values are JSON, so a string arrives quoted — this is what makes
    // `metadata['env'] = '"staging"'` the ClickHouse query form.
    const { metadataJson, localWarnings } = encodeMetadata({ env: "staging" });
    assert.deepEqual(metadataJson, { env: '"staging"' });
    assert.deepEqual(localWarnings, []);
  });

  test("keep each scalar's JSON type", () => {
    const { metadataJson } = encodeMetadata({
      durationMs: 160,
      score: 0.5,
      success: true,
      missing: null,
    });
    assert.deepEqual(metadataJson, {
      durationMs: "160",
      score: "0.5",
      success: "true",
      missing: "null",
    });
  });

  test("encode nested values per top-level key", () => {
    const { metadataJson, localWarnings } = encodeMetadata({
      user: { id: "u_1", roles: ["admin", "ops"] },
      toolName: "Bash",
    });
    assert.deepEqual(localWarnings, []);
    assert.deepEqual(metadataJson, {
      user: '{"id":"u_1","roles":["admin","ops"]}',
      toolName: '"Bash"',
    });
  });

  test("drop `undefined` with a warning", () => {
    // `JSON.stringify(undefined)` returns `undefined`, not a string.
    const { metadataJson, localWarnings } = encodeMetadata({ ok: 1, missing: undefined });
    assert.deepEqual(metadataJson, { ok: "1" });
    assert.equal(localWarnings.length, 1);
    assert.equal(localWarnings[0].code, METADATA_ENCODE_FAILED_CODE);
    assert.match(localWarnings[0].message, /1 key\(s\) could not be JSON-encoded/);
    assert.match(localWarnings[0].message, /"missing"/);
  });

  test("report every dropped key in a single warning", () => {
    // One encode call must never flood the warning channel, which the server
    // bounds and persists.
    const { metadataJson, localWarnings } = encodeMetadata({
      fn() {},
      sym: Symbol("s"),
      big: 1n,
      ok: "yes",
    });
    assert.deepEqual(metadataJson, { ok: '"yes"' });
    assert.equal(localWarnings.length, 1);
    assert.match(localWarnings[0].message, /3 key\(s\)/);
  });

  test("elide the key list once it gets long", () => {
    const many: ArcjetMetadata = {};
    for (let index = 0; index < 15; index++) {
      many[`k${index}`] = undefined;
    }
    const { localWarnings } = encodeMetadata(many);
    assert.equal(localWarnings.length, 1);
    assert.match(localWarnings[0].message, /15 key\(s\)/);
    assert.ok(localWarnings[0].message.endsWith('"k9", ...'));
  });

  test("drop a circular reference with a warning", () => {
    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    const { metadataJson, localWarnings } = encodeMetadata({ loop: cycle });
    assert.deepEqual(metadataJson, {});
    assert.equal(localWarnings.length, 1);
  });

  test("escape control characters in dropped key names", () => {
    // Keys are user-controlled and warnings reach logs and server storage, so a
    // newline must not be able to forge a log entry.
    const { localWarnings } = encodeMetadata({ "ev\nil INFO forged": undefined });
    assert.ok(!localWarnings[0].message.includes("\n"));
    assert.match(localWarnings[0].message, /ev\\x0ail INFO forged/);
  });

  test("truncate long dropped key names", () => {
    const { localWarnings } = encodeMetadata({ ["x".repeat(200)]: undefined });
    assert.ok(localWarnings[0].message.length < 160);
  });

  test("never put a value in a warning message", () => {
    // Warnings are persisted server-side and are a potential PII sink, so they
    // must reference only the key name.
    const { localWarnings } = encodeMetadata({ secret: () => "hunter2" });
    assert.ok(!localWarnings[0].message.includes("hunter2"));
  });

  test("prefix the warning message with the given source", () => {
    const { localWarnings } = encodeMetadata({ bad: undefined }, "rules[2].");
    assert.match(localWarnings[0].message, /^rules\[2\]\.metadata: /);
  });

  test("leave the server's limits to the server", () => {
    // Size, depth, and count caps are server-enforced (and per-account
    // configurable), so the SDK must not silently pre-truncate.
    let deep: Record<string, unknown> = { leaf: 1 };
    for (let index = 0; index < 30; index++) {
      deep = { nested: deep };
    }
    const wide: ArcjetMetadata = {};
    for (let index = 0; index < 200; index++) {
      wide[`k${index}`] = index;
    }
    const { metadataJson, localWarnings } = encodeMetadata({
      ...wide,
      deep,
      big: "x".repeat(8192),
    });
    assert.equal(Object.keys(metadataJson).length, 202);
    assert.deepEqual(localWarnings, []);
  });
});
