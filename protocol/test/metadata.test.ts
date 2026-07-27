import assert from "node:assert/strict";
import test from "node:test";

import { METADATA_ENCODE_FAILED_CODE, encodeMetadata } from "../dist/metadata.js";

test("@arcjet/protocol metadata", async function (t) {
  await t.test("should return empty fields for missing metadata", function () {
    assert.deepEqual(encodeMetadata(undefined), { metadataJson: {}, localWarnings: [] });
    assert.deepEqual(encodeMetadata({}), { metadataJson: {}, localWarnings: [] });
  });

  await t.test("should JSON-encode string values", function () {
    // Values are JSON, so a string arrives quoted — this is what makes
    // `metadata['env'] = '"staging"'` the ClickHouse query form.
    const { metadataJson, localWarnings } = encodeMetadata({ env: "staging" });
    assert.deepEqual(metadataJson, { env: '"staging"' });
    assert.deepEqual(localWarnings, []);
  });

  await t.test("should keep each scalar's JSON type", function () {
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

  await t.test("should encode nested values per top-level key", function () {
    const { metadataJson, localWarnings } = encodeMetadata({
      user: { id: "u_1", roles: ["admin", "ops"] },
      toolName: "Bash",
    });
    assert.deepEqual(localWarnings, []);
    assert.deepEqual(Object.keys(metadataJson).sort(), ["toolName", "user"]);
    assert.deepEqual(JSON.parse(metadataJson["user"]!), {
      id: "u_1",
      roles: ["admin", "ops"],
    });
  });

  await t.test("should drop `undefined` with a warning", function () {
    // `JSON.stringify(undefined)` returns `undefined`, not a string.
    const { metadataJson, localWarnings } = encodeMetadata({ ok: 1, missing: undefined });
    assert.deepEqual(metadataJson, { ok: "1" });
    assert.equal(localWarnings.length, 1);
    assert.equal(localWarnings[0]!.code, METADATA_ENCODE_FAILED_CODE);
    assert.match(localWarnings[0]!.message, /"missing"/);
    assert.match(localWarnings[0]!.message, /key dropped/);
  });

  await t.test("should drop functions and symbols with a warning", function () {
    const { metadataJson, localWarnings } = encodeMetadata({
      fn() {},
      sym: Symbol("s"),
      ok: "yes",
    });
    assert.deepEqual(metadataJson, { ok: '"yes"' });
    assert.deepEqual(
      localWarnings.map((warning) => warning.code),
      [METADATA_ENCODE_FAILED_CODE, METADATA_ENCODE_FAILED_CODE],
    );
  });

  await t.test("should drop a `BigInt` with a warning", function () {
    // `JSON.stringify` throws on BigInt; callers must convert it themselves.
    const { metadataJson, localWarnings } = encodeMetadata({ big: 1n });
    assert.deepEqual(metadataJson, {});
    assert.equal(localWarnings.length, 1);
    assert.equal(localWarnings[0]!.code, METADATA_ENCODE_FAILED_CODE);
  });

  await t.test("should drop a circular reference with a warning", function () {
    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    const { metadataJson, localWarnings } = encodeMetadata({ loop: cycle });
    assert.deepEqual(metadataJson, {});
    assert.equal(localWarnings.length, 1);
    assert.equal(localWarnings[0]!.code, METADATA_ENCODE_FAILED_CODE);
  });

  await t.test("should never put a value in a warning message", function () {
    // Warnings are persisted server-side and are a potential PII sink, so they
    // must reference only the key name.
    const { localWarnings } = encodeMetadata({ secret: () => "hunter2" });
    assert.equal(localWarnings.length, 1);
    assert.ok(!localWarnings[0]!.message.includes("hunter2"));
  });

  await t.test("should prefix warning messages with the given source", function () {
    const { localWarnings } = encodeMetadata({ bad: undefined }, "rules[2].");
    assert.match(localWarnings[0]!.message, /^rules\[2\]\.metadata value/);
  });

  await t.test("should leave the server's limits to the server", function () {
    // Size, depth, and count caps are server-enforced (and per-account
    // configurable), so the SDK must not silently pre-truncate.
    let deep: Record<string, unknown> = { leaf: 1 };
    for (let index = 0; index < 30; index++) {
      deep = { nested: deep };
    }
    const wide: Record<string, unknown> = {};
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
