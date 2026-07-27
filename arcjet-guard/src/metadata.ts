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
 * `JSON.stringify` cannot represent: `undefined`, a function, a symbol, a
 * `BigInt`, or a circular reference. Those are dropped with an `AJ1017` warning
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
   * Human-readable description. References only the offending key name, never
   * the value — warnings are persisted and must not become a PII sink.
   */
  message: string;
}

/** Warning code for a metadata key the SDK dropped before sending. */
export const METADATA_ENCODE_FAILED_CODE = "AJ1017";

/**
 * JSON-encode each top-level value of `metadata` for the wire.
 *
 * @param metadata
 *   User-supplied nested metadata, or `undefined`.
 * @param messagePrefix
 *   Prepended to warning messages to identify the source (such as
 *   `"rules[0]."`), matching the server's convention.
 * @returns
 *   `metadataJson` maps each surviving key to its JSON-encoded value, ready for
 *   the proto `metadata_json` field. `localWarnings` has one entry per key
 *   dropped because it could not be encoded. Both are empty when `metadata` is
 *   `undefined` or empty.
 */
export function encodeMetadata(
  metadata: ArcjetMetadata | undefined,
  messagePrefix = "",
): { metadataJson: Record<string, string>; localWarnings: LocalWarning[] } {
  const metadataJson: Record<string, string> = {};
  const localWarnings: LocalWarning[] = [];

  if (!metadata) {
    return { metadataJson, localWarnings };
  }

  for (const [key, value] of Object.entries(metadata)) {
    let encoded: string | undefined;
    try {
      encoded = JSON.stringify(value);
    } catch {
      // Circular references and BigInt both throw TypeError.
      encoded = undefined;
    }

    // `JSON.stringify` returns `undefined` — not the string "undefined" — for
    // `undefined`, functions, and symbols.
    if (typeof encoded !== "string") {
      localWarnings.push({
        code: METADATA_ENCODE_FAILED_CODE,
        message: `${messagePrefix}metadata value for key "${key}" could not be JSON-encoded; key dropped`,
      });
      continue;
    }

    metadataJson[key] = encoded;
  }

  return { metadataJson, localWarnings };
}
