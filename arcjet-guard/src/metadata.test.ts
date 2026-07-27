import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  type ArcjetMetadata,
  METADATA_ENCODE_FAILED_CODE,
  encodeMetadata,
} from "./metadata.ts";

describe("encodeMetadata", () => {
  test("returns empty fields for missing metadata", () => {
    const none: ArcjetMetadata | undefined = undefined;
    assert.deepEqual(encodeMetadata(none), { metadataJson: {}, localWarnings: [] });
    assert.deepEqual(encodeMetadata({}), { metadataJson: {}, localWarnings: [] });
  });

  test("JSON-encodes string values", () => {
    // Values are JSON, so a string arrives quoted — this is what makes
    // `metadata['env'] = '"staging"'` the ClickHouse query form.
    const { metadataJson, localWarnings } = encodeMetadata({ env: "staging" });
    assert.deepEqual(metadataJson, { env: '"staging"' });
    assert.deepEqual(localWarnings, []);
  });

  test("keeps each scalar's JSON type", () => {
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

  test("encodes nested values per top-level key", () => {
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

  test("drops `undefined` with a warning", () => {
    // `JSON.stringify(undefined)` returns `undefined`, not a string.
    const { metadataJson, localWarnings } = encodeMetadata({ ok: 1, missing: undefined });
    assert.deepEqual(metadataJson, { ok: "1" });
    assert.equal(localWarnings.length, 1);
    assert.equal(localWarnings[0].code, METADATA_ENCODE_FAILED_CODE);
    assert.match(localWarnings[0].message, /"missing"/);
    assert.match(localWarnings[0].message, /key dropped/);
  });

  test("drops functions and symbols with a warning", () => {
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

  test("drops a `BigInt` with a warning", () => {
    // `JSON.stringify` throws on BigInt; callers must convert it themselves.
    const { metadataJson, localWarnings } = encodeMetadata({ big: 1n });
    assert.deepEqual(metadataJson, {});
    assert.equal(localWarnings.length, 1);
    assert.equal(localWarnings[0].code, METADATA_ENCODE_FAILED_CODE);
  });

  test("drops a circular reference with a warning", () => {
    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    const { metadataJson, localWarnings } = encodeMetadata({ loop: cycle });
    assert.deepEqual(metadataJson, {});
    assert.equal(localWarnings.length, 1);
  });

  test("never puts a value in a warning message", () => {
    // Warnings are persisted server-side and are a potential PII sink, so they
    // must reference only the key name.
    const { localWarnings } = encodeMetadata({ secret: () => "hunter2" });
    assert.ok(!localWarnings[0].message.includes("hunter2"));
  });

  test("prefixes warning messages with the given source", () => {
    const { localWarnings } = encodeMetadata({ bad: undefined }, "rules[2].");
    assert.match(localWarnings[0].message, /^rules\[2\]\.metadata value/);
  });

  test("leaves the server's limits to the server", () => {
    // Size, depth, and count caps are server-enforced (and per-account
    // configurable), so the SDK must not silently pre-truncate.
    let deep: Record<string, unknown> = { leaf: 1 };
    for (let index = 0; index < 30; index++) {
      deep = { nested: deep };
    }
    const { metadataJson, localWarnings } = encodeMetadata({
      deep,
      big: "x".repeat(8192),
    });
    assert.deepEqual(Object.keys(metadataJson), ["deep", "big"]);
    assert.deepEqual(localWarnings, []);
  });
});
