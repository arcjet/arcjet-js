import format from "@arcjet/sprintf";
import type { ArcjetDecision } from "@arcjet/protocol";
import {
  ArcjetRateLimitReason,
  ArcjetReason,
  ArcjetRuleResult,
} from "@arcjet/protocol";

// If these are defined, we can expect to be working with `Headers` directly.
interface HeaderLike {
  has(name: string): boolean;
  get(name: string): string | null;
  set(name: string, value: string): void;
}

// If this is defined, we can expect to be working with a `Response` or
// `NextResponse`.
interface ResponseLike {
  headers: HeaderLike;
}

// Otherwise, we'll be working with an `http.OutgoingMessage` and we'll need
// to use these values.
interface OutgoingMessageLike {
  headersSent: boolean;
  hasHeader: (name: string) => boolean;
  getHeader: (name: string) => number | string | string[] | undefined;
  setHeader: (
    name: string,
    value: number | string | ReadonlyArray<string>,
  ) => unknown;
}

/**
 * Decorable value.
 *
 * Something that looks like `Headers` (Fetch),
 * `OutgoingMessage` (Node.js), or
 * `Response` (Fetch).
 */
// TODO(@wooorm-arcjet): rename to `Decorable`.
export type ArcjetCanDecorate = HeaderLike | OutgoingMessageLike | ResponseLike;

function isHeaderLike(value: ArcjetCanDecorate): value is HeaderLike {
  if (
    "has" in value &&
    typeof value.has === "function" &&
    "get" in value &&
    typeof value.get === "function" &&
    "set" in value &&
    typeof value.set === "function"
  ) {
    return true;
  }

  return false;
}

function isResponseLike(value: ArcjetCanDecorate): value is ResponseLike {
  if (!("headers" in value) || typeof value.headers === "undefined") {
    return false;
  }

  return isHeaderLike(value.headers);
}

function isOutgoingMessageLike(
  response: ArcjetCanDecorate,
): response is OutgoingMessageLike {
  if (
    !("headersSent" in response) ||
    typeof response.headersSent !== "boolean"
  ) {
    return false;
  }

  if (typeof response.hasHeader !== "function") {
    return false;
  }

  if (typeof response.getHeader !== "function") {
    return false;
  }

  if (typeof response.setHeader !== "function") {
    return false;
  }

  return true;
}

function sortByLowestMax(
  [maxA, _windowA]: [number, number],
  [maxB, _windowB]: [number, number],
) {
  return maxA - maxB;
}

function toPolicyString([max, window]: [number, number]) {
  return `${max};w=${window}`;
}

function toLimitString({
  max,
  remaining,
  reset,
}: {
  max: number;
  remaining: number;
  reset: number;
}) {
  return `limit=${max}, remaining=${remaining}, reset=${reset}`;
}

function extractReason(result: ArcjetRuleResult): ArcjetReason {
  return result.reason;
}

function isRateLimitReason(
  reason: ArcjetReason,
): reason is ArcjetRateLimitReason {
  return reason.isRateLimit();
}

function nearestLimit(
  current: ArcjetRateLimitReason,
  next: ArcjetRateLimitReason,
) {
  if (current.remaining < next.remaining) {
    return current;
  }

  if (current.remaining > next.remaining) {
    return next;
  }

  // Reaching here means `remaining` is equal so prioritize closest reset
  if (current.reset < next.reset) {
    return current;
  }

  if (current.reset > next.reset) {
    return next;
  }

  // Reaching here means that `remaining` and `reset` are equal, so prioritize
  // the smallest `max`
  if (current.max < next.max) {
    return current;
  }

  // All else equal, just return the next item in the list
  return next;
}

/**
 * Decorates an object with `RateLimit` and `RateLimit-Policy` headers based
 * on an {@link ArcjetDecision} and conforming to the [Rate Limit fields for
 * HTTP](https://ietf-wg-httpapi.github.io/ratelimit-headers/draft-ietf-httpapi-ratelimit-headers.html)
 * draft specification.
 *
 * @param value The object to decorate—must be similar to {@link Headers}, {@link Response} or
 * {@link OutgoingMessage}.
 * @param decision The {@link ArcjetDecision} that was made by calling `protect()` on the SDK.
 */
