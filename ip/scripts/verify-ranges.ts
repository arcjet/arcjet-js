// Verify (or regenerate) the bundled Cloudflare IP ranges against the lists
// Cloudflare publishes. Run on a schedule in CI so we notice when they change.
//
// Prefer the package scripts, which build first so the `../index.ts` import
// (which re-exports the generated `./cloudflare.js`) resolves:
//
//   npm run verify-ranges -w @arcjet/ip   # check, exit non-zero on drift
//   npm run generate -w @arcjet/ip        # rewrite cloudflare.ts in place
//
// Runs with a Node version that strips TypeScript types (the repo uses Node 24).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cloudflareIpv4Ranges, cloudflareIpv6Ranges } from "../cloudflare.ts";
import { parseProxy } from "../index.ts";

const IPV4_URL = "https://www.cloudflare.com/ips-v4/";
const IPV6_URL = "https://www.cloudflare.com/ips-v6/";

const sourcePath = fileURLToPath(new URL("../cloudflare.ts", import.meta.url));

async function fetchRanges(url: string): Promise<Array<string>> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const text = await response.text();
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Guard against a 200 response that is not the plain CIDR list (a maintenance
  // or captcha page, a redirect, an empty body during an incident). Cloudflare
  // publishes only CIDR ranges, so reuse the package's own parser: `parseProxy`
  // returns a `Cidr` object for a range and throws on a malformed one, but
  // passes a non-range string (e.g. `<!DOCTYPE html>`) straight through — so we
  // reject anything that does not parse to a `Cidr`.
  for (const line of lines) {
    let parsed: ReturnType<typeof parseProxy>;
    try {
      parsed = parseProxy(line);
    } catch {
      parsed = line;
    }
    if (typeof parsed === "string") {
      throw new Error(`Expected a CIDR range from ${url} but got: ${line}`);
    }
  }

  if (lines.length === 0) {
    throw new Error(`Fetched no IP ranges from ${url}`);
  }

  return lines;
}

// Compare ignoring order. Returns added/removed entries.
function diff(current: ReadonlyArray<string>, next: ReadonlyArray<string>) {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  const added = next.filter((entry) => !currentSet.has(entry));
  const removed = current.filter((entry) => !nextSet.has(entry));
  return { added, removed };
}

function formatArray(entries: ReadonlyArray<string>): string {
  return `[\n${entries.map((entry) => `  "${entry}",`).join("\n")}\n]`;
}

function replaceArray(
  source: string,
  name: string,
  entries: ReadonlyArray<string>,
): string {
  // Match `export const <name>: ReadonlyArray<string> = [ ... ];`. The list
  // never contains `]`, so a non-greedy character class is sufficient.
  const pattern = new RegExp(
    `(export const ${name}: ReadonlyArray<string> = )\\[[^\\]]*\\]`,
  );
  if (!pattern.test(source)) {
    throw new Error(`Could not find array \`${name}\` in cloudflare.ts`);
  }
  return source.replace(pattern, `$1${formatArray(entries)}`);
}

function today(): string {
  // YYYY-MM-DD in UTC.
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const write = process.argv.includes("--write");

  const [liveIpv4, liveIpv6] = await Promise.all([
    fetchRanges(IPV4_URL),
    fetchRanges(IPV6_URL),
  ]);

  const ipv4Diff = diff(cloudflareIpv4Ranges, liveIpv4);
  const ipv6Diff = diff(cloudflareIpv6Ranges, liveIpv6);

  const drifted =
    ipv4Diff.added.length > 0 ||
    ipv4Diff.removed.length > 0 ||
    ipv6Diff.added.length > 0 ||
    ipv6Diff.removed.length > 0;

  if (!drifted) {
    console.log("Cloudflare IP ranges are up to date.");
    return;
  }

  function report(label: string, d: ReturnType<typeof diff>) {
    if (d.added.length > 0) {
      console.log(`  ${label} added:   ${d.added.join(", ")}`);
    }
    if (d.removed.length > 0) {
      console.log(`  ${label} removed: ${d.removed.join(", ")}`);
    }
  }

  if (write) {
    let source = readFileSync(sourcePath, "utf8");
    source = replaceArray(source, "cloudflareIpv4Ranges", liveIpv4);
    source = replaceArray(source, "cloudflareIpv6Ranges", liveIpv6);
    source = source.replace(
      /(\/\/ last verified: )\d{4}-\d{2}-\d{2}/,
      `$1${today()}`,
    );
    writeFileSync(sourcePath, source);
    console.log("Updated cloudflare.ts with current Cloudflare IP ranges:");
    report("IPv4", ipv4Diff);
    report("IPv6", ipv6Diff);
    return;
  }

  console.error(
    "Cloudflare IP ranges have drifted from the bundled copy. Run " +
      "`npm run generate -w @arcjet/ip` to update them.",
  );
  report("IPv4", ipv4Diff);
  report("IPv6", ipv6Diff);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
