import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  type ArcjetMetadata,
  MAX_METADATA_BYTES,
  METADATA_ENCODE_FAILED_CODE,
  encodeMetadata,
  enforceMetadataBudget,
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

  test("drop non-finite numbers, nested or not", () => {
    // `JSON.stringify` would turn these into `null`, silently changing the value.
    // Dropping matches arcjet-py, whose `json.dumps(allow_nan=False)` raises.
    const { metadataJson, localWarnings } = encodeMetadata({
      nan: Number.NaN,
      deep: { inner: Number.POSITIVE_INFINITY },
      ok: 1,
    });
    assert.deepEqual(metadataJson, { ok: "1" });
    assert.equal(localWarnings.length, 1);
    assert.match(localWarnings[0].message, /2 key\(s\)/);
  });

  test("not let quotes or backslashes forge extra keys", () => {
    // The key list wraps each name in double quotes, so a key containing one
    // could otherwise look like several keys.
    const { localWarnings } = encodeMetadata({ 'ev"il", "other': undefined });
    assert.match(localWarnings[0].message, /1 key\(s\)/);
    // Only the two quotes the formatter itself added remain.
    assert.equal(localWarnings[0].message.split('"').length - 1, 2);
    assert.match(localWarnings[0].message, /ev\\x22il\\x22, \\x22other/);

    const backslash = encodeMetadata({ "back\\slash": undefined });
    assert.match(backslash.localWarnings[0].message, /back\\x5cslash/);
  });

  test("escape separators and C1 controls, not plain non-ASCII", () => {
    const { localWarnings } = encodeMetadata({
      "a\u2028b\u0085c\u00FCd": undefined,
    });
    assert.match(localWarnings[0].message, /"a\\u2028b\\x85c\u00FCd"/);
  });

  test("keep an own `__proto__` key instead of losing it", () => {
    // Plain assignment routes `__proto__` to the inherited setter, dropping the
    // key with no warning; the server never gets the chance to reject it.
    // `JSON.parse` is the realistic way an own `__proto__` key appears.
    // oxlint-disable-next-line typescript/no-unsafe-assignment -- JSON.parse returns any
    const parsed: ArcjetMetadata = JSON.parse('{"__proto__": 1, "ok": 2}');
    const { metadataJson, localWarnings } = encodeMetadata(parsed);
    // Own-property order is insertion order, so no sorting needed.
    assert.deepEqual(Object.getOwnPropertyNames(metadataJson), ["__proto__", "ok"]);
    assert.equal(Object.getOwnPropertyDescriptor(metadataJson, "__proto__")?.value, "1");
    assert.deepEqual(localWarnings, []);
  });

  test("not throw when `getPrototypeOf` throws", () => {
    const proxy = new Proxy(
      {},
      {
        getPrototypeOf(): never {
          throw new Error("nope");
        },
      },
    );
    assert.deepEqual(encodeMetadata(proxy), { metadataJson: {}, localWarnings: [] });
  });

  test("drop lone surrogates, nested or in a key", () => {
    // Not encodable as UTF-8; arcjet-py's protobuf raises on them.
    const cases: ArcjetMetadata[] = [
      { bad: "\uD800", ok: 1 },
      { bad: { nested: "\uDFFF" }, ok: 1 },
      { "\uD800key": 1, ok: 1 },
    ];
    for (const value of cases) {
      const { metadataJson, localWarnings } = encodeMetadata(value);
      assert.deepEqual(metadataJson, { ok: "1" });
      assert.equal(localWarnings.length, 1);
    }
    // A valid surrogate pair is fine.
    assert.deepEqual(encodeMetadata({ emoji: "\u{1F600}" }).metadataJson, {
      emoji: '"\u{1F600}"',
    });
  });

  test("never split a surrogate pair when truncating a key", () => {
    const key = `${"a".repeat(63)}\u{1F600}`;
    const { localWarnings } = encodeMetadata({ [key]: undefined });
    assert.ok(!loneSurrogatePattern.test(localWarnings[0].message));
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

describe("enforceMetadataBudget", () => {
  test("not trim anything that fits", () => {
    const map = { a: '"x"', b: '"y"' };
    assert.deepEqual(enforceMetadataBudget([map]), []);
    assert.deepEqual(map, { a: '"x"', b: '"y"' });
  });

  test("sit above what the server would accept", () => {
    // The SDK ceiling is a protocol backstop, not a copy of server policy: the
    // server can accept ~512 KiB in one map, so the SDK must not trim that.
    assert.ok(MAX_METADATA_BYTES > 128 * 4096);
    assert.ok(MAX_METADATA_BYTES < 1024 * 1024);
  });

  test("trim across every map, in order, with one warning", () => {
    const envelope: Record<string, string> = { big: "x".repeat(500_000), keep: "1" };
    const rule: Record<string, string> = { alsoBig: "y".repeat(500_000), tail: "2" };
    const warnings = enforceMetadataBudget([envelope, rule]);

    // The envelope is served first; the rule map is starved.
    assert.deepEqual(Object.keys(envelope), ["big", "keep"]);
    assert.deepEqual(Object.keys(rule), []);
    assert.equal(warnings.length, 1);
    assert.match(warnings[0].message, /2 key\(s\)/);
    assert.match(warnings[0].message, /request metadata budget/);
    assert.equal(warnings[0].code, METADATA_ENCODE_FAILED_CODE);
  });

  test("drop a single value larger than the whole budget", () => {
    const map: Record<string, string> = { huge: "x".repeat(MAX_METADATA_BYTES + 1) };
    const warnings = enforceMetadataBudget([map]);
    assert.deepEqual(map, {});
    assert.equal(warnings.length, 1);
  });
});

/** Local copy: the encoder keeps its matcher private. */
const loneSurrogatePattern = /\p{Surrogate}/u;
