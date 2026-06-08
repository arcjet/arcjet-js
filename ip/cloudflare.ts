import type { ProxyService } from "./index.js";

// Cloudflare publishes its IP ranges at the following URLs. These change
// infrequently (roughly annually). They are bundled here so users don't have to
// fetch and paste them, and verified against the live lists by
// `scripts/verify-ranges.ts` (run on a schedule in CI).
//
// IPv4: https://www.cloudflare.com/ips-v4/
// IPv6: https://www.cloudflare.com/ips-v6/
//
// last verified: 2026-06-08

/**
 * Cloudflare IPv4 ranges.
 *
 * Source: https://www.cloudflare.com/ips-v4/
 */
export const cloudflareIpv4Ranges: ReadonlyArray<string> = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
];

/**
 * Cloudflare IPv6 ranges.
 *
 * Source: https://www.cloudflare.com/ips-v6/
 */
export const cloudflareIpv6Ranges: ReadonlyArray<string> = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

/**
 * Configuration for {@linkcode cloudflare}.
 */
export interface CloudflareOptions {
  /**
   * IP addresses and CIDR ranges that identify Cloudflare
   * (optional; defaults to the ranges bundled with this package).
   *
   * Override this only if the bundled ranges are out of date for your setup.
   */
  ranges?: ReadonlyArray<string> | null | undefined;
}

/**
 * Describe Cloudflare as a trusted proxy in front of your application.
 *
 * Pass the result in the `proxies` array. When a request reaches your platform
 * from a Cloudflare IP, Arcjet will read the real client IP from the
 * `CF-Connecting-IP` / `CF-Connecting-IPv6` header instead of treating the
 * Cloudflare edge address as the client. The header is only trusted when the
 * connecting address is within Cloudflare's ranges, so it cannot be spoofed by
 * clients connecting directly to your platform.
 *
 * @param options
 *   Configuration (optional).
 * @returns
 *   Proxy service descriptor to include in the `proxies` array.
 */
export function cloudflare(
  options?: CloudflareOptions | null | undefined,
): ProxyService {
  // An empty `ranges` array is treated as "not provided" and falls back to the
  // bundled defaults, matching how `isTrustedProxy` treats an empty `proxies`
  // list. Trusting an empty list would silently disable Cloudflare detection
  // (no edge address would ever match), so we never let it through.
  const ranges =
    options && Array.isArray(options.ranges) && options.ranges.length > 0
      ? [...options.ranges]
      : [...cloudflareIpv4Ranges, ...cloudflareIpv6Ranges];

  return {
    kind: "service",
    name: "cloudflare",
    // CIDR range strings are parsed by `findIp` (where `parseProxy` lives) so
    // this module stays free of a runtime dependency on `index.ts`.
    ranges,
    // CF-Connecting-IPv6:
    // https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ipv6
    // CF-Connecting-IP:
    // https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#cf-connecting-ip
    clientIp: [
      { header: "cf-connecting-ipv6", format: "ip" },
      { header: "cf-connecting-ip", format: "ip" },
    ],
  };
}
