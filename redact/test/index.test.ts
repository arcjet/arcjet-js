import assert from "node:assert/strict";
import { describe, test, afterEach, mock } from "node:test";

import { redact } from "../dist/index.js";

test("@arcjet/redact", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../dist/index.js")).sort(), ["redact"]);
  });
});

describe("ArcjetRedact", () => {
  describe("redact()", () => {
    afterEach(() => {
      mock.restoreAll();
    });

    test("it will redact all if no entities list is given", async () => {
      const text = "email test@example.com phone 011234567 credit 4242424242424242 ip 10.12.234.2";
      const expected =
        "email <Redacted email #0> phone <Redacted phone number #1> credit <Redacted credit card number #2> ip <Redacted IP address #3>";
      const [redacted] = await redact(text);
      assert.equal(redacted, expected);
    });

    test("it will throw if an empty entities list is given", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      await assert.rejects(
        async () => await redact(text, { entities: [] }),
        /no entities configured for redaction/,
      );
    });

    test("it will throw if entities is not an array", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      await assert.rejects(
        redact(text, {
          // @ts-expect-error
          entities: "foobar",
        }),
        /entities must be an array/,
      );
    });

    test("it will throw if non-string entities in the array", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      await assert.rejects(
        redact(text, {
          // @ts-expect-error
          entities: [1234],
        }),
        /redaction entities must be strings/,
      );
    });

    test("it will throw WebAssembly is not available", async () => {
      // @ts-expect-error: not typed in `@types/node` yet.
      const Assembly: any = WebAssembly;

      // Fake a WebAssembly failure
      mock.method(Assembly, "instantiate", () => {
        return Promise.reject("mock failure in wasm");
      });

      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      await assert.rejects(
        redact(text),
        /redact failed to run because Wasm is not supported in this environment/,
      );
    });

    test("it will redact the configured entities only", async () => {
      const text = "email test@example.com phone 011234567 credit 4242424242424242 ip 10.12.234.2";
      const expected =
        "email <Redacted email #0> phone <Redacted phone number #1> credit <Redacted credit card number #2> ip 10.12.234.2";
      const [redacted] = await redact(text, {
        entities: ["email", "phone-number", "credit-card-number"],
      });
      assert.equal(redacted, expected);
    });

    test("it will use a custom replacement where configured", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email redacted-email phone <Redacted phone number #1> ip <Redacted IP address #2>";
      const [redacted] = await redact(text, {
        replace: (entityType, plaintext) => {
          if (entityType === "email") {
            assert.equal(plaintext, "test@example.com");
            return "redacted-email";
          } else if (entityType === "ip-address") {
            assert.equal(plaintext, "10.12.234.2");
          }
        },
      });
      assert.equal(redacted, expected);
    });

    test("it will use a custom replacement where configured w/ `entities`", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected = "email redacted-email phone 011234567 ip <Redacted IP address #1>";
      const [redacted] = await redact(text, {
        entities: ["email", "ip-address"],
        replace: (entityType, plaintext) => {
          if (entityType === "email") {
            assert.equal(plaintext, "test@example.com");
            return "redacted-email";
          } else if (entityType === "ip-address") {
            assert.equal(plaintext, "10.12.234.2");
          }
        },
      });
      assert.equal(redacted, expected);
    });

    // This is because we introduced `plaintext` in a non-breaking way.
    // This test is to ensure that we don't make a change which breaks it in the future.
    test("it allows replacement functions with no second param", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected = "email redacted-email phone 011234567 ip <Redacted IP address #1>";
      const [redacted] = await redact(text, {
        entities: ["email", "ip-address"],
        replace: (entityType) => {
          if (entityType === "email") {
            return "redacted-email";
          }
        },
      });
      assert.equal(redacted, expected);
    });

    test("it can detect entities using a custom detect function", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email <Redacted email #0> <Redacted my-custom-entity #1> <Redacted phone number #2> ip <Redacted IP address #3>";
      const [redacted] = await redact(text, {
        contextWindowSize: 1,
        detect: (tokens: string[]) => {
          if (tokens[0] === "phone") {
            return ["my-custom-entity"];
          } else {
            return [];
          }
        },
      });
      assert.equal(redacted, expected);
    });

    test("it can detect entities using a custom detect function w/ `entities`", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected =
        "email test@example.com <Redacted my-custom-entity #0> 011234567 ip 10.12.234.2";
      const [redacted] = await redact(text, {
        entities: ["my-custom-entity"],
        contextWindowSize: 1,
        detect: (tokens: string[]) => {
          if (tokens[0] === "phone") {
            return ["my-custom-entity"];
          } else {
            return [];
          }
        },
      });
      assert.equal(redacted, expected);
    });

    test("it can detect entities using a custom detect function and redact custom entities using a custom redactor", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expected = "email test@example.com custom-replace 011234567 ip 10.12.234.2";
      const [redacted] = await redact(text, {
        entities: ["my-custom-entity"],
        contextWindowSize: 1,
        detect: (tokens: string[]) => {
          if (tokens[0] === "phone") {
            return ["my-custom-entity"];
          } else {
            return [];
          }
        },
        replace: (entityType) => {
          if (entityType === "my-custom-entity") {
            return "custom-replace";
          }
        },
      });
      assert.equal(redacted, expected);
    });

    test("it will pass the number of tokens requested by the context window size parameter to the custom detect function", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      await redact(text, {
        contextWindowSize: 3,
        detect: (tokens) => {
          assert.equal(tokens.length, 3);
          // oxlint-disable-next-line unicorn/no-new-array
          return new Array(tokens.length).fill(undefined);
        },
      });
    });
  });
  describe("unredact()", () => {
    test("it will redact and unredact configured entities", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expectedRedacted =
        "email <Redacted email #0> phone <Redacted phone number #1> ip 10.12.234.2";
      const [redacted, unredact] = await redact(text, {
        entities: ["email", "phone-number"],
      });
      assert.equal(redacted, expectedRedacted);

      const newText = "hello <Redacted email #0> your phone number is <Redacted phone number #1>";
      const expectedUnredacted = "hello test@example.com your phone number is 011234567";
      const unredacted = unredact(newText);
      assert.equal(unredacted, expectedUnredacted);
    });

    test("it will redact and unredact configured entities multiple times", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expectedRedacted =
        "email <Redacted email #0> phone <Redacted phone number #1> ip 10.12.234.2";
      const [redacted, unredact] = await redact(text, {
        entities: ["email", "phone-number"],
      });
      assert.equal(redacted, expectedRedacted);

      const newText =
        "hello <Redacted email #0> your phone number is <Redacted phone number #1> <Redacted phone number #1>";
      const expectedUnredacted = "hello test@example.com your phone number is 011234567 011234567";
      const unredacted = unredact(newText);
      assert.equal(unredacted, expectedUnredacted);
    });

    test("it will redact and unredact custom `detect` functions", async () => {
      const text = "email test@example.com phone 011234567 ip 10.12.234.2";
      const expectedRedacted =
        "email my-custom-email-replacement phone <Redacted phone number #1> ip 10.12.234.2";
      const [redacted, unredact] = await redact(text, {
        entities: ["email", "phone-number"],
        replace: (entityType, plaintext) => {
          if (entityType === "email") {
            assert.equal(plaintext, "test@example.com");
            return "my-custom-email-replacement";
          }
          // @ts-expect-error: this type error is expected because `ip-address` is not listed in `entities` above.
          else if (entityType === "ip-address") {
            assert.fail();
          } else if (entityType === "phone-number") {
            assert.equal(plaintext, "011234567");
            // No return type to test for the default.
            return undefined;
          }
        },
      });
      assert.equal(redacted, expectedRedacted);

      const newText =
        "hello my-custom-email-replacement your phone number is <Redacted phone number #1>";
      const expectedUnredacted = "hello test@example.com your phone number is 011234567";
      const unredacted = unredact(newText);
      assert.equal(unredacted, expectedUnredacted);
    });

    // Reserved test data only: 4111111111111111 is the standard Visa test PAN
    // and example.com is the RFC 2606 reserved domain.
    describe("offsets", () => {
      const pan = "4111111111111111";
      const email = "victim@example.com";

      test("it redacts entities preceded by non-ascii text", async () => {
        // Wasm reports UTF-8 byte offsets, `substring` indexes UTF-16 code
        // units. Every multi-byte character before an entity used to shift the
        // cut by the excess bytes, leaving part of the entity — with a long
        // enough prefix, all of it — in the "redacted" output.
        for (const prefix of [
          "",
          "aaaaaaaaaaaa ",
          "\u00e9 ",
          "\u00e9\u00e9\u00e9\u00e9 ",
          "Здравствуйте, ",
          "您好，我的卡号是 ",
          "🙂🙂🙂🙂 ",
          "🙂".repeat(8) + " ",
          "🙂".repeat(20) + " ",
        ]) {
          const text = `${prefix}Card ${pan} and mail ${email}`;
          const [redacted, unredact] = await redact(text, {
            entities: ["credit-card-number", "email"],
          });
          assert.equal(
            redacted,
            `${prefix}Card <Redacted credit card number #0> and mail <Redacted email #1>`,
            `redacting with prefix ${JSON.stringify(prefix)}`,
          );
          assert.ok(!redacted.includes(pan), "card number survived redaction");
          assert.ok(!redacted.includes(email), "email survived redaction");
          assert.ok(redacted.isWellFormed(), "redacted text is not well-formed UTF-16");
          assert.equal(unredact(redacted), text, "round trip is lossy");
        }
      });

      test("it is unaffected by non-ascii text after an entity", async () => {
        const text = `Card ${pan} and mail ${email} — спасибо`;
        const [redacted] = await redact(text, {
          entities: ["credit-card-number", "email"],
        });
        assert.equal(
          redacted,
          "Card <Redacted credit card number #0> and mail <Redacted email #1> — спасибо",
        );
      });

      test("it redacts entities preceded by percent-encoded text", async () => {
        // Detection runs on the percent-decoded text; reporting those offsets
        // against the original shifted every span left.
        for (const prefix of ["Hello%20world ", "a%2Bb%2Bc%2Bd%2Be ", "%E4%BD%A0 ", "%41%42 "]) {
          const text = `${prefix}Card ${pan} end`;
          const [redacted] = await redact(text, { entities: ["credit-card-number"] });
          assert.equal(redacted, `${prefix}Card <Redacted credit card number #0> end`);
        }
      });

      test("it redacts entities preceded by trimmed characters", async () => {
        // A leading `.` is trimmed off the token but was not added to its start
        // offset, so each one walked the span a byte to the left; sixteen of
        // them left the card number entirely outside its own redaction.
        for (const count of [1, 2, 4, 15, 16, 17, 32]) {
          const dots = ".".repeat(count);
          const text = `Card ${dots}${pan} end`;
          const [redacted] = await redact(text, { entities: ["credit-card-number"] });
          assert.equal(redacted, `Card ${dots}<Redacted credit card number #0> end`);
          assert.ok(!redacted.includes(pan), `card number survived ${count} leading dots`);
        }
      });

      test("it redacts a plus-addressed email exactly once", async () => {
        // The tokenizer reports both `victim@example.com` and the whole
        // `a+victim@example.com`, overlapping. Splicing both mangled the text
        // around them and broke the round trip.
        const text = `mail a+${email} end`;
        const [redacted, unredact] = await redact(text, { entities: ["email"] });
        assert.equal(redacted, "mail <Redacted email #0> end");
        assert.equal(unredact(redacted), text);
      });

      test("it redacts crossing overlaps in full", async () => {
        // Two detected spans can cross rather than nest: U+FDFA expands to
        // several words under NFKC, so a custom detector matching a token
        // either side of it yields spans that partly overlap. Resolving that
        // by dropping the later span left the part of it past the first span
        // in the output. The round trip still restores the original, so this
        // has to assert on the redacted text.
        const text = "AAA\u{FDFA}SECRET";
        const [redacted, unredact] = await redact(text, {
          entities: ["secret"],
          detect: (tokens: string[]) =>
            tokens.map((token) =>
              token.includes("AAA") || token.includes("SECRET") ? ("secret" as const) : undefined,
            ),
        });

        assert.ok(!redacted.includes("SECRET"), `detected value survived: ${redacted}`);
        assert.ok(!redacted.includes("AAA"), `detected value survived: ${redacted}`);
        assert.equal(unredact(redacted), text);
      });

      test("it handles long runs of separators", async () => {
        // Separator-only tokens were skipped by recursing once each, so a few
        // thousand spaces overflowed the stack instead of returning a result.
        const text = `${"  ".repeat(20000)}${pan}`;
        const [redacted] = await redact(text, { entities: ["credit-card-number"] });
        assert.equal(redacted, `${"  ".repeat(20000)}<Redacted credit card number #0>`);
      });
    });
  });
});
