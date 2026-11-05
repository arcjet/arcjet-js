import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const analyzeRoot = fileURLToPath(new URL("..", import.meta.url));

type Rejection = { name: string; code: string; message: string; isInstance: boolean };

/**
 * Run analyzer calls in a child process that mocks `@arcjet/analyze-wasm`
 * so `initializeWasm` returns `undefined`.
 */
function runUnavailable(): Record<
  "email" | "bot" | "fingerprint" | "sensitive" | "filter",
  Rejection
> {
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

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      isInstance: error instanceof analyze.WasmUnavailableError,
    };
  }
  throw new Error("expected a rejection");
}

const report = {
  email: await rejection(
    analyze.isValidEmail(ctx, "anything@example.com", {
      tag: "allow-email-validation-config",
      val: { allow: [], requireTopLevelDomain: true, allowDomainLiteral: false },
    }),
  ),
  bot: await rejection(
    analyze.detectBot(
      ctx,
      { headers: { "user-agent": "curl/8.0" }, ip: "1.2.3.4" },
      { tag: "allowed-bot-config", val: { entities: [], skipCustomDetect: true } },
    ),
  ),
  fingerprint: await rejection(analyze.generateFingerprint(ctx, { ip: "1.2.3.4" })),
  sensitive: await rejection(
    analyze.detectSensitiveInfo(ctx, "4242424242424242", { tag: "allow", val: [] }, 1),
  ),
  filter: await rejection(
    analyze.matchFilters(ctx, { ip: "127.0.0.1" }, "{}", ["ip.src == 127.0.0.1"], false),
  ),
};

process.stdout.write(JSON.stringify(report));
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

test("Wasm unavailable rejects with `WasmUnavailableError`", async function () {
  const report = runUnavailable();

  for (const [name, rejection] of Object.entries(report)) {
    assert.equal(rejection.name, "WasmUnavailableError", name);
    assert.equal(rejection.code, "WASM_UNAVAILABLE", name);
    assert.equal(rejection.isInstance, true, name);
    assert.match(rejection.message, /because Wasm is not supported in this environment/, name);
  }

  assert.match(report.email.message, /^EMAIL rule failed/);
  assert.match(report.bot.message, /^BOT rule failed/);
  assert.match(report.fingerprint.message, /^Failed to build fingerprint/);
  assert.match(report.sensitive.message, /^SENSITIVE_INFO rule failed/);
  assert.match(report.filter.message, /^FILTER rule failed/);
});