export function setRateLimitHeaders(
  value: ArcjetCanDecorate,
  decision: ArcjetDecision,
) {
  const rateLimitReasons = decision.results
    .map(extractReason)
    .filter(isRateLimitReason);

  let policy: string;
  let limit: string;
  if (rateLimitReasons.length > 0) {
    const policies = new Map<number, number>();
    for (const reason of rateLimitReasons) {
      if (policies.has(reason.max)) {
        console.error(
          "Invalid rate limit policy—two policies should not share the same limit",
        );
        return;
      }

      if (
        typeof reason.max !== "number" ||
        typeof reason.window !== "number" ||
        typeof reason.remaining !== "number" ||
        typeof reason.reset !== "number"
      ) {
        console.error(format("Invalid rate limit encountered: %o", reason));
        return;
      }

      policies.set(reason.max, reason.window);
    }

    const rl = rateLimitReasons.reduce(nearestLimit);

    limit = toLimitString(rl);
    policy = Array.from(policies.entries())
      .sort(sortByLowestMax)
      .map(toPolicyString)
      .join(", ");
  } else {
    // For cached decisions, we may not have rule results, but we'd still have
    // the top-level reason.
    if (isRateLimitReason(decision.reason)) {
      if (
        typeof decision.reason.max !== "number" ||
        typeof decision.reason.window !== "number" ||
        typeof decision.reason.remaining !== "number" ||
        typeof decision.reason.reset !== "number"
      ) {
        console.error(
          format("Invalid rate limit encountered: %o", decision.reason),
        );
        return;
      }

      limit = toLimitString(decision.reason);
      policy = toPolicyString([decision.reason.max, decision.reason.window]);
    } else {
      return;
    }
  }

  if (isHeaderLike(value)) {
    if (value.has("RateLimit")) {
      console.warn(
        format(
          "Response already contains `RateLimit` header\n  Original: %s\n  New: %s",
          value.get("RateLimit"),
          limit,
        ),
      );
    }
    if (value.has("RateLimit-Policy")) {
      console.warn(
        format(
          "Response already contains `RateLimit-Policy` header\n  Original: %s\n  New: %s",
          value.get("RateLimit-Policy"),
          limit,
        ),
      );
    }

    value.set("RateLimit", limit);
    value.set("RateLimit-Policy", policy);

    // The response was handled
    return;
  }

  if (isResponseLike(value)) {
    if (value.headers.has("RateLimit")) {
      console.warn(
        format(
          "Response already contains `RateLimit` header\n  Original: %s\n  New: %s",
          value.headers.get("RateLimit"),
          limit,
        ),
      );
    }
    if (value.headers.has("RateLimit-Policy")) {
      console.warn(
        format(
          "Response already contains `RateLimit-Policy` header\n  Original: %s\n  New: %s",
          value.headers.get("RateLimit-Policy"),
          limit,
        ),
      );
    }

    value.headers.set("RateLimit", limit);
    value.headers.set("RateLimit-Policy", policy);

    // The response was handled
    return;
  }

  if (isOutgoingMessageLike(value)) {
    if (value.headersSent) {
      console.error(
        "Headers have already been sent—cannot set RateLimit header",
      );
      return;
    }

    if (value.hasHeader("RateLimit")) {
      console.warn(
        format(
          "Response already contains `RateLimit` header\n  Original: %s\n  New: %s",
          value.getHeader("RateLimit"),
          limit,
        ),
      );
    }

    if (value.hasHeader("RateLimit-Policy")) {
      console.warn(
        format(
          "Response already contains `RateLimit-Policy` header\n  Original: %s\n  New: %s",
          value.getHeader("RateLimit-Policy"),
          limit,
        ),
      );
    }

    value.setHeader("RateLimit", limit);
    value.setHeader("RateLimit-Policy", policy);

    // The response was handled
    return;
  }

  console.debug(
    "Cannot determine if response is Response or OutgoingMessage type",
  );
}
