import assert from "node:assert/strict";
import { describe, test, afterEach, mock } from "node:test";
import { redact } from "../index.js";

test("@arcjet/redact", async function (t) {
  await t.test("should expose the public api", async function () {
    assert.deepEqual(Object.keys(await import("../index.js")).sort(), [
      "redact",
    ]);
  });
});

describe("ArcjetRedact", () => {
  describe("redact()", () => {
    afterEach(() => {
      mock.restoreAll();
    });

    test("it will redact all if no entities list is given", async () => {
      const text =
        "email test@example.com phone 011234567 credit 4242424242424242 ip 10.12.234.2";
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
      const text =
        "email test@example.com phone 011234567 credit 4242424242424242 ip 10.12.234.2";
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
      const expected =
        "email redacted-email phone 011234567 ip <Redacted IP address #1>";
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
      const expected =
        "email redacted-email phone 011234567 ip <Redacted IP address #1>";
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
      const expected =
        "email test@example.com custom-replace 011234567 ip 10.12.234.2";
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

      const newText =
        "hello <Redacted email #0> your phone number is <Redacted phone number #1>";
      const expectedUnredacted =
        "hello test@example.com your phone number is 011234567";
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
      const expectedUnredacted =
        "hello test@example.com your phone number is 011234567 011234567";
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
      const expectedUnredacted =
        "hello test@example.com your phone number is 011234567";
      const unredacted = unredact(newText);
      assert.equal(unredacted, expectedUnredacted);
    });
  });
});
