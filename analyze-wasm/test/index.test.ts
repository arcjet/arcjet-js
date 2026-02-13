// Note: more tests available in the `analyze` package.
// See `analyze/test/analyze.test.ts`.
// The tests here are more minimal: basic functionality.
import assert from "node:assert/strict";
import test from "node:test";
import { initializeWasm } from "../index.js";

const wasm = await initializeWasm({
  "arcjet:js-req/bot-identifier": {
    detect() {
      return [];
    },
  },
  "arcjet:js-req/email-validator-overrides": {
    hasGravatar() {
      return "unknown";
    },
    hasMxRecords() {
      return "unknown";
    },
    isDisposableEmail() {
      return "unknown";
    },
    isFreeEmail() {
      return "unknown";
    },
  },
  "arcjet:js-req/filter-overrides": {
    ipLookup() {
      return undefined;
    },
  },
  "arcjet:js-req/sensitive-information-identifier": {
    detect() {
      return [];
    },
  },
  "arcjet:js-req/verify-bot": {
    verify() {
      return "unverifiable";
    },
  },
});
assert.ok(wasm);

test("@arcjet/analyze-wasm", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "initializeWasm",
    ]);
  });

  await t.test("should expose the public api on `wasm`", async function () {
    assert.deepEqual(Object.keys(wasm).sort(), [
      "detectBot",
      "detectSensitiveInfo",
      "generateFingerprint",
      "isValidEmail",
      "matchFilters",
      "validateCharacteristics",
    ]);
  });
});

test("`wasm.detectBot`", async function (t) {
  await t.test(
    "should not detect a chrome user agent as a bot",
    async function () {
      assert.deepEqual(
        wasm.detectBot(
          JSON.stringify({
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            },
          }),
          {
            tag: "allowed-bot-config",
            val: { entities: [], skipCustomDetect: false },
          },
        ),
        { allowed: [], denied: [], spoofed: false, verified: false },
      );
    },
  );

  await t.test("should detect a curl user agent as a bot", async function () {
    assert.deepEqual(
      wasm.detectBot(
        JSON.stringify({ headers: { "user-agent": "curl/7.64.1" } }),
        {
          tag: "allowed-bot-config",
          val: { entities: [], skipCustomDetect: false },
        },
      ),
      { allowed: [], denied: ["CURL"], spoofed: false, verified: false },
    );
  });

  await t.test(
    "should support allowing bots by identifier in `entities`",
    async function () {
      assert.deepEqual(
        wasm.detectBot(
          JSON.stringify({ headers: { "user-agent": "curl/7.64.1" } }),
          {
            tag: "allowed-bot-config",
            val: { entities: ["CURL"], skipCustomDetect: false },
          },
        ),
        { allowed: ["CURL"], denied: [], spoofed: false, verified: false },
      );
    },
  );
});

test("`wasm.detectSensitiveInfo`", async function (t) {
  await t.test("should detect sensitive info", async function () {
    assert.deepEqual(
      wasm.detectSensitiveInfo("a 4242424242424242 b", {
        entities: { tag: "allow", val: [] },
        skipCustomDetect: false,
      }),
      {
        allowed: [],
        denied: [
          { end: 18, identifiedType: { tag: "credit-card-number" }, start: 2 },
        ],
      },
    );
  });

  await t.test("should not detect non-sensitive info", async function () {
    assert.deepEqual(
      wasm.detectSensitiveInfo("a b c", {
        entities: { tag: "allow", val: [] },
        skipCustomDetect: false,
      }),
      { allowed: [], denied: [] },
    );
  });
});

test("`wasm.generateFingerprint`", async function (t) {
  await t.test(
    "should generate a fingerprint w/ a characteristic",
    async function () {
      assert.deepEqual(
        wasm.generateFingerprint(JSON.stringify({ ip: "1.1.1.1" }), ["ip.src"]),
        "fp::2::10182843b9721ec9901b0b127e10705ae447f41391c1bdb153c9fec8d82bb875",
      );
    },
  );

  await t.test(
    "should throw if a fingerprint cannot be made",
    async function () {
      assert.throws(function () {
        wasm.generateFingerprint(JSON.stringify({}), ["ip.src"]);
      }, /unable to generate fingerprint: error generating identifier - requested `ip` characteristic but the `ip` value was empty/);
    },
  );
});

