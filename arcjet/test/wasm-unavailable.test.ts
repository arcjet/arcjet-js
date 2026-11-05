import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const arcjetRoot = fileURLToPath(new URL("..", import.meta.url));

type RuleReport = { ruleId: string; state: string; conclusion: string; message: string };
type DecisionReport = {
  id: string;
  conclusion: string;
  isAllowed: boolean;
  message: string;
  results: Array<{ state: string; conclusion: string }>;
  decideCalls: number;
};

/**
 * Exercise the SDK in a child process that mocks `@arcjet/analyze-wasm` so
 * `initializeWasm` returns `undefined`.
 */
function runUnavailable(): {
  rules: Record<string, RuleReport>;
  decisions: Record<string, DecisionReport>;
  warnings: number;
  emptyFingerprintCacheDecideCalls: number;
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
  ArcjetDenyDecision,
  ArcjetReason,
  ArcjetRuleResult,
} = await import("arcjet");

let warnings = 0;
const log = { debug() {}, info() {}, warn() { warnings += 1; }, error() {} };
const body = "4242424242424242";

const context = {
  cache: new MemoryCache(),
  characteristics: [],
  fingerprint: "",
  getBody: async () => body,
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

function ruleReport(result) {
  return {
    ruleId: result.ruleId,
    state: result.state,
    conclusion: result.conclusion,
    message: typeof result.reason.message === "string" ? result.reason.message : "",
  };
}

async function protectRule([rule], request = details) {
  return ruleReport(await rule.protect(context, request));
}

const rules = {
  email: await protectRule(validateEmail({ allow: [], mode: "LIVE" }), { ...details, email: "a@b.c" }),
  bot: await protectRule(detectBot({ allow: [], mode: "LIVE" })),
  filter: await protectRule(filter({ deny: ["ip.src == 1.2.3.4"], mode: "LIVE" })),
  filterLocal: await protectRule(filter({ deny: ['local.plan == "free"'], mode: "LIVE" }), {
    ...details,
    extra: { filterLocal: JSON.stringify({ plan: "free" }) },
  }),
  sensitiveInfo: await protectRule(sensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"], mode: "LIVE" })),
  customSensitiveInfo: await protectRule(
    sensitiveInfo({
      deny: ["CREDIT_CARD_NUMBER"],
      mode: "LIVE",
      backend: {
        async detect() {
          throw new Error("custom backend is down");
        },
      },
    }),
  ),
  tokenBucket: await protectRule(
    tokenBucket({ mode: "LIVE", refillRate: 1, interval: 60, capacity: 1 }),
    { ...details, extra: { requested: "1" } },
  ),
  fixedWindow: await protectRule(fixedWindow({ mode: "LIVE", window: "1m", max: 1 })),
  slidingWindow: await protectRule(slidingWindow({ mode: "LIVE", interval: 60, max: 1 })),
  shield: await protectRule(shield({ mode: "LIVE" })),
};

function notRun() {
  return new ArcjetRuleResult({
    ruleId: "",
    fingerprint: "",
    ttl: 0,
    state: "NOT_RUN",
    conclusion: "ALLOW",
    reason: new ArcjetReason(),
  });
}

async function decide(name, instanceRules, makeDecision) {
  let decideCalls = 0;
  const instance = arcjet({
    key: "ajkey_test",
    log,
    rules: instanceRules,
    client: {
      async decide() {
        decideCalls += 1;
        return makeDecision();
      },
      report() {},
    },
  });
  const decision = await instance.protect({ getBody: async () => body }, { ip: "1.2.3.4" });
  return {
    id: decision.id,
    conclusion: decision.conclusion,
    isAllowed: decision.isAllowed(),
    message: typeof decision.reason.message === "string" ? decision.reason.message : "",
    results: decision.results.map((r) => ({ state: r.state, conclusion: r.conclusion })),
    decideCalls,
  };
}

const allow = () =>
  new ArcjetAllowDecision({ id: "lreq_allow", ttl: 0, reason: new ArcjetReason(), results: [notRun()] });

const decisions = {
  noRules: await decide("noRules", [], () =>
    new ArcjetAllowDecision({ ttl: 0, reason: new ArcjetReason(), results: [] }),
  ),
  sensitiveInfoLive: await decide(
    "sensitiveInfoLive",
    [sensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"], mode: "LIVE" })],
    allow,
  ),
  sensitiveInfoDryRun: await decide(
    "sensitiveInfoDryRun",
    [sensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"], mode: "DRY_RUN" })],
    allow,
  ),
  sensitiveInfoDecideDeny: await decide(
    "sensitiveInfoDecideDeny",
    [sensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"], mode: "LIVE" })],
    () => new ArcjetDenyDecision({ ttl: 0, reason: new ArcjetReason(), results: [notRun()] }),
  ),
  sensitiveInfoNoDecideResults: await decide(
    "sensitiveInfoNoDecideResults",
    [sensitiveInfo({ deny: ["CREDIT_CARD_NUMBER"], mode: "LIVE" })],
    () => new ArcjetAllowDecision({ ttl: 0, reason: new ArcjetReason(), results: [] }),
  ),
  emailLive: await decide("emailLive", [validateEmail({ allow: [], mode: "LIVE" })], allow),
};

// A Decide DENY cached under an empty fingerprint must not answer the next
// request: every client would share that key.
const [botRule] = detectBot({ allow: [], mode: "LIVE" });
const { ruleId: botRuleId } = await botRule.protect(context, details);
let emptyFingerprintCacheDecideCalls = 0;
const cached = arcjet({
  key: "ajkey_test",
  log,
  rules: [[botRule]],
  client: {
    async decide() {
      emptyFingerprintCacheDecideCalls += 1;
      return new ArcjetDenyDecision({
        ttl: 60,
        reason: new ArcjetReason(),
        results: [
          new ArcjetRuleResult({
            ruleId: botRuleId,
            fingerprint: "",
            ttl: 60,
            state: "RUN",
            conclusion: "DENY",
            reason: new ArcjetReason(),
          }),
        ],
      });
    },
    report() {},
  },
});
await cached.protect({}, { ip: "1.2.3.4", headers: { "user-agent": "curl/8.0" } });
await cached.protect({}, { ip: "5.6.7.8", headers: { "user-agent": "curl/8.0" } });

process.stdout.write(
  JSON.stringify({ rules, decisions, warnings, emptyFingerprintCacheDecideCalls }),
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

const report = runUnavailable();

test("Wasm unavailable: rules Decide also evaluates defer to it", function () {
  for (const name of [
    "email",
    "bot",
    "filter",
    "tokenBucket",
    "fixedWindow",
    "slidingWindow",
    "shield",
  ]) {
    assert.equal(report.rules[name].state, "NOT_RUN", name);
    assert.equal(report.rules[name].conclusion, "ALLOW", name);
    assert.notEqual(report.rules[name].ruleId, "", name);
  }
});

test("Wasm unavailable: local-only rules return ERROR with their rule ID", function () {
  const { filterLocal, sensitiveInfo, customSensitiveInfo } = report.rules;

  assert.equal(filterLocal.conclusion, "ERROR");
  assert.equal(filterLocal.state, "RUN");
  assert.notEqual(filterLocal.ruleId, "");
  assert.match(filterLocal.message, /^FILTER rule failed to run because Wasm is not supported/);

  assert.equal(sensitiveInfo.conclusion, "ERROR");
  assert.equal(sensitiveInfo.state, "RUN");
  assert.notEqual(sensitiveInfo.ruleId, "");
  assert.match(
    sensitiveInfo.message,
    /^SENSITIVE_INFO rule failed to run because Wasm is not supported/,
  );

  assert.equal(customSensitiveInfo.conclusion, "ERROR");
  assert.equal(customSensitiveInfo.message, "custom backend is down");
});

test("Wasm unavailable: `protect()` still calls Decide", function () {
  const { noRules } = report.decisions;

  assert.equal(noRules.decideCalls, 1);
  assert.equal(noRules.conclusion, "ALLOW");
});

test("Wasm unavailable: a LIVE local-only ERROR turns Decide's ALLOW into ERROR", function () {
  const decision = report.decisions.sensitiveInfoLive;

  assert.equal(decision.conclusion, "ERROR");
  assert.equal(decision.isAllowed, true);
  assert.equal(decision.id, "lreq_allow");
  assert.match(decision.message, /^SENSITIVE_INFO rule failed/);
  // Decide's `NOT_RUN` result for the rule is replaced, not duplicated.
  assert.deepEqual(decision.results, [{ state: "RUN", conclusion: "ERROR" }]);
});

test("Wasm unavailable: a DRY_RUN local-only ERROR is reported but keeps ALLOW", function () {
  const decision = report.decisions.sensitiveInfoDryRun;

  assert.equal(decision.conclusion, "ALLOW");
  assert.deepEqual(decision.results, [{ state: "DRY_RUN", conclusion: "ERROR" }]);
});

test("Wasm unavailable: a Decide DENY stands over a local ERROR", function () {
  const decision = report.decisions.sensitiveInfoDecideDeny;

  assert.equal(decision.conclusion, "DENY");
  assert.deepEqual(decision.results, [{ state: "RUN", conclusion: "ERROR" }]);
});

test("Wasm unavailable: a local ERROR is appended when Decide has no result to replace", function () {
  const decision = report.decisions.sensitiveInfoNoDecideResults;

  assert.equal(decision.conclusion, "ERROR");
  assert.deepEqual(decision.results, [{ state: "RUN", conclusion: "ERROR" }]);
});

test("Wasm unavailable: rules Decide evaluates leave its decision unchanged", function () {
  const decision = report.decisions.emailLive;

  assert.equal(decision.conclusion, "ALLOW");
  assert.deepEqual(decision.results, [{ state: "NOT_RUN", conclusion: "ALLOW" }]);
});

test("Wasm unavailable: the missing-Wasm warning is logged once per process", function () {
  assert.equal(report.warnings, 1);
});

test("Wasm unavailable: an empty fingerprint is never used as a cache key", function () {
  assert.equal(report.emptyFingerprintCacheDecideCalls, 2);
});
