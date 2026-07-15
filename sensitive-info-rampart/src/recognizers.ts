import type { ArcjetSensitiveInfoType } from "arcjet";

/**
 * A detected span of sensitive info, with character offsets into the scanned
 * value and the {@linkcode ArcjetSensitiveInfoType} it was identified as.
 */
export interface DetectedSpan {
  /**
   * Start index (inclusive) into the scanned value.
   */
  start: number;
  /**
   * End index (exclusive) into the scanned value.
   */
  end: number;
  /**
   * Identified type.
   */
  type: ArcjetSensitiveInfoType;
}

/**
 * A deterministic recognizer: given the full text, return the spans it matched.
 *
 * Recognizers must be pure and synchronous so they stay cheap relative to model
 * inference.
 */
export type Recognizer = (value: string) => DetectedSpan[];

/**
 * Validate a candidate card number with the Luhn checksum.
 *
 * @param digits
 *   String of digits (separators already removed).
 * @returns
 *   Whether the checksum is valid.
 */
function luhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  // Callers only pass strings of digits (the recognizer regex guarantees it).
  for (let i = digits.length - 1; i >= 0; i--) {
    let value = digits.charCodeAt(i) - 48;
    if (double) {
      value *= 2;
      if (value > 9) {
        value -= 9;
      }
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Run a regular expression globally and map each match to a {@linkcode DetectedSpan}.
 *
 * @param value
 *   Text to scan.
 * @param pattern
 *   Global regular expression.
 * @param type
 *   Type to assign matched spans.
 * @returns
 *   Matched spans.
 */
function matchAll(value: string, pattern: RegExp, type: ArcjetSensitiveInfoType): DetectedSpan[] {
  const spans: DetectedSpan[] = [];
  for (const match of value.matchAll(pattern)) {
    if (typeof match.index === "number") {
      spans.push({
        start: match.index,
        end: match.index + match[0].length,
        type,
      });
    }
  }
  return spans;
}

// Patterns are created once at module load so repeated detection is cheap.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/gi;
const IPV4 = /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g;
// Full IPv6 (eight groups) or any of the `::` zero-compression forms. The
// alternatives all require either eight groups or a `::`, so ordinary
// colon-separated text such as a clock time (`12:34:56`) does not match. Bounded
// by non-hex/non-colon so we don't match inside a longer token.
const IPV6 =
  /(?<![:.\w])(?:(?:[A-Fa-f0-9]{1,4}:){7}[A-Fa-f0-9]{1,4}|(?:[A-Fa-f0-9]{1,4}:){1,7}:|(?:[A-Fa-f0-9]{1,4}:){1,6}:[A-Fa-f0-9]{1,4}|(?:[A-Fa-f0-9]{1,4}:){1,5}(?::[A-Fa-f0-9]{1,4}){1,2}|(?:[A-Fa-f0-9]{1,4}:){1,4}(?::[A-Fa-f0-9]{1,4}){1,3}|(?:[A-Fa-f0-9]{1,4}:){1,3}(?::[A-Fa-f0-9]{1,4}){1,4}|(?:[A-Fa-f0-9]{1,4}:){1,2}(?::[A-Fa-f0-9]{1,4}){1,5}|[A-Fa-f0-9]{1,4}:(?::[A-Fa-f0-9]{1,4}){1,6}|:(?::[A-Fa-f0-9]{1,4}){1,7})(?![:.\w])/g;
const SSN = /\b\d{3}-\d{2}-\d{4}\b/g;
// Phone numbers: optional country/area code then 7+ digits with separators.
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]?\d{2,4}){2,4}/g;
// Candidate card numbers: 13–19 digits, optionally split by spaces or dashes.
const CREDIT_CARD = /\b\d(?:[ -]?\d){12,18}\b/g;

/**
 * Email address recognizer.
 */
export const emailRecognizer: Recognizer = (value) => matchAll(value, EMAIL, "EMAIL");

/**
 * URL recognizer.
 */
export const urlRecognizer: Recognizer = (value) => matchAll(value, URL, "URL");

/**
 * IPv4 and IPv6 address recognizer.
 */
export const ipAddressRecognizer: Recognizer = (value) => [
  ...matchAll(value, IPV4, "IP_ADDRESS"),
  ...matchAll(value, IPV6, "IP_ADDRESS"),
];

/**
 * US Social Security Number recognizer (dashed form).
 */
export const ssnRecognizer: Recognizer = (value) => matchAll(value, SSN, "SSN");

/**
 * Phone number recognizer. Requires at least seven digits to reduce matches on
 * unrelated numbers.
 */
export const phoneRecognizer: Recognizer = (value) =>
  matchAll(value, PHONE, "PHONE_NUMBER").filter((span) => {
    const digits = value.slice(span.start, span.end).replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15;
  });

/**
 * Credit/debit card recognizer, validated with the Luhn checksum.
 */
export const creditCardRecognizer: Recognizer = (value) =>
  matchAll(value, CREDIT_CARD, "CREDIT_CARD_NUMBER").filter((span) => {
    const digits = value.slice(span.start, span.end).replace(/[ -]/g, "");
    return digits.length >= 13 && digits.length <= 19 && luhn(digits);
  });

/**
 * The default set of deterministic recognizers, mirroring Rampart's
 * deterministic redaction layer. Structured, validatable types are handled here
 * rather than by the model, which is more reliable for them.
 *
 * They are ordered most-specific first. Overlap resolution happens later in the
 * backend (longer spans win; equal-length ties keep the earlier-listed
 * recognizer), so this order only breaks ties — for example a Luhn-valid card
 * over the looser phone matcher when they match the same text.
 */
export const defaultRecognizers: ReadonlyArray<Recognizer> = [
  creditCardRecognizer,
  ssnRecognizer,
  emailRecognizer,
  urlRecognizer,
  ipAddressRecognizer,
  phoneRecognizer,
];

/**
 * Run a list of recognizers over `value` and collect every span they match.
 *
 * @param value
 *   Text to scan.
 * @param recognizers
 *   Recognizers to run (default: {@linkcode defaultRecognizers}).
 * @returns
 *   All matched spans, in recognizer order.
 */
export function runRecognizers(
  value: string,
  recognizers: ReadonlyArray<Recognizer> = defaultRecognizers,
): DetectedSpan[] {
  const spans: DetectedSpan[] = [];
  for (const recognizer of recognizers) {
    spans.push(...recognizer(value));
  }
  return spans;
}
