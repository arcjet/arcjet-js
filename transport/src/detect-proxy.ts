import process from "node:process";
import { logLevel } from "@arcjet/env";
import { Logger } from "@arcjet/logger";

/**
 * Map of environment variables used to detect an outbound proxy.
 *
 * This is the same shape as `process.env`.
 */
export type ProxyEnvironment = Record<string, string | undefined>;

/**
 * Minimal logger used to print a line when a proxy is detected.
 */
export interface TransportLogger {
  /**
   * Log an informational message.
   *
   * @param message
   *   Template.
   * @param interpolationValues
   *   Parameters to interpolate.
   * @returns
   *   Nothing.
   */
  info(message: string, ...interpolationValues: unknown[]): void;
}

/**
 * Configuration shared by all transports.
 */
export interface TransportOptions {
  /**
   * Logger used to print a line at startup when a proxy is detected (optional).
   *
   * Defaults to a logger configured from the `ARCJET_LOG_LEVEL` environment
   * variable.
   */
  log?: TransportLogger | undefined;

  /**
   * Environment variables used to detect an outbound proxy (optional).
   *
   * Defaults to `process.env` so standard proxy environment variables
   * (`HTTP_PROXY`, `HTTPS_PROXY`, and `NO_PROXY`) are auto-detected. Pass
   * `false` to ignore proxy environment variables entirely.
   */
  proxyEnv?: ProxyEnvironment | false | undefined;

  /**
   * HTTP version to use when a proxy is in use, on Node.js (optional).
   *
   * Has no effect when no proxy applies, and no effect on Bun, Deno, or the
   * edge runtimes (which proxy through their `fetch` instead). Ignored for
   * direct connections, which always use HTTP/2.
   *
   * - `"1.1"` (default) routes through the proxy over HTTP/1.1 using the
   *   built-in proxy support of the Node.js HTTP agent. This works with any
   *   proxy the agent supports, but loses the latency benefits of HTTP/2.
   * - `"2"` establishes an HTTP `CONNECT` tunnel and keeps HTTP/2 to the origin
   *   end-to-end. This requires a tunneling (`CONNECT`) proxy — the common kind
   *   for HTTPS egress — and a proxy that does not buffer the tunnel (see the
   *   proxy support notes in the README). A proxy that terminates TLS and
   *   speaks HTTP/1.1 to origins cannot preserve HTTP/2 regardless.
   *
   * Defaults to `"1.1"`.
   */
  proxyHttpVersion?: "1.1" | "2" | undefined;
}

/**
 * Detect the proxy that applies to a URL and log a line when one is found.
 *
 * Standard proxy environment variables (`HTTP_PROXY` and `HTTPS_PROXY`,
 * respecting `NO_PROXY`) are auto-detected. When a proxy applies, a single line
 * is logged at startup so it is easy to know when a proxy is being used. The
 * proxy URL itself is not logged, since it can contain credentials.
 *
 * Takes an already-parsed `URL` so callers that also need it (e.g. to pick an
 * HTTP vs HTTPS agent) don't parse the base URL twice.
 *
 * @param url
 *   URL that requests will be made to.
 * @param options
 *   Configuration (optional).
 * @returns
 *   Proxy URL that applies to `url`, or `undefined` when no proxy applies.
 */
export function detectProxy(
  url: URL,
  options?: TransportOptions,
): string | undefined {
  // Default to detecting proxy configuration from `process.env`. Passing
  // `false` disables proxy detection entirely.
  const proxyEnv =
    options?.proxyEnv === false
      ? undefined
      : (options?.proxyEnv ?? process.env);

  let proxyUrl: string | undefined;
  try {
    proxyUrl = proxyEnv ? proxyForUrl(url, proxyEnv) : undefined;
  } catch {
    // Reading proxy environment variables can throw on runtimes that gate
    // environment access behind a permission (e.g. Deno without `--allow-env`).
    // Treat that as "no proxy" rather than failing transport creation.
    return undefined;
  }

  if (typeof proxyUrl === "string") {
    // Log a line at startup so it is easy to know when a proxy is being used.
    // We deliberately do not log the proxy URL itself: it can contain
    // credentials, and not logging it is simpler and safer than redacting it.
    let log = options?.log;
    if (!log) {
      try {
        log = new Logger({
          level: logLevel({ ARCJET_LOG_LEVEL: process.env.ARCJET_LOG_LEVEL }),
        });
      } catch {
        // Building the default logger reads `ARCJET_LOG_LEVEL`, which can throw
        // on runtimes that gate environment access (e.g. Deno without
        // `--allow-env`) when the proxy came from an explicit `proxyEnv`. Skip
        // the startup line rather than failing transport creation; the proxy is
        // still returned below.
      }
    }
    log?.info("Connecting to the Arcjet API through a proxy");
  }

  return proxyUrl;
}

// ---------------------------------------------------------------------------
// Keep the proxy-resolution logic below in sync with the copy in
// `@arcjet/guard` (`arcjet-guard/src/detect-proxy.ts`). The two packages
// intentionally duplicate it rather than share a module: `@arcjet/guard`
// bundles a fetch transport that runs on edge runtimes without `process` or
// these dependencies, so it keeps an edge-safe copy with no imports. Only the
// `detectProxy` entry point above differs between the copies; the helpers
// below should stay logically identical (the two may differ only in line
// wrapping, since each package runs a different formatter).
// ---------------------------------------------------------------------------

