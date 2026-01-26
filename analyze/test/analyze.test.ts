// Note: more tests available in the `analyze-wasm` package.
// See `analyze-wasm/test/index.test.ts`.
// The tests here are more expansive.
import assert from "node:assert/strict";
import test from "node:test";
import {
  detectBot,
  detectSensitiveInfo,
  generateFingerprint,
  isValidEmail,
  matchFilters,
} from "../index.js";

const exampleContext = { characteristics: [], log: console };
const exampleEmailOptions = {
  allowDomainLiteral: false,
  allow: [],
  requireTopLevelDomain: true,
};

test("@arcjet/analyze", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "detectBot",
      "detectSensitiveInfo",
      "generateFingerprint",
      "isValidEmail",
      "matchFilters",
    ]);
  });
});

test("detectBot", async function (t) {
  await t.test("should fail w/o user agent", async function () {
    await assert.rejects(
      detectBot(
        exampleContext,
        { ip: "127.0.0.1" },
        {
          tag: "allowed-bot-config",
          val: { entities: [], skipCustomDetect: false },
        },
      ),
      /user-agent header is empty/,
    );
  });

  await t.test("should allow a non-bot", async function () {
    const result = await detectBot(
      exampleContext,
      { ip: "127.0.0.1", headers: { "user-agent": "Mozilla/5.0" } },
      {
        tag: "allowed-bot-config",
        val: { entities: [], skipCustomDetect: false },
      },
    );

    assert.deepEqual(result, {
      allowed: [],
      denied: [],
      spoofed: false,
      verified: false,
    });
  });

  await t.test("should detect a bot (curl)", async function () {
    const result = await detectBot(
      exampleContext,
      { ip: "127.0.0.1", headers: { "user-agent": "curl/8.1.2" } },
      {
        tag: "allowed-bot-config",
        val: { entities: [], skipCustomDetect: false },
      },
    );

    assert.deepEqual(result, {
      allowed: [],
      denied: ["CURL"],
      spoofed: false,
      verified: false,
    });
  });

  await t.test("should detect a bot (googlebot)", async function () {
    const result = await detectBot(
      exampleContext,
      { ip: "127.0.0.1", headers: { "user-agent": "Googlebot/2.0" } },
      {
        tag: "allowed-bot-config",
        val: { entities: [], skipCustomDetect: false },
      },
    );

    assert.deepEqual(result, {
      allowed: [],
      denied: ["GOOGLE_CRAWLER"],
      spoofed: false,
      verified: false,
    });
  });
});

test("detectSensitiveInfo", async function (t) {
  await t.test("should detect sensitive info", async function () {
    const result = await detectSensitiveInfo(
      exampleContext,
      "a b@c.d e",
      { tag: "allow", val: [] },
      1,
    );

    assert.deepEqual(result, {
      allowed: [],
      denied: [{ end: 7, identifiedType: { tag: "email" }, start: 2 }],
    });
  });

  await t.test("should not detect non-sensitive info", async function () {
    const result = await detectSensitiveInfo(
      exampleContext,
      "a b c d e",
      { tag: "allow", val: [] },
      1,
    );

    assert.deepEqual(result, { allowed: [], denied: [] });
  });

  await t.test("should detect w/ a custom detect function", async function () {
    let calls = 0;

    const result = await detectSensitiveInfo(
      exampleContext,
      "a b c d e",
      { tag: "allow", val: [] },
      1,
      function (tokens) {
        calls++;
        assert.ok(Array.isArray(tokens));
        assert.equal(tokens.length, 1);

        if (tokens[0] === "c") {
          return [{ tag: "custom", val: "c" }];
        }

        return [];
      },
    );

    assert.deepEqual(calls, 5);
    assert.deepEqual(result, {
      allowed: [],
      denied: [
        { end: 5, identifiedType: { tag: "custom", val: "c" }, start: 4 },
      ],
    });
  });

  await t.test("should detect a card number", async function () {
    assert.deepEqual(
      await detectSensitiveInfo(
        exampleContext,
        "a 4242424242424242 b",
        { tag: "allow", val: [] },
        1,
      ),
      {
        allowed: [],
        denied: [
          { end: 18, identifiedType: { tag: "credit-card-number" }, start: 2 },
        ],
      },
    );
  });

  await t.test("should detect a card number if in `allow`", async function () {
    assert.deepEqual(
      await detectSensitiveInfo(
        exampleContext,
        "a 4242424242424242 b",
        { tag: "allow", val: [{ tag: "credit-card-number" }] },
        1,
      ),
      {
        allowed: [
          {
            end: 18,
            identifiedType: { tag: "credit-card-number" },
            start: 2,
          },
        ],
        denied: [],
      },
    );
  });

  await t.test("should detect a card number w/ dashes", async function () {
    assert.deepEqual(
      await detectSensitiveInfo(
        exampleContext,
        "a 4242-4242-4242-4242 b",
        { tag: "allow", val: [{ tag: "credit-card-number" }] },
        1,
      ),
      {
        allowed: [
          {
            end: 21,
            identifiedType: { tag: "credit-card-number" },
            start: 2,
          },
        ],
        denied: [],
      },
    );
  });

  await t.test("should detect a card number w/ spaces", async function () {
    assert.deepEqual(
      await detectSensitiveInfo(
        exampleContext,
        "a 4242 4242 4242 4242 b",
        { tag: "allow", val: [{ tag: "credit-card-number" }] },
        1,
      ),
      {
        allowed: [
          {
            end: 21,
            identifiedType: { tag: "credit-card-number" },
            start: 2,
          },
        ],
        denied: [],
      },
    );
  });

  await t.test("should detect an email", async function () {
    assert.deepEqual(
      await detectSensitiveInfo(
        exampleContext,
        "a alice@arcjet.com b",
        { tag: "allow", val: [] },
        1,
      ),
      {
        allowed: [],
        denied: [{ end: 18, identifiedType: { tag: "email" }, start: 2 }],
      },
    );
  });

  await t.test("should detect an ip address", async function () {
    assert.deepEqual(
      await detectSensitiveInfo(
        exampleContext,
        "a 127.0.0.1 b",
        { tag: "allow", val: [] },
        1,
      ),
      {
        allowed: [],
        denied: [{ end: 11, identifiedType: { tag: "ip-address" }, start: 2 }],
      },
    );
  });

  await t.test("should detect a phone number", async function () {
    assert.deepEqual(
      await detectSensitiveInfo(
        exampleContext,
        "a 555-555-5555 b",
        { tag: "allow", val: [] },
        1,
      ),
      {
        allowed: [],
        denied: [
          { end: 14, identifiedType: { tag: "phone-number" }, start: 2 },
        ],
      },
    );
  });
});

