/**
 * Minimal, dependency-free TypeID generator for local request IDs.
 *
 * Replaces the external `typeid-js` package (and its transitive `uuid`
 * dependency) with an inline implementation. We only ever mint new IDs with a
 * fixed prefix, so this covers generation — not parsing or decoding.
 *
 * The suffix is the 26-character Crockford base32 encoding of a UUIDv7
 * (RFC 9562), matching the TypeID specification
 * (https://github.com/jetify-com/typeid). Mirrors the vendored implementation
 * in the Arcjet Python SDK so both SDKs produce identical IDs.
 */

/** Crockford base32 alphabet (lowercase, excludes `i`, `l`, `o`, `u`). */
export const CROCKFORD_ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz";

/** Fill a 10-byte buffer from the platform CSPRNG (Web Crypto). */
function randomBytes(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(10));
}

/**
 * Generate the 16 raw bytes of a UUIDv7 (RFC 9562): a 48-bit big-endian
 * millisecond timestamp, version `7`, the RFC 4122 variant (`10`), and random
 * bits filling the remainder.
 *
 * `nowMs` and `random` are injectable for deterministic testing; production
 * callers use the defaults.
 *
 * @throws {RangeError}
 *   If `nowMs` is not an integer in the 48-bit range `[0, 2 ** 48)`, or if
 *   `random` is not exactly 10 bytes. Both would otherwise silently produce a
 *   malformed ID (a wrapped timestamp or zero-filled entropy).
 */
export function uuidV7Bytes(
  nowMs: number = Date.now(),
  random: Uint8Array = randomBytes(),
): Uint8Array {
  if (!Number.isInteger(nowMs) || nowMs < 0 || nowMs >= 2 ** 48) {
    throw new RangeError(
      `uuidV7Bytes: \`nowMs\` must be an integer in [0, 2 ** 48), got ${nowMs}`,
    );
  }
  if (random.length !== 10) {
    throw new RangeError(
      `uuidV7Bytes: \`random\` must be exactly 10 bytes, got ${random.length}`,
    );
  }
  const timestampMs = BigInt(nowMs);
  const randA = BigInt((random[0] << 4) | (random[1] >> 4)); // 12 bits
  let randBFull = 0n;
  for (let i = 2; i < 10; i++) {
    randBFull = (randBFull << 8n) | BigInt(random[i]);
  }
  const randB = randBFull & ((1n << 62n) - 1n); // 62 bits

  const hi = (timestampMs << 16n) | (0x7n << 12n) | randA; // version 7
  const lo = (0b10n << 62n) | randB; // RFC 4122 variant

  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setBigUint64(0, hi, false); // big-endian
  view.setBigUint64(8, lo, false);
  return bytes;
}

/**
 * Encode 16 bytes as a 26-character Crockford base32 string. The bytes are read
 * as a big-endian 128-bit integer, most-significant character first. 26 × 5 =
 * 130 bits, so the leading character carries only the top 3 bits and is always
 * `0`-`7`.
 */
function encodeCrockford(bytes: Uint8Array): string {
  let n = 0n;
  for (const byte of bytes) {
    n = (n << 8n) | BigInt(byte);
  }
  const out = new Array<string>(26);
  for (let i = 25; i >= 0; i--) {
    out[i] = CROCKFORD_ALPHABET[Number(n & 0x1fn)];
    n >>= 5n;
  }
  return out.join("");
}

/**
 * Generate a new TypeID string — `<prefix>_<suffix>`, where the suffix is the
 * Crockford base32 encoding of a freshly generated UUIDv7.
 *
 * `nowMs` and `random` are injectable for deterministic testing.
 */
export function typeid(
  prefix: string,
  nowMs?: number,
  random?: Uint8Array,
): string {
  return `${prefix}_${encodeCrockford(uuidV7Bytes(nowMs, random))}`;
}