/**
 * Find the proxy that should be used for a URL, if any.
 *
 * Honors `NO_PROXY` so the result reflects the connection that will actually be
 * made.
 *
 * @param url
 *   URL that requests will be made to.
 * @param proxyEnv
 *   Environment variables to inspect.
 * @returns
 *   Proxy URL to use, or `undefined` when no proxy applies.
 */
function proxyForUrl(url: URL, proxyEnv: ProxyEnvironment): string | undefined {
  // httpoxy mitigation: under CGI the inbound `Proxy` request header is exposed
  // as the `HTTP_PROXY` environment variable, so honoring uppercase `HTTP_PROXY`
  // for HTTP targets could let a request control outbound proxying. When a CGI
  // environment is detected (`REQUEST_METHOD` is set), ignore it and use only
  // the lowercase `http_proxy`. See https://httpoxy.org.
  const httpProxy =
    proxyEnv["REQUEST_METHOD"] === undefined
      ? firstValue(proxyEnv["http_proxy"], proxyEnv["HTTP_PROXY"])
      : firstValue(proxyEnv["http_proxy"]);

  const proxyUrl =
    url.protocol === "https:"
      ? firstValue(proxyEnv["https_proxy"], proxyEnv["HTTPS_PROXY"])
      : httpProxy;

  if (typeof proxyUrl !== "string") {
    return undefined;
  }

  if (isNoProxy(url, firstValue(proxyEnv["no_proxy"], proxyEnv["NO_PROXY"]))) {
    return undefined;
  }

  return proxyUrl;
}

/**
 * Determine whether a URL should bypass the proxy because of `NO_PROXY`.
 *
 * Supports the common `NO_PROXY` syntax: a comma- or space-separated list of
 * host suffixes, an optional leading `.` or `*.`, an optional `:port`, and `*`
 * to match everything. Entries are matched as host names; IP/CIDR ranges (e.g.
 * `10.0.0.0/8`) are not supported, the same as curl.
 *
 * @param url
 *   URL that requests will be made to.
 * @param noProxy
 *   Value of the `NO_PROXY` environment variable.
 * @returns
 *   Whether the proxy should be bypassed.
 */
function isNoProxy(url: URL, noProxy: string | undefined): boolean {
  if (typeof noProxy !== "string") {
    return false;
  }

  // `url.hostname` wraps IPv6 addresses in brackets (e.g. `[::1]`); strip them
  // so entries can be written with or without brackets.
  const hostname = url.hostname.toLowerCase().replaceAll(/^\[|\]$/g, "");
  const port =
    url.port === "" ? (url.protocol === "https:" ? "443" : "80") : url.port;

  for (const raw of noProxy.split(/[\s,]+/)) {
    if (raw === "") {
      continue;
    }

    // `*` bypasses the proxy for every host.
    if (raw === "*") {
      return true;
    }

    const entry = parseNoProxyEntry(raw);

    // A port on the entry must match the target's (default) port.
    if (entry.port !== undefined && entry.port !== port) {
      continue;
    }

    if (entry.host !== "" && hostMatches(hostname, entry.host)) {
      return true;
    }
  }

  return false;
}

/**
 * Parse one `NO_PROXY` entry into its host and optional port.
 *
 * @param raw
 *   A single entry from the `NO_PROXY` list (already split out and non-empty).
 * @returns
 *   The lowercased host (with any `*.`/`.` wildcard prefix and IPv6 brackets
 *   removed) and the explicit `:port`, if the entry had one.
 */
function parseNoProxyEntry(raw: string): {
  host: string;
  port: string | undefined;
} {
  const entry = raw.toLowerCase();

  // Split off an optional `:port`. A bracketed IPv6 entry (`[::1]:8080`) keeps
  // its port outside the brackets, a bare IPv6 entry (`::1`) has no port, and
  // everything else treats a single trailing `:<digits>` as the port (so IPv6
  // colons are not mistaken for one).
  let host = entry;
  let port: string | undefined;
  const bracketed = entry.match(/^\[(.+)\](?::([0-9]+))?$/);
  if (bracketed === null) {
    const colon = entry.lastIndexOf(":");
    if (
      colon !== -1 &&
      colon === entry.indexOf(":") &&
      /^[0-9]+$/.test(entry.slice(colon + 1))
    ) {
      host = entry.slice(0, colon);
      port = entry.slice(colon + 1);
    }
  } else {
    host = bracketed[1] ?? "";
    port = bracketed[2];
  }

  // Strip a leading `*.` or `.` so `.example.com`, `*.example.com`, and
  // `example.com` all match the domain and its subdomains.
  return { host: host.replace(/^\*?\./, ""), port };
}

/**
 * Whether a host name matches a `NO_PROXY` entry host, exactly or as a
 * subdomain.
 *
 * @param hostname
 *   Host name of the URL being requested.
 * @param host
 *   Host parsed from a `NO_PROXY` entry.
 * @returns
 *   Whether the host name is, or is a subdomain of, the entry host.
 */
function hostMatches(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith("." + host);
}

/**
 * Get the first non-empty string from a list of values.
 *
 * @param values
 *   Values to inspect.
 * @returns
 *   First non-empty string, or `undefined`.
 */
function firstValue(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value !== "") {
      return value;
    }
  }

  return undefined;
}