test("generateFingerprint", async function (t) {
  await t.test("should generate a fingerprint", async function () {
    const result = await generateFingerprint(exampleContext, {
      ip: "127.0.0.1",
    });

    assert.equal(
      result,
      "fp::2::0d219da6100b99f95cf639b77e088c6df3c096aa5fd61dec5287c5cf94d5e545",
    );
  });

  await t.test(
    "should generate a fingerprin w/ `characteristics`",
    async function () {
      const result = await generateFingerprint(
        { ...exampleContext, characteristics: ["a"] },
        { extra: { a: "b" }, ip: "127.0.0.1" },
      );

      assert.equal(
        result,
        "fp::2::83e4b462812b844fc17cd81eee04088c832ffbe00b714338a773ad458e472686",
      );
    },
  );

  await t.test("should generate another fingerprint", async function () {
    const result = await generateFingerprint(exampleContext, {
      ip: "76.76.21.21",
    });

    assert.equal(
      result,
      "fp::2::30cc6b092efff7b35f658730073f40ceae0a724873e1ff175826fc57e1462149",
    );
  });

  await t.test("should fail", async function () {
    await assert.rejects(
      generateFingerprint(
        exampleContext,
        // Note: this is a broken cookie.
        { cookies: "a", ip: "127.0.0.1" },
      ),
      /Failed to generate fingerprint/,
    );
  });
});

