/** SDK version. Updated by the release process. */
export const VERSION = "1.3.1"; // x-release-please-version

/**
 * Build a user-agent string with SDK version, runtime key, and navigator info.
 *
 * Uses WinterCG runtime keys (lowercase) as the canonical runtime identifier,
 * with version where available. Appends `navigator.userAgent` for additional
 * context since runtimes use their own capitalization there.
 *
 * Output examples:
arcjet-guard-js/1.3.1 (node/22.22.1; Node.js/22)"
 * - `"arcjet-guard-js/1.3.1 (bun/1.2.19; Bun/1.2.19)"
 * - `"arcjet-guard-js/1.3.1 (deno/2.4.2; Deno/2.4.2)"
 * - `"arcjet-guard-js/1.3.1 (workerd; Cloudflare-Workers)"
 * - `"arcjet-guard-js/1.3.1 (edge-light)"
 * - `"arcjet-guard-js/1.3.1"
 *
 * @see https://runtime-keys.proposal.wintercg.org/
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/userAgent
 */
export function userAgent(): string {
  const base = `arcjet-guard-js/${VERSION}`;
  const runtime = detectRuntime();
  const nav =
    globalThis.navigator === undefined ? undefined : globalThis.navigator.userAgent || undefined;

  const parts: string[] = [];
  if (runtime !== undefined && runtime !== "") {
    parts.push(runtime);
  }
  if (nav !== undefined && nav !== "" && nav !== runtime) {
    parts.push(nav);
  }

  return parts.length > 0 ? `${base} (${parts.join("; ")})` : base;
}

/**
 * Detect the current runtime using WinterCG runtime keys.
 *
 * Returns the WinterCG key with version where available (e.g. `"node/22.22.1"`).
 * Keys are always lowercase per the WinterCG registry.
 *
 * @see https://runtime-keys.proposal.wintercg.org/
 * @see https://github.com/unjs/std-env/blob/main/src/runtimes.ts
 */
function detectRuntime(): string | undefined {
  const g: unknown = globalThis;
  if (typeof g !== "object" || g === null) {
    return undefined;
  }

  // Cloudflare Workers — detected via navigator.userAgent since workerd
  // doesn't expose a distinct global. Checked first since workerd may
  // polyfill other globals (e.g. process).
  // WinterCG key: "workerd"
  // @see https://developers.cloudflare.com/workers/runtime-apis/web-standards/#navigatoruseragent
  if (
    "navigator" in g &&
    g.navigator !== undefined &&
    typeof g.navigator === "object" &&
    g.navigator !== null &&
    "userAgent" in g.navigator &&
    typeof g.navigator.userAgent === "string" &&
    g.navigator.userAgent.includes("Cloudflare-Workers")
  ) {
    return "workerd";
  }

  // Vercel Edge Runtime
  // @see https://vercel.com/docs/functions/runtimes/edge-runtime#check-if-you're-running-on-the-edge-runtime
  if ("EdgeRuntime" in g) {
    return "edge-light";
  }

  // Netlify Edge Functions
  // @see https://docs.netlify.com/edge-functions/api/#netlify-global-object
  if ("Netlify" in g) {
    return "netlify";
  }

  // Fastly Compute
  // @see https://js-compute-reference-docs.edgecompute.app/docs/fastly:env/env
  if ("fastly" in g) {
    return "fastly";
  }

  // Deno — version from Deno.version.deno
  // WinterCG key: "deno"
  // @see https://docs.deno.com/api/deno/~/Deno.version
  if ("Deno" in g) {
    const deno = g["Deno"];
    if (typeof deno === "object" && deno !== null && "version" in deno) {
      const version = deno["version"];
      if (typeof version === "object" && version !== null && "deno" in version) {
        const v = version["deno"];
        if (typeof v === "string") {
          return `deno/${v}`;
        }
      }
    }
    return "deno";
  }

  // Bun — check before Node because Bun also sets process.version
  // WinterCG key: "bun"
  // @see https://bun.sh/docs/runtime/utils#bun-version
  if ("Bun" in g) {
    const bun = g["Bun"];
    if (typeof bun === "object" && bun !== null && "version" in bun) {
      const v = bun["version"];
      if (typeof v === "string") {
        return `bun/${v}`;
      }
    }
    return "bun";
  }

  // Node.js
  // WinterCG key: "node"
  // @see https://nodejs.org/docs/latest-v20.x/api/process.html#processversion
  if ("process" in g) {
    const proc = g["process"];
    if (typeof proc === "object" && proc !== null && "version" in proc) {
      const v = proc["version"];
      if (typeof v === "string") {
        return `node/${v.replace(/^v/, "")}`;
      }
    }
  }

  return undefined;
}
