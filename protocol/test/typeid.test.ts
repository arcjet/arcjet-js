import assert from "node:assert/strict";
import test from "node:test";
import { CROCKFORD_ALPHABET, typeid, uuidV7Bytes } from "../dist/typeid.js";

// Ported from the Arcjet Python SDK's tests/unit/test_typeid.py — both SDKs
// vendor the same inline TypeID generation, so they must satisfy the same
// invariants (https://github.com/jetify-com/typeid).

const CROCKFORD_RE = /^[0-9a-hj-km-np-tv-z]{26}$/;

/** Assert `rid` is a well-formed `lreq` TypeID and return the suffix. */
function assertValidTypeid(rid: string): string {
  const sep = rid.indexOf("_");
  const prefix = rid.slice(0, sep);
  const suffix = rid.slice(sep + 1);
  assert.equal(prefix, "lreq");
  assert.equal(suffix.length, 26);
  assert.match(suffix, CROCKFORD_RE, `bad suffix chars: ${suffix}`);
  // 128-bit value encoded in 130 bits, so the leading char never exceeds 7.
  assert.ok("01234567".includes(suffix[0]), `overflow: first char '${suffix[0]}'`);
  return suffix;
}

/** Assert `raw` is valid UUIDv7 bytes (version 7, RFC 4122 variant). */
function assertValidUuidV7(raw: Uint8Array): void {
  assert.equal(raw.length, 16);
  assert.equal(raw[6] >> 4, 7, "version nibble must be 7");
  assert.equal(raw[8] >> 6, 0b10, "variant bits must be 10");
}

// --- Happy path -----------------------------------------------------------

test("format: lreq_ prefix and 26-char Crockford base32 suffix", () => {
  assertValidTypeid(typeid("lreq"));
});

test("uuidv7 version and variant", () => {
  assertValidUuidV7(uuidV7Bytes());
});

test("suffix first char is always 0-7", () => {
  for (let i = 0; i < 50; i++) {
    assertValidTypeid(typeid("lreq"));
  }
});

test("ids are unique", () => {
  const ids = new Set<string>();
  for (let i = 0; i < 200; i++) {
    ids.add(typeid("lreq"));
  }
  assert.equal(ids.size, 200);
});

test("ids are time-sortable", () => {
  const earlier = typeid("lreq", 1_000);
  const later = typeid("lreq", 2_000);
  assert.ok(later > earlier);
});

// --- Edge cases -----------------------------------------------------------

const zero10 = new Uint8Array(10); // all 0x00
const ff10 = new Uint8Array(10).fill(0xff); // all 0xff

test("zero timestamp still well-formed", () => {
  assertValidTypeid(typeid("lreq", 0));
});

test("max 48-bit timestamp still well-formed", () => {
  assertValidTypeid(typeid("lreq", 2 ** 48 - 1));
});

test("low-entropy (all-zero) random still valid", () => {
  assertValidTypeid(typeid("lreq", Date.now(), zero10));
});

test("max-entropy (all-0xff) random still valid", () => {
  assertValidTypeid(typeid("lreq", Date.now(), ff10));
});

test("all-0xff random preserves UUIDv7 version and variant", () => {
  assertValidUuidV7(uuidV7Bytes(Date.now(), ff10));
});

test("Crockford alphabet excludes ambiguous chars", () => {
  for (const ch of "ilou") {
    assert.ok(!CROCKFORD_ALPHABET.includes(ch));
  }
  assert.equal(CROCKFORD_ALPHABET.length, 32);
});

// --- Fuzz (loop over random timestamp + random bytes) ---------------------

const MAX_TIMESTAMP_MS = 2 ** 48 - 1;

test("fuzz: any timestamp + random bytes yields a valid TypeID and UUIDv7", () => {
  for (let i = 0; i < 500; i++) {
    const ts = Math.floor(Math.random() * MAX_TIMESTAMP_MS);
    const random = crypto.getRandomValues(new Uint8Array(10));
    assertValidTypeid(typeid("lreq", ts, random));
    assertValidUuidV7(uuidV7Bytes(ts, random));
  }
});

test("fuzz: embedded timestamp round-trips (truncated to integer ms)", () => {
  for (let i = 0; i < 500; i++) {
    const ts = Math.floor(Math.random() * MAX_TIMESTAMP_MS);
    const random = crypto.getRandomValues(new Uint8Array(10));
    const raw = uuidV7Bytes(ts, random);
    let actualMs = 0n;
    for (let b = 0; b < 6; b++) {
      actualMs = (actualMs << 8n) | BigInt(raw[b]);
    }
    assert.equal(actualMs, BigInt(ts), `timestamp mismatch: ${actualMs} != ${ts}`);
  }
});

// --- Input validation -----------------------------------------------------

test("rejects an out-of-range or non-integer `nowMs`", () => {
  for (const bad of [-1, 2 ** 48, 2 ** 53, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(
      () => uuidV7Bytes(bad, zero10),
      RangeError,
      `expected RangeError for nowMs=${bad}`,
    );
  }
  // Boundaries are valid: 0 and the largest 48-bit millisecond.
  assert.doesNotThrow(() => uuidV7Bytes(0, zero10));
  assert.doesNotThrow(() => uuidV7Bytes(2 ** 48 - 1, zero10));
});

test("rejects `random` that is not exactly 10 bytes", () => {
  for (const len of [0, 9, 11, 16]) {
    assert.throws(
      () => uuidV7Bytes(0, new Uint8Array(len)),
      RangeError,
      `expected RangeError for random length ${len}`,
    );
  }
});