test("isValidEmail", async function (t) {
  await t.test("should allow a regular email", async function () {
    const result = await isValidEmail(exampleContext, "a@b.c", {
      tag: "allow-email-validation-config",
      val: exampleEmailOptions,
    });

    assert.deepEqual(result, { blocked: [], validity: "valid" });
  });

  await t.test("should not allow something weird", async function () {
    const result = await isValidEmail(exampleContext, "example", {
      tag: "allow-email-validation-config",
      val: exampleEmailOptions,
    });

    assert.deepEqual(result, { blocked: ["INVALID"], validity: "invalid" });
  });

  await t.test(
    "should not allow a basic free email provider by default (gmail)",
    async function () {
      const result = await isValidEmail(exampleContext, "example@gmail.com", {
        tag: "allow-email-validation-config",
        val: exampleEmailOptions,
      });

      assert.deepEqual(result, { blocked: ["FREE"], validity: "invalid" });
    },
  );

  await t.test("should not allow a missing TLD by default", async function () {
    const result = await isValidEmail(exampleContext, "a@b", {
      tag: "allow-email-validation-config",
      val: exampleEmailOptions,
    });

    assert.deepEqual(result, { blocked: ["INVALID"], validity: "invalid" });
  });

  await t.test(
    "should allow a missing TLD w/ `requireTopLevelDomain: false`",
    async function () {
      const result = await isValidEmail(exampleContext, "a@b", {
        tag: "allow-email-validation-config",
        val: { ...exampleEmailOptions, requireTopLevelDomain: false },
      });

      assert.deepEqual(result, { blocked: [], validity: "valid" });
    },
  );

  await t.test(
    "should not allow a domain literal by default",
    async function () {
      const result = await isValidEmail(exampleContext, "a@[127.0.0.1]", {
        tag: "allow-email-validation-config",
        val: exampleEmailOptions,
      });

      assert.deepEqual(result, { blocked: ["INVALID"], validity: "invalid" });
    },
  );

  await t.test(
    "should allow a domain literal w/ `allowDomainLiteral: true`",
    async function () {
      const result = await isValidEmail(exampleContext, "a@[127.0.0.1]", {
        tag: "allow-email-validation-config",
        val: { ...exampleEmailOptions, allowDomainLiteral: true },
      });

      assert.deepEqual(result, { blocked: [], validity: "valid" });
    },
  );

  // TODO: test `allow` option.
});

test("matchFilters", async function (t) {
  await t.test("should allow w/ `allowIfMatch` and a match", async function () {
    assert.deepEqual(
      await matchFilters(
        exampleContext,
        { ip: "127.0.0.1" },
        ["ip.src == 127.0.0.1"],
        true,
      ),
      {
        allowed: true,
        matchedExpressions: ["ip.src == 127.0.0.1"],
        undeterminedExpressions: [],
      },
    );
  });

  await t.test("should deny w/ `allowIfMatch` and no match", async function () {
    assert.deepEqual(
      await matchFilters(
        exampleContext,
        { ip: "127.0.0.1" },
        ["ip.src == 127.0.0.2"],
        true,
      ),
      { allowed: false, matchedExpressions: [], undeterminedExpressions: [] },
    );
  });

  await t.test("should deny w/o `allowIfMatch` and a match", async function () {
    assert.deepEqual(
      await matchFilters(
        exampleContext,
        { ip: "127.0.0.1" },
        ["ip.src == 127.0.0.1"],
        false,
      ),
      {
        allowed: false,
        matchedExpressions: ["ip.src == 127.0.0.1"],
        undeterminedExpressions: [],
      },
    );
  });

  await t.test(
    "should allow w/o `allowIfMatch` and no match",
    async function () {
      assert.deepEqual(
        await matchFilters(
          exampleContext,
          { ip: "127.0.0.1" },
          ["ip.src == 127.0.0.2"],
          false,
        ),
        { allowed: true, matchedExpressions: [], undeterminedExpressions: [] },
      );
    },
  );

  const tenExpressions = Array.from({ length: 10 }, function (_, index) {
    return "ip.src == 127.0.0." + index;
  });

  await t.test("should work w/ `10` expressions", async function () {
    assert.deepEqual(
      await matchFilters(
        exampleContext,
        { ip: "127.0.0.127" },
        tenExpressions,
        false,
      ),
      { allowed: true, matchedExpressions: [], undeterminedExpressions: [] },
    );
  });

  await t.test("should fail w/ `11` expressions", async function () {
    await assert.rejects(
      matchFilters(
        exampleContext,
        { ip: "127.0.0.127" },
        [...tenExpressions, "ip.src == 127.0.0.10"],
        false,
      ),
      /Failed to match filters: only `10` expressions may be passed/,
    );
  });

  await t.test("should work w/ `1024` bytes", async function () {
    const tenThousandTwentyFourBytes =
      'http.host eq "' + "a".repeat(1009) + '"';
    assert.equal(new Blob([tenThousandTwentyFourBytes]).size, 1024);

    assert.deepEqual(
      await matchFilters(
        exampleContext,
        { ip: "127.0.0.1" },
        [tenThousandTwentyFourBytes],
        false,
      ),
      { allowed: true, matchedExpressions: [], undeterminedExpressions: [] },
    );
  });

  await t.test("should fail w/ `1025` bytes", async function () {
    const tenThousandTwentyFiveBytes =
      'http.host eq "' + "a".repeat(1010) + '"';
    assert.equal(new Blob([tenThousandTwentyFiveBytes]).size, 1025);

    await assert.rejects(
      matchFilters(
        exampleContext,
        { ip: "127.0.0.127" },
        [tenThousandTwentyFiveBytes],
        false,
      ),
      /Failed to match filters: only `1024` bytes may be passed in expression/,
    );
  });
});
