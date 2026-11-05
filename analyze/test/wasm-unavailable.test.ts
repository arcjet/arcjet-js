import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const analyzeRoot = fileURLToPath(new URL("..", import.meta.url));

/**
 * Run analyzer calls in a child process that mocks `@arcjet/analyze-wasm`
 * so `initializeWasm` returns `undefined`.
 */
function runUnavailable(): {
  email: unknown;
  bot: unknown;
  fingerprint: unknown;
  sensitive: unknown;
  filter: unknown;
} {
  const script = `
import { mock } from "node:test";

mock.module("@arcjet/analyze-wasm", {
  namedExports: {
    initializeWasm: async () => undefined,
  },
});

const analyze = await import("@arcjet/analyze");
const ctx = {
  characteristics: ["ip.src"],
  log: { debug() {}, info() {}, warn() {}, error() {} },
};

const email = await analyze.isValidEmail(ctx, "anything@example.com", {
  tag: "allow-email-validation-config",
  val: { allow: [], requireTopLevelDomain: true, allowDomainLiteral: false },
});
const bot = await analyze.detectBot(
  ctx,
  { headers: { "user-agent": "curl/8.0" }, ip: "1.2.3.4" },
  { tag: "allowed-bot-config", val: { entities: [], skipCustomDetect: true } },
);
const fingerprint = await analyze.generateFingerprint(ctx, { ip: "1.2.3.4" });
const sensitive = await analyze.detectSensitiveInfo(
  ctx,
  "4242424242424242",
  { tag: "allow", val: [] },
  1,
);
const filter = await analyze.matchFilters(
  ctx,
  { ip: "127.0.0.1" },
  "{}",
  ["ip.src == 127.0.0.1"],
  false,
);

function mark(value) {
  return typeof value === "undefined" ? "__undefined__" : value;
}

process.stdout.write(
  JSON.stringify({
    email: mark(email),
    bot: mark(bot),
    fingerprint: mark(fingerprint),
    sensitive: mark(sensitive),
    filter: mark(filter),
  }),
);
`;

  const result = spawnSync(
    process.execPath,
    ["--experimental-test-module-mocks", "--input-type=module", "-e", script],
    {
      cwd: analyzeRoot,
      encoding: "utf8",
      env: process.env,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("Wasm unavailable returns undefined (no soft allow, no throw)", async function () {
  const report = runUnavailable();

  assert.equal(report.email, "__undefined__");
  assert.equal(report.bot, "__undefined__");
  assert.equal(report.fingerprint, "__undefined__");
  assert.equal(report.sensitive, "__undefined__");
  assert.equal(report.filter, "__undefined__");
});
