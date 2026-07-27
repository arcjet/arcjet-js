/**
 * Nested-JSON `metadata` encoding for `@arcjet/guard`.
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
 * account and can be raised), and every key the server drops comes back on
 * `decision.warnings`. The one drop the SDK must make itself is a value
 * `JSON.stringify` cannot represent faithfully: `undefined`, a function, a
 * symbol, a `BigInt`, a circular reference, or a non-finite number (`NaN`,
 * `Infinity`). Those are dropped with an `AJ1017` warning
 * reported to the server in `local_warnings` so the drop is never silent.
 *
 * Encoding never throws and never affects a decision: a bad value costs you
 * that one key, not the call.
 *
 * `@arcjet/protocol` carries a copy of this logic for `protect()`. The two
 * packages are deliberately independent (guard vendors its own proto), so the
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
 * SDK-side ceiling on the total metadata bytes in one request.
 *
 * This is a **protocol** backstop, not a copy of the server's policy limits, and
 * it is deliberately well above them: the server caps a metadata map at 128 keys
 * of 4 KiB (~512 KiB) and those caps are per-account and can be raised, so the
 * SDK must never pre-empt them.
 *
 * What it protects against is the one immutable limit: a request over 1 MiB is
 * rejected outright, before any per-key validation runs. A rejected request means
 * no decision, which means a fail open — so without this ceiling, oversized
 * attacker-derived metadata could change the security outcome, contrary to the
 * guarantee that metadata never affects a decision. Counted as UTF-8 bytes of
 * keys plus JSON-encoded values before compression, so the estimate is
 * conservative.
 */
export const MAX_METADATA_BYTES: number = 768 * 1024;

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
  try {
    // A proxy can install a throwing `getPrototypeOf` trap, and this runs before
    // any other guard. Metadata must never fail a call.
    const prototype: unknown = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
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
  return (
    code < 0x20 ||
    (code >= 0x7f && code <= 0x9f) ||
    (code >= 0xd800 && code <= 0xdfff) ||
    // The key list wraps each name in double quotes, so an unescaped quote or
    // backslash could forge the appearance of extra keys.
    code === 0x22 ||
    code === 0x5c ||
    code === 0x2028 ||
    code === 0x2029
  );
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
  // Length is counted in code points, not UTF-16 units, so an astral character
  // costs 1 — matching how arcjet-py measures it.
  let length = 0;
  // Iterating a string yields whole code points, so an astral character is one
  // token and cannot be split by the length check below.
  for (const character of key) {
    const code = character.codePointAt(0) ?? 0;
    let token: string;
    if (!needsEscape(code)) {
      token = character;
    } else if (code <= 0xff) {
      token = `\\x${code.toString(16).padStart(2, "0")}`;
    } else {
      token = `\\u${code.toString(16).padStart(4, "0")}`;
    }
    // An escape token is ASCII, so its own length is its cost; a raw character
    // is one code point.
    const cost = needsEscape(code) ? token.length : 1;
    // Truncate on a whole token so the result is never a half escape sequence
    // or a split surrogate pair.
    if (length + cost > MAX_REPORTED_KEY_LENGTH) {
      return `${escaped}...`;
    }
    escaped += token;
    length += cost;
  }
  return escaped;
}

/**
 * `JSON.stringify` replacer that refuses values arcjet-py would refuse.
 *
 * - Non-finite numbers: `JSON.stringify` turns `NaN` and `Infinity` into `null`,
 *   silently changing the value. Throwing drops the key instead, matching
 *   arcjet-py's `json.dumps(allow_nan=False)`.
 * - Lone surrogates: not encodable as UTF-8, so arcjet-py drops the key rather
 *   than let protobuf raise. `\p{Surrogate}` with the `u` flag matches only lone
 *   surrogates, since a valid pair is a single code point.
 *
 * The replacer runs inside the serialization `JSON.stringify` already performs,
 * so this costs no extra traversal. It sees every key and value, including
 * nested ones.
 */
function rejectUnencodable(key: string, value: unknown): unknown {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("non-finite number");
  }
  if (typeof value === "string" && loneSurrogate.test(value)) {
    throw new TypeError("lone surrogate in value");
  }
  if (loneSurrogate.test(key)) {
    throw new TypeError("lone surrogate in key");
  }
  return value;
}

