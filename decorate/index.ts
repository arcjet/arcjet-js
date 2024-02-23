import {
  ArcjetDecision,
  ArcjetRateLimitReason,
  ArcjetReason,
  ArcjetRuleResult,
} from "@arcjet/protocol";

interface ResponseLike {
  // If this is defined, we can expect to be working with a `Response` or
  // `NextResponse`.
  headers: Headers;
}

interface OutgoingMessageLike {
  headersSent: boolean;
  hasHeader: (name: string) => boolean;
  setHeader: (
    name: string,
    value: number | string | ReadonlyArray<string>,
  ) => unknown;
}

export interface ArcjetResponse {
  // If this is defined, we can expect to be working with a `Response` or
  // `NextResponse`.
  headers?: Headers;

  // Otherwise, we'll be working with an `http.OutgoingMessage` and we'll need
  // to use these values.
  headersSent?: boolean;
  hasHeader?: (name: string) => boolean;
  setHeader?: (
    name: string,
    value: number | string | ReadonlyArray<string>,
  ) => unknown;
}

function isResponseLike(response: ArcjetResponse): response is ResponseLike {
  if (typeof response.headers === "undefined") {
    return false;
  }

  if (
    "has" in response.headers &&
    typeof response.headers.has === "function" &&
    "set" in response.headers &&
    typeof response.headers.set === "function"
  ) {
    return true;
  }

  return false;
}

function isOutgoingMessageLike(
  response: ArcjetResponse,
): response is OutgoingMessageLike {
  if (typeof response.headersSent !== "boolean") {
    return false;
  }

  if (typeof response.hasHeader !== "function") {
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

  if (current.max > next.max) {
    return next;
  }

  // If all else is equal, just return the current reason
  return current;
}

/**
 * Decorates a response with `RateLimit` and `RateLimit-Policy` headers based
 * on an {@link ArcjetDecision} and conforming to the [Rate Limit fields for
 * HTTP](https://ietf-wg-httpapi.github.io/ratelimit-headers/draft-ietf-httpapi-ratelimit-headers.html)
 * draft specification.
 *
 * @param response The response to decorate—must be similar to a DOM Response or node's OutgoingMessage.
 * @param decision The {@link ArcjetDecision} that was made by calling `protect()` on the SDK.
 */
export function setRateLimitHeaders(
  response: ArcjetResponse,
  decision: ArcjetDecision,
) {
  const rateLimitReasons = decision.results
    .map(extractReason)
    .filter(isRateLimitReason);

  const policies = new Map<number, number>();
  for (const reason of rateLimitReasons) {
    if (policies.has(reason.max)) {
      // TODO: Warn? Or does it make sense to bail since there is conflicting policies?
      continue;
    }

    if (typeof reason.max !== "number" || typeof reason.window !== "number") {
      // TODO: Warn? Or should this bail since the reasons were corrupted?
      continue;
    }

    policies.set(reason.max, reason.window);
  }

  const policy = Array.from(policies.entries())
    .sort(sortByLowestMax)
    .map(toPolicyString)
    .join(", ");

  const rl = rateLimitReasons.reduce(nearestLimit);

  if (
    typeof rl.max !== "number" ||
    typeof rl.remaining !== "number" ||
    typeof rl.reset !== "number"
  ) {
    // TODO: Warn
    return;
  }

  const limit = `limit=${rl.max}, remaining=${rl.remaining}, reset=${rl.reset}`;

  if (isResponseLike(response)) {
    if (response.headers.has("RateLimit")) {
      // TODO: Warn
      return;
    }
    if (response.headers.has("RateLimit-Policy")) {
      // TODO: Warn
      return;
    }

    response.headers.set("RateLimit", limit);
    response.headers.set("RateLimit-Policy", policy);
  }

  if (isOutgoingMessageLike(response)) {
    if (response.headersSent) {
      // TODO: Warn
      return;
    }

    if (response.hasHeader("RateLimit")) {
      // TODO: Warn
      return;
    }

    if (response.hasHeader("RateLimit-Policy")) {
      // TODO: Warn
      return;
    }

    response.setHeader("RateLimit", limit);
    response.setHeader("RateLimit-Policy", policy);
  }
}
