/**
 * Nested-JSON `metadata` encoding for `@arcjet/protocol`.
 *
 * `metadata` is a record of string keys to arbitrary JSON-serializable values
 * (nested objects, arrays, numbers, booleans, `null`, strings). The wire format
 * is `map<string, string>`: each **top-level** value is JSON-encoded
 * independently and stored verbatim, so value formatting survives the round
 * trip.
 *
 * Encoding is the SDK's only client-side responsibility here. The limits — 128
 * top-level keys, 4 KiB per serialized value, 10 levels of nesting, and
 * key-name validity — are enforced server-side (they are configurable per
 * account and can be raised), and every key the server drops is recorded with
 * the decision. The one drop the SDK must make itself is a value
 * `JSON.stringify` cannot represent faithfully: `undefined`, a function, a
 * symbol, a `BigInt`, a circular reference, or a non-finite number (`NaN`,
 * `Infinity`). Those are dropped with an `AJ1017` warning
 * reported to the server in `local_warnings` so the drop is never silent.
 *
 * Encoding never throws and never affects a decision: a bad value costs you
 * that one key, not the call.
 *
 * `@arcjet/guard` carries a copy of this logic. The two packages are
 * deliberately independent (guard vendors its own proto copy), so the
 * duplication mirrors what is already there rather than adding a dependency.
 *
 * @packageDocumentation
 */

/**
 * Metadata for correlation and analytics: string keys mapped to any
 * JSON-serializable value, including nested objects and arrays.
 *
 * Typed as `unknown` values rather than a recursive JSON type on purpose — a
 * strict type rejects ordinary interfaces (they do not satisfy an index
 * signature), which would make a fail-open field a compile error. Values that
 * cannot be JSON-encoded are dropped at runtime with a warning instead.
 *
 * Two JavaScript-specific notes:
 *
 * - Numbers are IEEE-754 doubles, so an integer above `Number.MAX_SAFE_INTEGER`
 *   loses precision before it reaches the wire. Pass such values as strings.
 * - `BigInt` cannot be JSON-encoded and is dropped; convert it yourself.
 */
export type ArcjetMetadata = Record<string, unknown>;

/**
 * A client-side validation warning reported to the server in `local_warnings`.
 */
export interface LocalWarning {
  /** Machine-readable code (currently always `"AJ1017"`). */
  code: string;
  /**
   * Human-readable description. Names only the offending keys, never the
   * values, and only after escaping and length-bounding them — warnings are
   * persisted and reach application logs, so they must not become a PII sink or
   * a log-forging vector.
   */
  message: string;
}

/** Warning code for a metadata key the SDK dropped before sending. */
export const METADATA_ENCODE_FAILED_CODE = "AJ1017";

/** Longest key name echoed into a warning, matching the server's key cap. */
const MAX_REPORTED_KEY_LENGTH = 64;

/** Most key names listed in a single warning before the list is elided. */
const MAX_REPORTED_KEYS = 10;

/**
 * Whether `value` is a plain object usable as metadata.
 *
 * Arrays would encode as numeric string keys, and exotic objects (`Map`, `Date`,
 * class instances) yield no own enumerable entries, so metadata would be
 * silently ignored. Rejecting them up front keeps that from looking like it
 * worked.
 */
function isPlainObject(value: unknown): value is ArcjetMetadata {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Whether a code point must be escaped before it goes in a warning message.
 *
 * C0 controls, DEL, the C1 range, and the Unicode line/paragraph separators are
 * the characters that can break a log line or a JSON-ish log record. Everything
 * else, including ordinary non-ASCII text, is echoed as-is.
 *
 * Kept identical to `_needs_escape` in arcjet-py so both SDKs render the same
 * warning for the same key.
 */
function needsEscape(code: number): boolean {
  return code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029;
}

/**
 * Render a metadata key for inclusion in a warning message.
 *
 * Keys are user-controlled, and warnings end up in application logs and in
 * server-side storage, so control characters are escaped (a newline in a key
 * could otherwise forge a log entry) and the result is length-bounded.
 */
function sanitizeKey(key: string): string {
  let escaped = "";
  for (const character of key) {
    const code = character.codePointAt(0) ?? 0;
    if (!needsEscape(code)) {
      escaped += character;
    } else if (code <= 0xff) {
      escaped += `\\x${code.toString(16).padStart(2, "0")}`;
    } else {
      escaped += `\\u${code.toString(16).padStart(4, "0")}`;
    }
  }
  return escaped.length > MAX_REPORTED_KEY_LENGTH
    ? `${escaped.slice(0, MAX_REPORTED_KEY_LENGTH)}...`
    : escaped;
}

/**
 * `JSON.stringify` replacer that refuses non-finite numbers.
 *
 * `JSON.stringify` turns `NaN` and `Infinity` into `null`, which would silently
 * change the value. Throwing instead drops the key with a warning, matching
 * arcjet-py (whose `json.dumps(allow_nan=False)` raises). The replacer runs
 * inside the serialization `JSON.stringify` already performs, so this costs no
 * extra traversal.
 */
function rejectNonFinite(_key: string, value: unknown): unknown {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("non-finite number");
  }
  return value;
}

/**
 * JSON-encode each top-level value of `metadata` for the wire.
 *
 * @param metadata
 *   User-supplied nested metadata, or `undefined`.
 * @param messagePrefix
 *   Prepended to the warning message to identify the source (such as
 *   `"rules[0]."`), matching the server's convention.
 * @returns
 *   `metadataJson` maps each surviving key to its JSON-encoded value, ready for
 *   the proto `metadata_json` field. `localWarnings` holds **at most one** entry,
 *   naming every key that had to be dropped, so one call can never flood the
 *   warning channel. Both are empty when `metadata` is missing, empty, or not a
 *   plain object.
 */
export function encodeMetadata(
  metadata: ArcjetMetadata | undefined,
  messagePrefix = "",
): { metadataJson: Record<string, string>; localWarnings: LocalWarning[] } {
  const metadataJson: Record<string, string> = {};

  if (!isPlainObject(metadata)) {
    return { metadataJson, localWarnings: [] };
  }

  const dropped: string[] = [];
  let entries: Array<[string, unknown]>;
  try {
    // Reading the object can throw: a getter or proxy trap runs here, before any
    // per-value `JSON.stringify`. Metadata must never fail a call.
    entries = Object.entries(metadata);
  } catch {
    return { metadataJson, localWarnings: [] };
  }

  for (const [key, value] of entries) {
    let encoded: string | undefined;
    try {
      encoded = JSON.stringify(value, rejectNonFinite);
    } catch {
      // Circular references, BigInt, and non-finite numbers all throw TypeError.
      encoded = undefined;
    }

    // `JSON.stringify` returns `undefined` — not the string "undefined" — for
    // `undefined`, functions, and symbols.
    if (typeof encoded === "string") {
      metadataJson[key] = encoded;
    } else {
      dropped.push(sanitizeKey(key));
    }
  }

  if (dropped.length === 0) {
    return { metadataJson, localWarnings: [] };
  }

  let listed = dropped
    .slice(0, MAX_REPORTED_KEYS)
    .map(function (key) {
      return `"${key}"`;
    })
    .join(", ");
  if (dropped.length > MAX_REPORTED_KEYS) {
    listed += ", ...";
  }

  return {
    metadataJson,
    localWarnings: [
      {
        code: METADATA_ENCODE_FAILED_CODE,
        message: `${messagePrefix}metadata: ${dropped.length} key(s) could not be JSON-encoded and were dropped: ${listed}`,
      },
    ],
  };
}
