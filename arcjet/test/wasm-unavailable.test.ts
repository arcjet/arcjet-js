import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const arcjetRoot = fileURLToPath(new URL("..", import.meta.url));

type RuleErrorReport = { conclusion: string; message: string };

/**
 * Exercise Wasm-unavailable ERROR mapping in a child process that mocks
 * `@arcjet/analyze-wasm` so `initializeWasm` returns `undefined`.
 */
function runUnavailable(): {
  fingerprintDecision: { isErrored: boolean; isAllowed: boolean; message: string };
  email: RuleErrorReport;
  bot: RuleErrorReport;
  filter: RuleErrorReport;
  sensitiveInfo: RuleErrorReport;
  customSensitiveInfo: RuleErrorReport;
  tokenBucket: RuleErrorReport;
  fixedWindow: RuleErrorReport;
  slidingWindow: RuleErrorReport;
  shield: RuleErrorReport;
} {
  const script = `
import { mock } from "node:test";

mock.module("@arcjet/analyze-wasm", {
  namedExports: {
    initializeWasm: async () => undefined,
  },
});

const { MemoryCache } = await import("@arcjet/cache");
const {
  default: arcjet,
  validateEmail,
  detectBot,
  filter,
  sensitiveInfo,
  tokenBucket,
  fixedWindow,
  slidingWindow,
  shield,
  ArcjetAllowDecision,
  ArcjetReason,
} = await import("arcjet");

const log = { debug() {}, info() {}, warn() {}, error() {} };

const context = {
  cache: new MemoryCache(),
  characteristics: [],
  fingerprint: "fp-test",
  getBody: async () => "4242424242424242",
  key: "ajkey_test",
  log,
  runtime: "node",
};

const details = {
  cookies: "",
  extra: {},
  headers: new Headers({ "user-agent": "curl/8.0" }),
  host: "example.com",
  ip: "1.2.3.4",
  method: "GET",
  path: "/",
  protocol: "http:",
  query: "",
};

function reasonMessage(reason) {
  return reason && typeof reason.message === "string" ? reason.message : String(reason);
}

function report(result) {
  return { conclusion: result.conclusion, message: reasonMessage(result.reason) };
}

const [emailRule] = validateEmail({ allow: [], mode: "LIVE" });
const emailResult = await emailRule.protect(context, { ...details, email: "a@b.c" });

const [botRule] = detectBot({ allow: [], mode: "LIVE" });
const botResult = await botRule.protect(context, details);

const [filterRule] = filter({ deny: ["ip.src == 1.2.3.4"], mode: "LIVE" });
const filterResult = await filterRule.protect(context, details);

const [sensitiveRule] = sensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"], mode: "LIVE" });
const sensitiveResult = await sensitiveRule.protect(context, details);

const [customSensitiveRule] = sensitiveInfo({
  deny: ["CREDIT_CARD_NUMBER"],
  mode: "LIVE",
  backend: {
    async detect() {
      return undefined;
    },
  },
});
const customSensitiveResult = await customSensitiveRule.protect(context, details);

const [tokenBucketRule] = tokenBucket({
  mode: "LIVE",
  refillRate: 1,
  interval: 60,
  capacity: 1,
});
const tokenBucketResult = await tokenBucketRule.protect(context, {
  ...details,
  extra: { ...details.extra, requested: "1" },
});

const [fixedWindowRule] = fixedWindow({ mode: "LIVE", window: "1m", max: 1 });
const fixedWindowResult = await fixedWindowRule.protect(context, details);

const [slidingWindowRule] = slidingWindow({ mode: "LIVE", interval: 60, max: 1 });
const slidingWindowResult = await slidingWindowRule.protect(context, details);

const [shieldRule] = shield({ mode: "LIVE" });
const shieldResult = await shieldRule.protect(context, details);

const instance = arcjet({
  key: "ajkey_test",
  log,
  rules: [],
  client: {
    async decide() {
      return new ArcjetAllowDecision({ ttl: 0, reason: new ArcjetReason(), results: [] });
    },
    report() {},
  },
});
const fingerprintDecision = await instance.protect({}, { ip: "1.2.3.4" });

process.stdout.write(
  JSON.stringify({
    fingerprintDecision: {
      isErrored: fingerprintDecision.isErrored(),
      isAllowed: fingerprintDecision.isAllowed(),
      message: reasonMessage(fingerprintDecision.reason),
    },
    email: report(emailResult),
    bot: report(botResult),
    filter: report(filterResult),
    sensitiveInfo: report(sensitiveResult),
    customSensitiveInfo: report(customSensitiveResult),
    tokenBucket: report(tokenBucketResult),
    fixedWindow: report(fixedWindowResult),
    slidingWindow: report(slidingWindowResult),
    shield: report(shieldResult),
  }),
);
`;

  const result = spawnSync(
    process.execPath,
    ["--experimental-test-module-mocks", "--input-type=module", "-e", script],
    {
      cwd: arcjetRoot,
      encoding: "utf8",
      env: process.env,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("Wasm unavailable maps to ERROR decisions without throwing", async function () {
  const report = runUnavailable();

  assert.equal(report.fingerprintDecision.isErrored, true);
  assert.equal(report.fingerprintDecision.isAllowed, true);
  assert.match(
    report.fingerprintDecision.message,
    /Failed to build fingerprint because Wasm is not supported/,
  );

  assert.equal(report.email.conclusion, "ERROR");
  assert.match(report.email.message, /EMAIL rule failed to run because Wasm is not supported/);

  assert.equal(report.bot.conclusion, "ERROR");
  assert.match(report.bot.message, /BOT rule failed to run because Wasm is not supported/);

  assert.equal(report.filter.conclusion, "ERROR");
  assert.match(report.filter.message, /FILTER rule failed to run because Wasm is not supported/);

  assert.equal(report.sensitiveInfo.conclusion, "ERROR");
  assert.match(
    report.sensitiveInfo.message,
    /SENSITIVE_INFO rule failed to run because Wasm is not supported/,
  );

  assert.equal(report.customSensitiveInfo.conclusion, "ERROR");
  assert.match(
    report.customSensitiveInfo.message,
    /SENSITIVE_INFO rule failed to run because the sensitive info backend could not run/,
  );

  for (const name of ["tokenBucket", "fixedWindow", "slidingWindow", "shield"] as const) {
    assert.equal(report[name].conclusion, "ERROR", name);
    assert.match(
      report[name].message,
      /Failed to build fingerprint because Wasm is not supported/,
      name,
    );
  }
});