test("`wasm.isValidEmail`", async function (t) {
  await t.test("should validate an email address (valid)", async function () {
    assert.deepEqual(
      wasm.isValidEmail("alice@arcjet.com", {
        tag: "allow-email-validation-config",
        val: {
          allowDomainLiteral: false,
          allow: [],
          requireTopLevelDomain: true,
        },
      }),
      { blocked: [], validity: "valid" },
    );
  });

  await t.test(
    "should validate an email address (not valid)",
    async function () {
      assert.deepEqual(
        wasm.isValidEmail("broken", {
          tag: "allow-email-validation-config",
          val: {
            allowDomainLiteral: false,
            allow: [],
            requireTopLevelDomain: true,
          },
        }),
        { blocked: ["INVALID"], validity: "invalid" },
      );
    },
  );

  await t.test("should support `allowDomainLiteral: true`", async function () {
    assert.deepEqual(
      wasm.isValidEmail("alice@[1.1.1.1]", {
        tag: "allow-email-validation-config",
        val: {
          allowDomainLiteral: true,
          allow: [],
          requireTopLevelDomain: true,
        },
      }),
      { blocked: [], validity: "valid" },
    );
  });

  await t.test("should support `allowDomainLiteral: false`", async function () {
    assert.deepEqual(
      wasm.isValidEmail("alice@[1.1.1.1]", {
        tag: "allow-email-validation-config",
        val: {
          allowDomainLiteral: false,
          allow: [],
          requireTopLevelDomain: true,
        },
      }),
      { blocked: ["INVALID"], validity: "invalid" },
    );
  });

  await t.test(
    "should support `requireTopLevelDomain: true`",
    async function () {
      assert.deepEqual(
        wasm.isValidEmail("alice@localhost", {
          tag: "allow-email-validation-config",
          val: {
            allowDomainLiteral: false,
            allow: [],
            requireTopLevelDomain: true,
          },
        }),
        { blocked: ["INVALID"], validity: "invalid" },
      );
    },
  );

  await t.test(
    "should support `requireTopLevelDomain: false`",
    async function () {
      assert.deepEqual(
        wasm.isValidEmail("alice@localhost", {
          tag: "allow-email-validation-config",
          val: {
            allowDomainLiteral: false,
            allow: [],
            requireTopLevelDomain: false,
          },
        }),
        { blocked: [], validity: "valid" },
      );
    },
  );
});

test("`wasm.matchFilters`", async function (t) {
  await t.test("should match filters", async function () {
    assert.deepEqual(
      wasm.matchFilters(
        JSON.stringify({ ip: "1.1.1.1" }),
        "{}",
        ["ip.src == 1.1.1.1"],
        false,
      ),
      {
        allowed: false,
        matchedExpressions: ["ip.src == 1.1.1.1"],
        undeterminedExpressions: [],
      },
    );
  });

  await t.test("should support undetermined expressions", async function () {
    assert.deepEqual(
      wasm.matchFilters(
        JSON.stringify({ ip: "1.1.1.1" }),
        "{}",
        ["ip.src.vpn"],
        false,
      ),
      {
        allowed: true,
        matchedExpressions: [],
        undeterminedExpressions: ["ip.src.vpn"],
      },
    );
  });

  await t.test(
    "should throw on syntax errors in expressions",
    async function () {
      assert.throws(function () {
        wasm.matchFilters(
          JSON.stringify({ ip: "1.1.1.1" }),
          "{}",
          ["👍"],
          false,
        );
      }, /Filter parsing error/);
    },
  );
});

test("`wasm.validateCharacteristics`", async function (t) {
  await t.test("should work on valid characteristics", async function () {
    wasm.validateCharacteristics(JSON.stringify({ ip: "1.1.1.1" }), ["ip.src"]);
  });

  await t.test("should throw on invalid characteristics", async function () {
    assert.throws(function () {
      wasm.validateCharacteristics(JSON.stringify({ ip: "1.1.1.1" }), ["hi"]);
    }, /requested a user-defined `hi` characteristic but the `hi` value was empty/);
  });
});