/** Matches a surrogate not part of a valid pair (the `u` flag pairs them up). */
const loneSurrogate: RegExp = /\p{Surrogate}/u;

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
  // Accumulate in a Map and convert with `Object.fromEntries`, which defines own
  // properties. Plain assignment would route `__proto__` to the inherited setter,
  // silently losing that key with no warning.
  const encodedEntries = new Map<string, string>();

  if (!isPlainObject(metadata)) {
    return { metadataJson: {}, localWarnings: [] };
  }

  const dropped: string[] = [];
  let entries: Array<[string, unknown]>;
  try {
    // Reading the object can throw: a getter or proxy trap runs here, before any
    // per-value `JSON.stringify`. Metadata must never fail a call.
    entries = Object.entries(metadata);
  } catch {
    return { metadataJson: {}, localWarnings: [] };
  }

  for (const [key, value] of entries) {
    // The replacer sees keys nested inside the value, but this top-level key is
    // ours to check: a lone surrogate here is not encodable as UTF-8 either.
    if (loneSurrogate.test(key)) {
      dropped.push(sanitizeKey(key));
      continue;
    }

    let encoded: string | undefined;
    try {
      encoded = JSON.stringify(value, rejectUnencodable);
    } catch {
      // Circular refs, BigInt, non-finite numbers, and lone surrogates all throw.
      encoded = undefined;
    }

    // `JSON.stringify` returns `undefined` — not the string "undefined" — for
    // `undefined`, functions, and symbols.
    if (typeof encoded === "string") {
      encodedEntries.set(key, encoded);
    } else {
      dropped.push(sanitizeKey(key));
    }
  }

  const metadataJson = Object.fromEntries(encodedEntries);

  if (dropped.length === 0) {
    return { metadataJson, localWarnings: [] };
  }

  return {
    metadataJson,
    localWarnings: [
      {
        code: METADATA_ENCODE_FAILED_CODE,
        message: formatDropped(
          messagePrefix,
          "could not be JSON-encoded and were dropped",
          dropped,
        ),
      },
    ],
  };
}

/** Render the key list for a warning, eliding once it gets long. */
function formatDropped(prefix: string, reason: string, keys: readonly string[]): string {
  let listed = keys
    .slice(0, MAX_REPORTED_KEYS)
    .map(function (key) {
      return `"${key}"`;
    })
    .join(", ");
  if (keys.length > MAX_REPORTED_KEYS) {
    listed += ", ...";
  }
  return `${prefix}metadata: ${keys.length} key(s) ${reason}: ${listed}`;
}

/**
 * Trim already-encoded metadata maps to {@linkcode MAX_METADATA_BYTES} in total.
 *
 * The maps are trimmed **in place**, in the order given, and within each map in
 * insertion order: keys are kept until the running total would exceed the budget,
 * and every key after that is dropped. Pass the request envelope's map first and
 * each rule's map after it, so the order is stable across calls.
 *
 * One request can carry several metadata maps (a guard request has one per rule
 * plus the envelope), so the ceiling has to be enforced across all of them rather
 * than per map. See {@linkcode MAX_METADATA_BYTES} for why this exists at all.
 *
 * @param maps
 *   Encoded metadata maps, in request order.
 * @returns
 *   At most one warning, naming the keys that were dropped.
 */
export function enforceMetadataBudget(maps: ReadonlyArray<Record<string, string>>): LocalWarning[] {
  const encoder = new TextEncoder();
  const dropped: string[] = [];
  let total = 0;

  for (const map of maps) {
    const over: string[] = [];
    for (const [key, value] of Object.entries(map)) {
      if (total > MAX_METADATA_BYTES) {
        over.push(key);
        continue;
      }
      const size = encoder.encode(key).length + encoder.encode(value).length;
      if (total + size > MAX_METADATA_BYTES) {
        over.push(key);
        // Nothing further fits either; keep scanning so every dropped key is
        // reported.
        total = MAX_METADATA_BYTES + 1;
        continue;
      }
      total += size;
    }
    for (const key of over) {
      // oxlint-disable-next-line typescript/no-dynamic-delete -- trimming a caller-keyed map
      delete map[key];
      dropped.push(sanitizeKey(key));
    }
  }

  if (dropped.length === 0) {
    return [];
  }
  return [
    {
      code: METADATA_ENCODE_FAILED_CODE,
      message: formatDropped(
        "",
        `exceeded the ${MAX_METADATA_BYTES}-byte request metadata budget and were dropped`,
        dropped,
      ),
    },
  ];
}
